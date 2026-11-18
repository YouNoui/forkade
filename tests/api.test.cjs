const {test}=require('node:test'),assert=require('node:assert/strict');
const {Redis,request}=require('./redis.cjs'),handler=require('../api/leaderboard'),stats=require('../api/stats'),Daily=require('../web/daily');
test('Singapore daily rollover is deterministic',()=>{
  const a=Daily.challenge(Date.parse('2026-11-18T15:59:59Z')),b=Daily.challenge(Date.parse('2026-11-18T16:00:00Z'));
  assert.equal(a.date,'2026-11-18');assert.equal(b.date,'2026-11-19');assert.notEqual(a.game,b.game);assert.equal(a.next,Date.parse('2026-11-18T16:00:00Z'));
});
test('real handlers: consent, run binding, replay, speed, expiry, daily, moderation and deletion',async()=>{
 const redis=new Redis(),restore=redis.install(),realNow=Date.now;let now=Date.parse('2026-11-18T03:00:00Z');Date.now=()=>now;process.env.STATS_KEY='owner-test';
 const pid='a'.repeat(32),other='b'.repeat(32),call=(body)=>request(handler,'POST',{pid,...body});
 const start=async(game='skyhop',extra={})=>{now+=9000;const r=await call({action:'start',game,...extra});assert.equal(r.status,200);return r.body.token;};
 try{
  assert.equal((await request(stats,'POST',{e:'play',game:'skyhop'},'/api/stats')).status,204);assert.equal(redis.data.size,0);
  await request(stats,'POST',{e:'play',game:'skyhop',consent:true},'/api/stats');assert.ok(redis.data.size>0);
  let token=await start();now+=10000;
  // round tokens carry no player id (privacy); they're single-use and bound to the game
  assert.equal((await call({game:'glass',score:100,name:'Tester',token,pid:other})).status,400);   // wrong game: rejected, token kept
  assert.equal((await call({game:'skyhop',score:100,name:'Tester',token})).status,200);
  now+=9000;assert.equal((await call({game:'skyhop',score:100,name:'Tester',token})).status,400);
  token=await start();assert.equal((await call({game:'skyhop',score:10000,name:'Tester',token})).status,400);
  token=await start();now+=7201000;assert.equal((await call({game:'skyhop',score:100,name:'Tester',token})).status,400);
  token=await start();now+=20000;assert.equal((await call({game:'skyhop',score:1100,name:'Tester',token})).status,202);
  let review=await call({action:'moderate',do:'list',key:'owner-test'});assert.equal(review.body.pending.length,1);
  assert.equal((await call({action:'moderate',do:'approve-score',target:pid,game:'skyhop',key:'bad'})).status,401);
  assert.equal((await call({action:'moderate',do:'approve-score',target:pid,game:'skyhop',key:'owner-test'})).status,200);
  const d=Daily.challenge(now);token=await start(d.game,{daily:d.date});now+=10000;
  const post=await call({game:d.game,score:100,name:'Tester',token});assert.equal(post.status,200);assert.equal(post.body.daily.rank,1);
  const top=await request(handler,'GET',{},`/api/leaderboard?game=${d.game}&period=daily&pid=${pid}`);assert.equal(top.body.top.length,1);
  assert.equal(redis.expiry.get(`lb:${d.game}:d:${d.date}`),Date.parse(d.date+'T00:00:00+08:00')+259200000);
  await request(handler,'DELETE',{pid});assert.equal((await request(handler,'GET',{},`/api/leaderboard?game=${d.game}&period=daily`)).body.top.length,0);
  token=await start();now+=20000;
  const results=await Promise.all([call({game:'skyhop',score:100,name:'Tester',token}),call({game:'skyhop',score:100,name:'Tester',token})]);assert.equal(results.filter(r=>r.status===200).length,1);
 }finally{restore();Date.now=realNow;delete process.env.STATS_KEY;}
});
