// Real five-second timeout, automatic recovery and explicit Retry; no room writes.
const assert=require('node:assert/strict'),{chromium,webkit}=require('playwright'),serve=require('./server.cjs'),artifact=require('./artifacts.cjs');
(async()=>{const fixture=serve();await new Promise(r=>fixture.app.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+fixture.app.address().port;
 const browser=await(process.env.WEBKIT?webkit:chromium).launch(process.env.WEBKIT?{}:{channel:'chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const bundle of ['web','dist'])for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:900}]){
  const context=await browser.newContext({viewport,isMobile:viewport.width!==1280,hasTouch:viewport.width!==1280,serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  await context.addInitScript(()=>{window.ForkadeCoopLocal=true;localStorage.setItem('forkade-settings',JSON.stringify({analytics:false,reduceMotion:true,mute:true}));});
  await context.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:'{}'}));
  let mode='slow',requests=0;const methods=[];
  await context.route('https://forkade-coop.breek.workers.dev/**',async route=>{methods.push(route.request().method()+' '+new URL(route.request().url()).pathname);requests++;if(mode==='slow'&&requests===1)await new Promise(r=>setTimeout(r,6000));await route.fulfill({contentType:'application/json',body:JSON.stringify(mode==='failed'?{}:{enabled:mode!=='disabled'})});});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(base+(bundle==='web'?'/':'/download/forkade.html'));await page.evaluate(()=>{ForkadeCoopCode='ABCDEF';open3D('rumble');});const frame=await(await page.locator('#gframe').elementHandle()).contentFrame();
  await frame.locator('#coop-join').waitFor({state:'visible',timeout:15000});assert.equal(requests,2,'client recovers after its first probe exceeds 5s');assert.equal(await frame.locator('#coop-retry').isVisible(),false);
  const check=()=>frame.evaluate(()=>EchoRumble.coop.check());mode='failed';requests=0;await check();assert.equal(requests,4,'one attempt plus at most three retries');
  assert.equal(await frame.locator('#coop-status').textContent(),"Couldn't reach co-op, try again");assert.equal(await frame.locator('#coop-join').isVisible(),false);
  const retry=frame.locator('#coop-retry'),rect=await retry.boundingBox();assert.ok(rect&&rect.width>=44&&rect.height>=44&&rect.x>=0&&rect.y>=0&&rect.x+rect.width<=viewport.width&&rect.y+rect.height<=viewport.height);
  await page.screenshot({path:artifact(`coop-availability/${process.env.WEBKIT?'webkit':'chromium'}-${bundle}-${viewport.width}-retry.png`)});
  mode='enabled';requests=0;await retry.click();await frame.locator('#coop-join').waitFor({state:'visible'});assert.equal(requests,1);assert.equal(await retry.isVisible(),false);
  mode='disabled';requests=0;await check();assert.equal(requests,1,'a real disabled status is never retried');assert.equal(await frame.locator('#coop-status').textContent(),'Co-op is resting, play solo.');assert.equal(await retry.isVisible(),false);assert.equal(await frame.locator('#coop-join').isVisible(),false);
  assert.ok(methods.every(m=>m==='GET /status'),'availability never creates or joins rooms');assert.deepEqual(errors,[]);await context.close();console.log('Co-op availability',process.env.WEBKIT?'WebKit':'Chromium',bundle,viewport.width,'passed');
 }}finally{await browser.close();fixture.app.close();fixture.restore();}
})().catch(e=>{console.error(e);process.exitCode=1;});
