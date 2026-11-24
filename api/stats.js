// FORKADE stats - privacy-friendly, first-party counting (same approach as Breekit).
//
//   POST /api/stats  { e: "visit" | "play", game? }   -> counts one event (no cookies, no IP stored)
//   GET  /api/stats?days=30 + X-Stats-Key header   -> owner-only daily totals
//
// A visitor is de-duplicated per day with a salted hash of network address + browser,
// stored only inside a HyperLogLog (an approximate counter that cannot be reversed),
// and the salt changes every day. No raw IPs, no cookies, no ids, no ad trackers.
// Needs the same Upstash env vars as the rankings, plus STATS_KEY (any long secret) for the owner view.

const crypto = require("crypto");
const GAMES = ["skyhop", "swarm", "striker", "breaker", "trail", "drift", "prism", "match", "wrecker", "glass", "demo", "echo3d", "rampage", "rumble", "playground"];

const Security=require("../lib/security"),redis=require("./leaderboard").redis;
const day = (d = new Date()) => require("../web/daily").date(d.getTime()); // Singapore day
const TTL = String(60 * 60 * 24 * 400);                          // keep daily totals ~13 months

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Stats-Key");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
const readBody=req=>Security.body(req,2048);

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const R = redis();
  if (!R) return send(res, 503, { error: "Stats aren't switched on yet." });
  try {
    if (req.method === "POST") {
      const b = await readBody(req), d = day();
      if (b.consent !== true || req.headers.dnt === "1" || req.headers["sec-gpc"] === "1") return send(res, 204, {});
      const ip = Security.ip(req);
      const ua = String(req.headers["user-agent"] || "").slice(0, 200);
      if (/bot|crawl|spider|preview|headless/i.test(ua)) return send(res, 204, {});
      const salt = (process.env.STATS_SALT || process.env.KV_REST_API_TOKEN || "forkade") + d;
      const visitor = crypto.createHash("sha256").update(salt + ip + ua).digest("hex").slice(0, 20);
      const cmds = [];
      if (b.e === "visit") {
        cmds.push(["INCR", `st:${d}:visits`], ["EXPIRE", `st:${d}:visits`, TTL],
                  ["PFADD", `st:${d}:uv`, visitor], ["EXPIRE", `st:${d}:uv`, TTL]);
      } else if (b.e === "play" && GAMES.includes(b.game)) {
        cmds.push(["HINCRBY", `st:${d}:plays`, b.game, "1"], ["EXPIRE", `st:${d}:plays`, TTL]);
      } else return send(res, 400, { error: "Unknown event." });
      if(['A','B'].includes(b.ab)){
        const prefix=`st:${d}:ab:${b.ab}`;
        if(b.e==='visit'){
          cmds.push(['INCR',prefix+':visits'],['EXPIRE',prefix+':visits',TTL]);
          for(const field of ['first','returnDay1'])if(b[field]===true)cmds.push(['PFADD',prefix+':'+field,visitor],['EXPIRE',prefix+':'+field,TTL]);
        }else cmds.push(['HINCRBY',prefix+':plays',b.game,'1'],['EXPIRE',prefix+':plays',TTL]);
      }
      await R(cmds);
      return send(res, 204, {});
    }
    if (req.method === "GET") {
      const q = new URL(req.url, "http://x").searchParams;
      const auth=await Security.owner(req,R);if(auth!==200)return send(res,auth,{error:auth===429?'Too many wrong keys. Try again in ten minutes.':'Wrong key.'});
      const value=q.get('days')??'30';if(!/^[1-9][0-9]?$/.test(value)||Number(value)>90)return send(res,400,{error:'Choose 1–90 days.'});const n=Number(value);
      const days = []; for (let i = n - 1; i >= 0; i--) { const t = new Date(); t.setUTCDate(t.getUTCDate() - i); days.push(day(t)); }
      const out = await R(days.flatMap(d => [["GET", `st:${d}:visits`], ["PFCOUNT", `st:${d}:uv`], ["HGETALL", `st:${d}:plays`]]));
      const rows = days.map((d, i) => {
        const flat = out[i * 3 + 2] || [], plays = {};
        for (let k = 0; k < flat.length; k += 2) plays[flat[k]] = Number(flat[k + 1]);
        return { day: d, visits: Number(out[i * 3] || 0), visitors: Number(out[i * 3 + 1] || 0), plays };
      });
      const abData=await R(days.flatMap(d=>['A','B'].flatMap(b=>[['GET',`st:${d}:ab:${b}:visits`],['HGETALL',`st:${d}:ab:${b}:plays`],['PFCOUNT',`st:${d}:ab:${b}:first`],['PFCOUNT',`st:${d}:ab:${b}:returnDay1`]])));
      rows.forEach((row,i)=>{row.buckets={};['A','B'].forEach((b,j)=>{const k=i*8+j*4,flat=abData[k+1]||[],plays={};for(let n=0;n<flat.length;n+=2)plays[flat[n]]=Number(flat[n+1]);row.buckets[b]={visits:Number(abData[k]||0),plays,first:Number(abData[k+2]||0),returnDay1:Number(abData[k+3]||0)};});});
      const [players] = await R([["HLEN", "lb:names"]]);
      return send(res, 200, { days: rows, rankedPlayers: players || 0 });
    }
    return send(res, 405, { error: "Method not allowed." });
  } catch (e) {
    return send(res,e.status||502,{error:e.status?e.message:"Stats are having a moment."});
  }
};
