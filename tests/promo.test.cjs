const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Redis,request}=require('./redis.cjs'),handler=require('../api/promo');
test('promo authorization, limits, dedupe, privacy, rate expiry and preview isolation',async()=>{
  const db=new Redis(),restore=db.install();process.env.STATS_KEY='promo-owner-test';process.env.PROMO_SALT='promo-test-salt';
  const call=(body,key,ip='192.0.2.40')=>request(handler,'POST',body,'/api/promo',{'x-stats-key':key,'x-forwarded-for':ip});
  const create=(code,extra={})=>call({action:'create',code,reward:{cores:100,skins:['pink'],parts:['hat:1']},maxUses:1,note:'private note',...extra},process.env.STATS_KEY);
  const device=()=>crypto.randomBytes(16).toString('hex');let n=0;
  const redeem=(code,id=device())=>call({action:'redeem',code,device:id},undefined,'192.0.2.'+(++n));
  try{
    for(const action of ['create','list','generate','enable','delete'])for(const key of [undefined,'wrong'])assert.equal((await call({action,code:'ABCDEF'},key)).status,401);
    for(let i=0;i<100;i++)assert.match(handler.generate(),/^[A-HJ-NP-Z2-9]{8}$/);
    assert.equal((await create('GIFT123')).status,200);assert.equal((await create('GIFT123')).status,409);
    assert.equal((await create('BAD123',{reward:{cores:100001}})).status,400);assert.equal((await create('BAD123',{reward:{parts:['hat:999']}})).status,400);
    assert.equal((await create('BAD123',{maxUses:2})).status,400);assert.equal((await create('BAD123',{expires:1})).status,400);
    const id=device(),won=await redeem('gift123',id);assert.equal(won.status,200);assert.equal(won.body.receipt.reward.cores,100);
    const twice=await redeem('GIFT123',id);assert.equal(twice.status,409);assert.match(twice.body.error,/Already redeemed/);assert.equal(twice.body.receipt.id,won.body.receipt.id);
    assert.match((await redeem('GIFT123')).body.error,/used up/);
    await call({action:'enable',code:'GIFT123',enabled:false},process.env.STATS_KEY);
    assert.equal((await redeem('GIFT123')).body.error,(await redeem('MISSING')).body.error);
    await call({action:'enable',code:'GIFT123',enabled:true},process.env.STATS_KEY);
    await create('EXPIRED',{expires:Date.now()+10000});const exp=JSON.parse(db.run(['HGET','promo:codes','EXPIRED']));exp.expires=Date.now()-1;db.run(['HSET','promo:codes','EXPIRED',JSON.stringify(exp)]);assert.equal((await redeem('EXPIRED')).status,410);
    await create('CONCUR',{maxUses:1});const parallel=await Promise.all(Array.from({length:12},()=>redeem('CONCUR')));assert.equal(parallel.filter(r=>r.status===200).length,1);
    await create('UNLIMIT',{maxUses:0});for(let i=0;i<12;i++)assert.equal((await redeem('UNLIMIT')).status,200);
    for(let i=0;i<10;i++)assert.equal((await call({action:'redeem',code:'MISSING',device:device()},undefined,'198.51.100.3')).status,404);
    assert.equal((await call({action:'redeem',code:'MISSING',device:device()},undefined,'198.51.100.3')).status,429);
    const rateKeys=[...db.data.keys()].filter(k=>k.startsWith('promo:rate:'));assert.ok(rateKeys.length);assert.ok(rateKeys.every(k=>db.expiry.get(k)<=Date.now()+60000));
    const serialized=JSON.stringify([...db.data].map(([k,v])=>[k,v instanceof Set?[...v]:v instanceof Map?[...v]:v]));assert.ok(!serialized.includes(id));assert.ok(!serialized.includes('192.0.2.'));assert.ok(!serialized.includes('198.51.100.3'));assert.ok([...db.get('promo:redeemed:GIFT123')].every(x=>/^[a-f0-9]{64}$/.test(x)));
    const listed=(await call({action:'list'},process.env.STATS_KEY)).body.items;assert.equal(listed.find(x=>x.code==='GIFT123').used,1);assert.ok(!JSON.stringify(won.body).includes('private note'));
    await call({action:'delete',code:'GIFT123'},process.env.STATS_KEY);assert.equal(db.get('promo:redeemed:GIFT123'),undefined);await create('GIFT123');assert.notEqual((await redeem('GIFT123',id)).body.receipt.id,won.body.receipt.id);
    process.env.VERCEL_ENV='preview';process.env.VERCEL_GIT_COMMIT_REF='promo-test';await create('ISOLATE');assert.ok(db.get('preview:promo-test:promo:codes'));await redeem('ISOLATE');assert.ok(db.get('preview:promo-test:promo:redeemed:ISOLATE'));assert.equal(db.get('promo:redeemed:ISOLATE'),undefined);
  }finally{delete process.env.VERCEL_ENV;delete process.env.VERCEL_GIT_COMMIT_REF;restore();}
});
