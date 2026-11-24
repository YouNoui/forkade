'use strict';
const assert=require('node:assert/strict'),{Redis,request}=require('./redis.cjs'),handler=require('../api/coop');
module.exports=async()=>{const db=new Redis(),restore=db.install(),oldFetch=global.fetch,oldSecret=process.env.COOP_SECRET;process.env.STATS_KEY='isolated-owner';process.env.PROMO_SALT='isolated-salt';process.env.COOP_SECRET='isolated-coop';let calls=0;
 global.fetch=async(url,opts)=>{if(!String(url).includes('forkade-coop.breek.workers.dev'))return oldFetch(url,opts);calls++;assert.equal(url,'https://forkade-coop.breek.workers.dev/admin');assert.equal(opts.headers['X-Coop-Key'],'isolated-coop');assert.ok(!url.includes('isolated'));return Response.json({enabled:opts.method==='POST'?JSON.parse(opts.body).enabled:true,rooms:0,messages:0});};
 try{const call=(method,body={},headers={},url='/api/coop')=>request(handler,method,body,url,{'x-real-ip':'192.0.2.99',...headers});
  assert.equal((await call('POST',{enabled:false,key:'isolated-owner',role:'admin'})).status,401);assert.equal(calls,0);
  assert.equal((await call('GET',{}, {},'/api/coop?key=isolated-owner')).status,401);assert.equal(calls,0);
  const h={'x-stats-key':'isolated-owner'};
  assert.equal((await call('POST',{enabled:'false'},h)).status,400);assert.equal((await call('POST',{enabled:false,role:'admin'},h)).status,400);assert.equal((await call('POST',{enabled:false,text:'x'.repeat(100)},h)).status,413);
  assert.equal((await call('GET',{},h)).status,200);const off=await call('POST',{enabled:false},h);assert.equal(off.status,200);assert.ok(!JSON.stringify(off).includes('isolated-coop'));
  console.log('Co-op owner proxy: header-only auth, exact booleans, byte bounds, no secret response passed.');
 }finally{global.fetch=oldFetch;if(oldSecret===undefined)delete process.env.COOP_SECRET;else process.env.COOP_SECRET=oldSecret;restore();}
};
