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
const Policy = require("../web/policy");
const Runs = require("../lib/runs");

// highest believable score per game - anything above is rejected
// Striker: cap expanded for carrier +300, ten ships +100 and one-time graze +5; rate bound stays 500/s.
// Swarm: 150-point guardians, 10-drone +50 and no-hit +25 fit the retained 200,000 cap.
// Sky Hop: +50 per five sparks; existing cap remains above reachable two-hour runs.
const CAPS = {
  skyhop: 100000, swarm: 200000, striker: 600000, breaker: 3000000, trail: 20000,
  drift: 1000000, prism: 5000000, match: 5000000, wrecker: 2000000, echo3d: 400,
  glass: 3000000, demo: 2000000, rampage: 200000, rumble: 100000,
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
    if (process.env.VERCEL_ENV === 'preview') {
      const prefix = 'preview:' + (process.env.VERCEL_GIT_COMMIT_REF || 'forkade') + ':';
      cmds = cmds.map(c => { c = c.slice(); const k = c[0] === 'EVAL' ? 3 : 1; c[k] = prefix + c[k]; return c; });
    }
    const r = await fetch(url.replace(/\/$/, "") + "/pipeline", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds), signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error("store " + r.status);
    return (await r.json()).map(x => { if (x.error) throw Error(x.error); return x.result; });
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
  let raw = ""; for await (const c of req) { raw += c; if (raw.length > 270000) break; }
  try { return JSON.parse(raw || "{}"); } catch (_) { return {}; }
}

