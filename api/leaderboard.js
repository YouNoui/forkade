// FORKADE global rankings - a Vercel serverless function backed by Upstash Redis.
//
//   GET  /api/leaderboard?game=skyhop&period=week|all[&pid=...]  -> top 50 (+ your rank)
//   POST /api/leaderboard  { game, score, name, pid }             -> saves if it beats your best
//   DELETE /api/leaderboard { pid }                                 -> removes that player completely
//
// Players are anonymous: a random id made on their device plus a nickname they pick.
// Only nickname, game and score are stored. IPs are used for rate limiting only:
// hashed, never stored with the score, and forgotten after 60 seconds.
// Needs env vars from the Vercel Upstash integration: KV_REST_API_URL + KV_REST_API_TOKEN
// (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).

const crypto = require("crypto");

// highest believable score per game - anything above is rejected
const CAPS = {
  skyhop: 100000, swarm: 200000, striker: 200000, breaker: 2000000, trail: 20000,
  drift: 1000000, prism: 5000000, match: 5000000, wrecker: 2000000, echo3d: 1000,
  glass: 3000000, demo: 2000000,
};
const BLOCK = /(fuck|shit|cunt|nigg|fag|bitch|whore|slut|rape|nazi|hitler|porn|dick|pussy|cock)/i;
const TOP = 50;

