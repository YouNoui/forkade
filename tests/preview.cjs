// Explicit preview-only smoke: never runs against production or writes production keys.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
(async()=>{
 const raw=process.env.FORKADE_PREVIEW_URL,u=new URL(raw);
 if(!u.hostname.startsWith('forkade-git-')||!u.hostname.endsWith('.vercel.app'))throw Error('Preview branch URL required');
 const browser=await chromium.launch({channel:'chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const pid=crypto.randomBytes(16).toString('hex'),base=u.origin;let posted=false;
 try{
  await page.goto(raw);await page.waitForFunction(()=>window.Forkade);
  await page.goto(base+'/glass');await page.waitForFunction(()=>Forkade.current()?.id==='glass');
  assert.match(await page.title(),/Glass City/);assert.equal(await page.locator('meta[property="og:title"]').count(),1);
  assert.equal((await context.request.get(base+'/og/glass.png')).status(),200);
  const call=body=>context.request.post(base+'/api/leaderboard',{data:{pid,...body}});
  let r=await call({action:'start',game:'skyhop'});assert.equal(r.status(),200);const {token,seed}=await r.json();assert.ok(token);
  await new Promise(r=>setTimeout(r,1200));r=await call({game:'skyhop',score:10,name:'PreviewQA',token,seed});assert.equal(r.status(),200);posted=true;
  r=await context.request.get(base+'/api/leaderboard?game=skyhop&pid='+pid);assert.equal((await r.json()).me.score,10);
  const removed=await context.request.delete(base+'/api/leaderboard',{data:{pid}});assert.equal(removed.status(),200);posted=false;
  // Token replay must fail (a rate-limit rejection also prevents a duplicate score).
  r=await call({game:'skyhop',score:10,name:'PreviewQA',token,seed});assert.ok([400,429].includes(r.status()));
  if(process.env.RAMPAGE){await page.goto(base+'/rampage');await page.frameLocator('#gframe').locator('canvas').waitFor({state:'visible'});assert.match(await page.title(),/Rampage/);}
  assert.deepEqual(errors,[]);console.log('Preview passed: deep link, OG PNG, real Redis token/post/read/delete/replay'+(process.env.RAMPAGE?', RAMPAGE 3D':'')+'. No page errors.');
 }finally{if(posted)await context.request.delete(base+'/api/leaderboard',{data:{pid}});await browser.close();}
})().catch(e=>{console.error(e.message.replace(/_vercel_share=[^\s&]+/g,'_vercel_share=[redacted]'));process.exitCode=1;});