// ---------------------------------------------------------------- reports --
// Reports point at "rank N on this board, showing this nickname"; the server finds the player,
// so ids are never published. 3 different reporters -> nickname auto-hidden until the owner reviews.
const HIDE_AFTER = 3;
async function report(R, b, req, res, week) {
  const game = b.game, period = ["all", "daily"].includes(b.period) ? b.period : "week", rank = Math.floor(Number(b.rank)), by = b.pid;
  if (!CAPS[game] || !(rank >= 1 && rank <= TOP) || !validPid(by)) return send(res, 400, { error: "Can't report that." });
  const key = period === "daily" ? `lb:${game}:d:${Runs.Daily.date()}` : period === "all" ? `lb:${game}:all` : `lb:${game}:w:${week}`;
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
async function auditModeration(R,b){
  await R([['HSET','lb:moderation-history',crypto.randomUUID(),JSON.stringify({action:b.do,target:b.target,source:b.source,reason:b.reason,at:Date.now()})],['EXPIRE','lb:moderation-history','7776000'],['SET','lb:notice:'+b.target,JSON.stringify({action:b.do,reason:b.reason,at:Date.now()}),'EX','5184000']]);
  const [flat]=await R([['HGETALL','lb:moderation-history']]);const rows=[];for(let i=0;i<flat.length;i+=2)rows.push([flat[i],JSON.parse(flat[i+1])]);rows.sort((a,b)=>b[1].at-a[1].at);
  const expired=rows.filter((r,i)=>i>=100||r[1].at<Date.now()-7776000000);if(expired.length)await R(expired.map(r=>['HDEL','lb:moderation-history',r[0]]));
}
async function moderate(R, b, res, week) {
  if (!ownerOk(b.key)) return send(res, 401, { error: "Wrong key." });
  if (b.do === "list") {
    const [flat,historyFlat] = await R([["HGETALL", "lb:reported"],["HGETALL","lb:moderation-history"]]);
    const history=[];for(let i=1;i<(historyFlat||[]).length;i+=2)history.push(JSON.parse(historyFlat[i]));history.sort((a,b)=>b.at-a.at);
    const items = [];
    for (let i = 0; i < (flat || []).length; i += 2) items.push({ pid: flat[i], game: flat[i + 1].split("|")[0] });
    if (!items.length) return send(res, 200, { history, reports: [], pending: await Runs.pending(R) });
    const out = await R(items.flatMap(it => [["SCARD", `lb:rep:${it.pid}`], ["HMGET", "lb:names", it.pid], ["SISMEMBER", "lb:hidden", it.pid]]));
    items.forEach((it, i) => { it.reports = out[i * 3]; it.name = (out[i * 3 + 1] || [])[0] || "(removed)"; it.hidden = out[i * 3 + 2] === 1; });
    return send(res, 200, { history, reports: items.sort((x, y) => y.reports - x.reports), pending: await Runs.pending(R) });
  }
  if(typeof b.reason!=='string'||b.reason.trim().length<3||b.reason.length>240||!['User asked','Admin decision'].includes(b.source))return send(res,400,{error:'A reason and decision source are required.'});
  if (b.do === 'approve-score'  || b.do === 'reject-score') {
    if (!validPid(b.target) || !CAPS[b.game]) return send(res,400,{error:'Invalid review.'});
    const key = `lb:pending:${b.target}:${b.game}`;
    const [raw] = await R([['GET', key]]);
    if (!raw) return send(res,404,{error:'Review expired.'});
    const item = JSON.parse(raw);
    if (b.do === 'approve-score'){await publish(R,item.game,item.score,item.name,item.pid,item.week,item.daily);if(item.replay)await saveReplay(R,item.pid,item.daily,item.score,item.replay,item.name);}
    await R([['DEL',key],['ZREM','lb:pending',key]]);
    await auditModeration(R,b);return send(res,200,{ok:true});
  }
  const pid = b.target; if (!validPid(pid)) return send(res, 400, { error: "Bad player id." });
  if (b.do === "hide") await R([["SADD", "lb:hidden", pid], ["HSET", "lb:names", pid, "Player"], ["HDEL", "lb:reported", pid], ["DEL", `lb:rep:${pid}`]]);
  else if (b.do === "dismiss") await R([["SREM", "lb:hidden", pid], ["HDEL", "lb:reported", pid], ["DEL", `lb:rep:${pid}`]]);
  else if (b.do === "remove") {
    const weeks = [0, 7, 14, 21].map(n => isoWeek(new Date(Date.now() - n * 864e5)));
    const cmds = [["HDEL", "lb:names", pid], ["HDEL", "lb:reported", pid], ["DEL", `lb:rep:${pid}`], ["SREM", "lb:hidden", pid]];
    for (const g of Object.keys(CAPS)) {
      cmds.push(['DEL', `lb:pending:${pid}:${g}`], ['ZREM','lb:pending',`lb:pending:${pid}:${g}`]);
      for(let n=0;n<4;n++)cmds.push(['DEL',`rumble:replay:${Runs.Daily.date(Date.now()-n*86400000)}:${pid}`]);
      for (let n=0;n<4;n++) cmds.push(['ZREM',`lb:${g}:d:${Runs.Daily.date(Date.now()-n*86400000)}`,pid]);
      cmds.push(["ZREM", `lb:${g}:all`, pid]); for (const w of weeks) cmds.push(["ZREM", `lb:${g}:w:${w}`, pid]); }
    await R(cmds);
  } else return send(res, 400, { error: "Unknown action." });
  await auditModeration(R,b);
  return send(res, 200, { ok: true });
}

async function publish(R,game,score,name,pid,week,daily) {
  const [isHidden] = await R([['SISMEMBER','lb:hidden',pid]]);
  const wk = `lb:${game}:w:${week}`, all = `lb:${game}:all`;
  const cmds = [...(isHidden ? [] : [['HSET','lb:names',pid,name]]),
    ['ZADD',wk,'GT',String(score),pid],['EXPIRE',wk,'1814400'],['ZADD',all,'GT',String(score),pid]];
  const expires = daily ? Date.parse(daily+'T00:00:00+08:00') / 1000 + 259200 : 0;
  const dk = daily && expires > Date.now()/1000 ? `lb:${game}:d:${daily}` : null;
  if (dk) cmds.push(['ZADD',dk,'GT',String(score),pid],['EXPIREAT',dk,String(expires)]);
  await R(cmds);
  const [wr,ar,wb,ab] = await R([['ZREVRANK',wk,pid],['ZREVRANK',all,pid],['ZSCORE',wk,pid],['ZSCORE',all,pid]]);
  const [count,lower]=await R([['ZCARD',wk],['ZCOUNT',wk,'-inf','('+Number(wb)]]);
  const percent=count>=Policy.socialMinimum?Math.floor(Number(lower)*100/count):null;
  const [dr] = dk ? await R([['ZREVRANK',dk,pid]]) : [null];
  return {ok:true,week:{rank:wr+1,best:Number(wb),count,percent},all:{rank:ar+1,best:Number(ab)},daily:dk?{rank:dr+1,date:daily}:null};
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, {});
  const R = redis();
  if (!R) return send(res, 503, { error: "Rankings aren't switched on yet." });
  const q = new URL(req.url, "http://x").searchParams;
  const week = isoWeek();

  try {
    if (req.method === "GET") {
      const game = q.get("game"), period = ["all", "daily"].includes(q.get("period")) ? q.get("period") : "week", pid = q.get("pid");
      if (!CAPS[game]) return send(res, 400, { error: "Unknown game." });
      const date = q.get('date') || Runs.Daily.date();
      if (period === 'daily' && ![0,1,2].map(n => Runs.Daily.date(Date.now()-n*86400000)).includes(date)) return send(res, 400, { error: 'Daily board expired.' });
      const key = period === 'daily' ? `lb:${game}:d:${date}` : period === "all" ? `lb:${game}:all` : `lb:${game}:w:${week}`;
      const cmds = [["ZRANGE", key, "0", String(TOP - 1), "REV", "WITHSCORES"], ["ZCARD", key]];
      if (validPid(pid)) cmds.push(["ZREVRANK", key, pid], ["ZSCORE", key, pid]);
      const [flat, count, myRank, myScore] = await R(cmds);
      const ids = [], top = [];
      for (let i = 0; i < (flat || []).length; i += 2) { ids.push(flat[i]); top.push({ score: Number(flat[i + 1]) }); }
      const [names, hidden] = ids.length ? await R([["HMGET", "lb:names", ...ids], ["SMISMEMBER", "lb:hidden", ...ids]]) : [[], []];
      // a nickname hidden by reports or the owner shows as "Player" (the player still sees their own)
      top.forEach((t, i) => { t.rank = i + 1; t.me = ids[i] === pid;
        t.name = hidden && hidden[i] && !t.me ? "Player" : (names[i] || "ECHO"); });
      const [lower]=myRank!=null && count>=Policy.socialMinimum ? await R([['ZCOUNT',key,'-inf','('+Number(myScore)]]) : [null];
      const percent=lower==null?null:Math.floor(Number(lower)*100/count);
      const [notice]=validPid(pid)?await R([['GET','lb:notice:'+pid]]):[null];
      return send(res, 200, { notice:notice?JSON.parse(notice):null,game, period, week, count: count || 0, top,
        me: myRank == null ? null : { rank: myRank + 1, score: Number(myScore), percent } });
    }

    if (req.method === "POST") {
      const b = await readBody(req);
      if (b.action === "report") return report(R, b, req, res, week);
      if (b.action === "moderate") return moderate(R, b, res, week);
      // round start: anonymous on purpose (no player id), so it runs before the id check
      if (b.action === 'start') {
        if (!CAPS[b.game]) return send(res, 400, { error: "Unknown game." });
        const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "na";
        const ipHash = crypto.createHash("sha256").update(ip + week).digest("hex").slice(0, 24);   // spam check only, gone in 1s
        const started = await Runs.start(R, b, ipHash); return send(res, started.status || 200, started);
      }
      const game = b.game, score = Math.floor(Number(b.score)), name = cleanName(b.name), pid = b.pid;
      if (!CAPS[game]) return send(res, 400, { error: "Unknown game." });
      if (!validPid(pid)) return send(res, 400, { error: "Bad player id." });
      if (game==='rumble' && !require('../web/rumble-rules').first.some((_,a)=>require('../web/rumble-rules').last.some((_,z)=>require('../web/rumble-rules').nickname(a,z)===name)))return send(res,400,{error:'Pick a preset Rumble name.'});
      if (!validName(name)) return send(res, 400, { error: "Pick a nickname: 2-14 letters or numbers, nothing rude." });
      if (!(score > 0 && score <= CAPS[game])) return send(res, 400, { error: "That score doesn't look right." });

      const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "na";
      const ipKey = "rl:ip:" + crypto.createHash("sha256").update(ip + week).digest("hex").slice(0, 24);
      const [slot, ipCount] = await R([["SET", `rl:pid:${pid}`, "1", "NX", "EX", "8"], ["INCR", ipKey], ["EXPIRE", ipKey, "60"]]);
      if (slot !== "OK" || ipCount > 30) return send(res, 429, { error: "Slow down a little and try again in a few seconds." });

      const checked = await Runs.consume(R, { ...b, score });
      if (checked.error) return send(res, 400, { error: checked.error });
      const daily = checked.run.daily;let replay=null;
      if(game==='rumble'){try{const proof=require('../web/rumble-replay').validate(b.replay,checked.run.seed,score);if((Date.now()-checked.run.at)/1000+.5<proof.steps/60*.85)throw Error('Replay is too fast.');replay=proof.packet;}catch(e){return send(res,400,{error:e.message});}}
      const [previous] = await R([['ZSCORE', `lb:${game}:all`, pid]]);
      if (Number(previous) > 0 && score > Number(previous) * 10) {
        const key = `lb:pending:${pid}:${game}`;
        await R([['SET',key,JSON.stringify({pid,game,score,name,week,daily,replay,at:Date.now(),previous:Number(previous)}),'EX','259200'],
          ['ZADD','lb:pending',String(Date.now()),key]]);
        return send(res,202,{ok:true,pending:true,message:'Pending review: this score is more than 10× your previous best.'});
      }
      const result=await publish(R,game,score,name,pid,week,daily);if(replay)await saveReplay(R,pid,daily,score,replay,name);return send(res,200,result);
    }
    if (req.method === "DELETE") {
      // "Remove my scores": wipes this player's nickname and every score on every board
      const b = await readBody(req), pid = b.pid || q.get("pid");
      if (!validPid(pid)) return send(res, 400, { error: "Bad player id." });
      const weeks = [0, 7, 14, 21].map(n => isoWeek(new Date(Date.now() - n * 864e5)));
      const cmds = [["HDEL", "lb:names", pid]];
      for (const g of Object.keys(CAPS)) {
      cmds.push(['DEL', `lb:pending:${pid}:${g}`], ['ZREM','lb:pending',`lb:pending:${pid}:${g}`]);
      for(let n=0;n<4;n++)cmds.push(['DEL',`rumble:replay:${Runs.Daily.date(Date.now()-n*86400000)}:${pid}`]);
      for (let n=0;n<4;n++) cmds.push(['ZREM',`lb:${g}:d:${Runs.Daily.date(Date.now()-n*86400000)}`,pid]);
      cmds.push(["ZREM", `lb:${g}:all`, pid]); for (const w of weeks) cmds.push(["ZREM", `lb:${g}:w:${w}`, pid]); }
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

async function saveReplay(R,pid,date,score,replay,name){if(!date)return;const ttl=Math.min(259200,Math.floor((Date.parse(date+'T00:00:00+08:00')+3*86400000-Date.now())/1000));if(ttl<=0)return;const key=`rumble:replay:${date}:${pid}`;const [old]=await R([['GET',key]]);if(old&&JSON.parse(old).score>score)return;await R([['SET',key,JSON.stringify({score,...replay,name}),'EX',String(ttl)]]);}
module.exports.redis=redis;module.exports.ownerOk=ownerOk;module.exports.auditModeration=auditModeration;