function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y0) / 864e5 + 1) / 7)).padStart(2, "0")}`;
}

function redis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return async cmds => {
    const r = await fetch(url.replace(/\/$/, "") + "/pipeline", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds),
    });
    if (!r.ok) throw new Error("store " + r.status);
    return (await r.json()).map(x => (x.error ? null : x.result));
  };
}

const cleanName = n => String(n || "").trim().replace(/\s+/g, " ").slice(0, 14);
// catch number swaps too (sh1t, b1tch, n4zi) before checking the block list
const deLeet = n => n.toLowerCase().replace(/[1!|]/g, "i").replace(/3/g, "e").replace(/[0]/g, "o")
  .replace(/[4@]/g, "a").replace(/[5$]/g, "s").replace(/7/g, "t").replace(/[\s_.\-0-9]/g, "");
const validName = n => /^[A-Za-z0-9 _.\-]{2,14}$/.test(n) && !BLOCK.test(deLeet(n)) && !BLOCK.test(n);
const validPid = p => typeof p === "string" && /^[a-f0-9-]{16,40}$/.test(p);

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");          // public data; lets the one-file build use it
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");   // always fresh: deletes and new posts show at once
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (_) { return {}; } }
  let raw = ""; for await (const c of req) { raw += c; if (raw.length > 2000) break; }
  try { return JSON.parse(raw || "{}"); } catch (_) { return {}; }
}

// ---------------------------------------------------------------- reports --
// Reports point at "rank N on this board, showing this nickname"; the server finds the player,
// so ids are never published. 3 different reporters -> nickname auto-hidden until the owner reviews.
const HIDE_AFTER = 3;
async function report(R, b, req, res, week) {
  const game = b.game, period = b.period === "all" ? "all" : "week", rank = Math.floor(Number(b.rank)), by = b.pid;
  if (!CAPS[game] || !(rank >= 1 && rank <= TOP) || !validPid(by)) return send(res, 400, { error: "Can't report that." });
  const key = period === "all" ? `lb:${game}:all` : `lb:${game}:w:${week}`;
  const [[target]] = await R([["ZRANGE", key, String(rank - 1), String(rank - 1), "REV"]]).then(r => [r[0] || []]);
  if (!target || target === by) return send(res, 400, { error: "Can't report that." });
  const [[name]] = await R([["HMGET", "lb:names", target]]);
  if (name && b.name && String(b.name) !== name) return send(res, 409, { error: "The list changed. Refresh and try again." });
  const [slot] = await R([["SET", `rl:rep:${by}`, "1", "NX", "EX", "20"]]);
  if (slot !== "OK") return send(res, 429, { error: "One report every 20 seconds, please." });
  const [added, n] = await R([["SADD", `lb:rep:${target}`, by], ["SCARD", `lb:rep:${target}`],
    ["HSET", "lb:reported", target, `${game}|${name || ""}`], ["EXPIRE", `lb:rep:${target}`, String(60 * 60 * 24 * 60)]]);
  if (n >= HIDE_AFTER) await R([["SADD", "lb:hidden", target]]);
  return send(res, 200, { ok: true, counted: added === 1 });
}
function ownerOk(k) {
  const key = process.env.STATS_KEY; if (!key || typeof k !== "string") return false;
  const a = Buffer.from(k), w = Buffer.from(key);
  return a.length === w.length && crypto.timingSafeEqual(a, w);
}
async function moderate(R, b, res, week) {
  if (!ownerOk(b.key)) return send(res, 401, { error: "Wrong key." });
  if (b.do === "list") {
    const [flat] = await R([["HGETALL", "lb:reported"]]);
    const items = [];
    for (let i = 0; i < (flat || []).length; i += 2) items.push({ pid: flat[i], game: flat[i + 1].split("|")[0] });
    if (!items.length) return send(res, 200, { reports: [] });
    const out = await R(items.flatMap(it => [["SCARD", `lb:rep:${it.pid}`], ["HMGET", "lb:names", it.pid], ["SISMEMBER", "lb:hidden", it.pid]]));
    items.forEach((it, i) => { it.reports = out[i * 3]; it.name = (out[i * 3 + 1] || [])[0] || "(removed)"; it.hidden = out[i * 3 + 2] === 1; });
    return send(res, 200, { reports: items.sort((x, y) => y.reports - x.reports) });
  }
  const pid = b.target; if (!validPid(pid)) return send(res, 400, { error: "Bad player id." });
  if (b.do === "hide") await R([["SADD", "lb:hidden", pid], ["HSET", "lb:names", pid, "Player"], ["HDEL", "lb:reported", pid], ["DEL", `lb:rep:${pid}`]]);
  else if (b.do === "dismiss") await R([["SREM", "lb:hidden", pid], ["HDEL", "lb:reported", pid], ["DEL", `lb:rep:${pid}`]]);
  else if (b.do === "remove") {
    const weeks = [0, 7, 14, 21].map(n => isoWeek(new Date(Date.now() - n * 864e5)));
    const cmds = [["HDEL", "lb:names", pid], ["HDEL", "lb:reported", pid], ["DEL", `lb:rep:${pid}`], ["SREM", "lb:hidden", pid]];
    for (const g of Object.keys(CAPS)) { cmds.push(["ZREM", `lb:${g}:all`, pid]); for (const w of weeks) cmds.push(["ZREM", `lb:${g}:w:${w}`, pid]); }
    await R(cmds);
  } else return send(res, 400, { error: "Unknown action." });
  return send(res, 200, { ok: true });
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const R = redis();
  if (!R) return send(res, 503, { error: "Rankings aren't switched on yet." });
  const q = new URL(req.url, "http://x").searchParams;
  const week = isoWeek();

  try {
    if (req.method === "GET") {
      const game = q.get("game"), period = q.get("period") === "all" ? "all" : "week", pid = q.get("pid");
      if (!CAPS[game]) return send(res, 400, { error: "Unknown game." });
      const key = period === "all" ? `lb:${game}:all` : `lb:${game}:w:${week}`;
      const cmds = [["ZRANGE", key, "0", String(TOP - 1), "REV", "WITHSCORES"], ["ZCARD", key]];
      if (validPid(pid)) cmds.push(["ZREVRANK", key, pid], ["ZSCORE", key, pid]);
      const [flat, count, myRank, myScore] = await R(cmds);
      const ids = [], top = [];
      for (let i = 0; i < (flat || []).length; i += 2) { ids.push(flat[i]); top.push({ score: Number(flat[i + 1]) }); }
      const [names, hidden] = ids.length ? await R([["HMGET", "lb:names", ...ids], ["SMISMEMBER", "lb:hidden", ...ids]]) : [[], []];
      // a nickname hidden by reports or the owner shows as "Player" (the player still sees their own)
      top.forEach((t, i) => { t.rank = i + 1; t.me = ids[i] === pid;
        t.name = hidden && hidden[i] && !t.me ? "Player" : (names[i] || "ECHO"); });
      return send(res, 200, { game, period, week, count: count || 0, top,
        me: myRank == null ? null : { rank: myRank + 1, score: Number(myScore) } });
    }

    if (req.method === "POST") {
      const b = await readBody(req);
      if (b.action === "report") return report(R, b, req, res, week);
      if (b.action === "moderate") return moderate(R, b, res, week);
      const game = b.game, score = Math.floor(Number(b.score)), name = cleanName(b.name), pid = b.pid;
      if (!CAPS[game]) return send(res, 400, { error: "Unknown game." });
      if (!validPid(pid)) return send(res, 400, { error: "Bad player id." });
      if (!validName(name)) return send(res, 400, { error: "Pick a nickname: 2-14 letters or numbers, nothing rude." });
      if (!(score > 0 && score <= CAPS[game])) return send(res, 400, { error: "That score doesn't look right." });

      const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "na";
      const ipKey = "rl:ip:" + crypto.createHash("sha256").update(ip + week).digest("hex").slice(0, 24);
      const [slot, ipCount] = await R([["SET", `rl:pid:${pid}`, "1", "NX", "EX", "8"], ["INCR", ipKey], ["EXPIRE", ipKey, "60"]]);
      if (slot !== "OK" || ipCount > 30) return send(res, 429, { error: "Slow down a little and try again in a few seconds." });

      const [isHidden] = await R([["SISMEMBER", "lb:hidden", pid]]);   // hidden by reports/owner: keep "Player"
      const wk = `lb:${game}:w:${week}`, all = `lb:${game}:all`;
      await R([
        ...(isHidden ? [] : [["HSET", "lb:names", pid, name]]),
        ["ZADD", wk, "GT", String(score), pid], ["EXPIRE", wk, String(60 * 60 * 24 * 21)],
        ["ZADD", all, "GT", String(score), pid],
      ]);
      const [wr, ar, wbest, abest] = await R([["ZREVRANK", wk, pid], ["ZREVRANK", all, pid], ["ZSCORE", wk, pid], ["ZSCORE", all, pid]]);
      return send(res, 200, { ok: true, week: { rank: wr + 1, best: Number(wbest) }, all: { rank: ar + 1, best: Number(abest) } });
    }
    if (req.method === "DELETE") {
      // "Remove my scores": wipes this player's nickname and every score on every board
      const b = await readBody(req), pid = b.pid || q.get("pid");
      if (!validPid(pid)) return send(res, 400, { error: "Bad player id." });
      const weeks = [0, 7, 14, 21].map(n => isoWeek(new Date(Date.now() - n * 864e5)));
      const cmds = [["HDEL", "lb:names", pid]];
      for (const g of Object.keys(CAPS)) { cmds.push(["ZREM", `lb:${g}:all`, pid]); for (const w of weeks) cmds.push(["ZREM", `lb:${g}:w:${w}`, pid]); }
      await R(cmds);
      return send(res, 200, { ok: true, removed: true });
    }
    return send(res, 405, { error: "Method not allowed." });
  } catch (e) {
    return send(res, 502, { error: "Rankings are having a moment. Try again soon." });
  }
};
module.exports.isoWeek = isoWeek;
module.exports.CAPS = CAPS;
