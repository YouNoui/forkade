// FORKADE stats - privacy-friendly, first-party counting (same approach as Breekit).
//
//   POST /api/stats  { e: "visit" | "play", game? }   -> counts one event (no cookies, no IP stored)
//   GET  /api/stats?key=STATS_KEY&days=30           -> owner-only daily totals
//
// A visitor is de-duplicated per day with a salted hash of network address + browser,
// stored only inside a HyperLogLog (an approximate counter that cannot be reversed),
// and the salt changes every day. No raw IPs, no cookies, no ids, no ad trackers.
// Needs the same Upstash env vars as the rankings, plus STATS_KEY (any long secret) for the owner view.

const crypto = require("crypto");
const GAMES = ["skyhop", "swarm", "striker", "breaker", "trail", "drift", "prism", "match", "wrecker", "echo3d", "playground"];

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
const day = (d = new Date()) => d.toISOString().slice(0, 10);   // UTC day
const TTL = String(60 * 60 * 24 * 400);                          // keep daily totals ~13 months

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (_) { return {}; } }
  let raw = ""; for await (const c of req) { raw += c; if (raw.length > 500) break; }
  try { return JSON.parse(raw || "{}"); } catch (_) { return {}; }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const R = redis();
  if (!R) return send(res, 503, { error: "Stats aren't switched on yet." });
  try {
    if (req.method === "POST") {
      const b = await readBody(req), d = day();
      const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
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
      await R(cmds);
      return send(res, 204, {});
    }
    if (req.method === "GET") {
      const q = new URL(req.url, "http://x").searchParams;
      const key = process.env.STATS_KEY;
      if (!key) return send(res, 503, { error: "Set STATS_KEY in Vercel to open the stats page." });
      const given = Buffer.from(String(q.get("key") || "")), want = Buffer.from(key);
      if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return send(res, 401, { error: "Wrong key." });
      const n = Math.min(90, Math.max(1, parseInt(q.get("days") || "30", 10) || 30));
      const days = []; for (let i = n - 1; i >= 0; i--) { const t = new Date(); t.setUTCDate(t.getUTCDate() - i); days.push(day(t)); }
      const out = await R(days.flatMap(d => [["GET", `st:${d}:visits`], ["PFCOUNT", `st:${d}:uv`], ["HGETALL", `st:${d}:plays`]]));
      const rows = days.map((d, i) => {
        const flat = out[i * 3 + 2] || [], plays = {};
        for (let k = 0; k < flat.length; k += 2) plays[flat[k]] = Number(flat[k + 1]);
        return { day: d, visits: Number(out[i * 3] || 0), visitors: Number(out[i * 3 + 1] || 0), plays };
      });
      const [players] = await R([["HLEN", "lb:names"]]);
      return send(res, 200, { days: rows, rankedPlayers: players || 0 });
    }
    return send(res, 405, { error: "Method not allowed." });
  } catch (e) {
    return send(res, 502, { error: "Stats are having a moment." });
  }
};
