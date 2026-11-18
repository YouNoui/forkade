const crypto = require('crypto');
const Daily = require('../web/daily');
// Generous upper bounds, including combos/level-clear bonuses. This is abuse screening,
// not proof of honest play: a browser client remains editable.
const PPS = { skyhop: 150, glass: 6000, demo: 10000, prism: 8000, match: 12000,
  wrecker: 12000, swarm: 500, striker: 500, breaker: 3000, trail: 500, drift: 4000, echo3d: 100, rampage: 6000 };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
async function start(R, b, ipHash) {
  const daily = Daily.challenge();
  if (b.daily && (b.daily !== daily.date || b.game !== daily.game)) return { status: 400, error: 'This daily challenge has changed. Return to the grid.' };
  // spam guard per network address: generous, so players sharing a connection (schools, mobile carriers) don't block each other
  const [count] = await R([['INCR', 'run-rate:' + ipHash], ['EXPIRE', 'run-rate:' + ipHash, '60']]);
  if (count > 240) return { status: 429, error: 'Too many rounds from this network right now. Try again in a minute.' };
  const token = crypto.randomBytes(32).toString('hex');
  // no player id here: a token only says "a round of <game> started at <time>"
  await R([['SET', 'run:' + hash(token), JSON.stringify({ game: b.game, at: Date.now(), daily: b.daily || null }), 'EX', '7200']]);
  return { token, daily: b.daily ? daily : null };
}
async function consume(R, b) {
  if (!/^[a-f0-9]{64}$/.test(b.token || '')) return { error: 'Start a new ranked run before posting.' };
  // Compare binding and consume in one Redis operation, preventing concurrent replay.
  const script = "local v=redis.call('GET',KEYS[1]); if not v then return false end; local r=cjson.decode(v); if r.game~=ARGV[2] then return false end; redis.call('DEL',KEYS[1]); return v";
  const [raw] = await R([['EVAL', script, '1', 'run:' + hash(b.token), hash(b.pid), b.game]]);
  if (!raw) return { error: 'Run token expired, already used, or belongs to another round.' };
  const run = JSON.parse(raw), elapsed = (Date.now() - run.at) / 1000;
  if (elapsed > 7200 || elapsed < 0 || b.score > Math.max(0.1, elapsed) * PPS[b.game]) return { error: 'That score is too high for the time played. Start a new round.' };
  return { run };
}
async function pending(R) {
  const cutoff = Date.now() - 3 * 86400000;
  await R([['ZREMRANGEBYSCORE', 'lb:pending', '-inf', String(cutoff)]]);
  const [keys] = await R([['ZRANGE', 'lb:pending', '0', '199', 'REV']]);
  if (!keys?.length) return [];
  const values = await R(keys.map(k => ['GET', k]));
  return values.filter(Boolean).map(v => JSON.parse(v));
}
module.exports = { start, consume, pending, PPS, Daily };
