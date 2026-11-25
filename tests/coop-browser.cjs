const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright'),server=require('./server.cjs'),artifact=require('./artifacts.cjs');
async function waitForWorker(){
 const deadline=Date.now()+45000;let last='not listening';
 while(Date.now()<deadline){try{const r=await fetch('http://127.0.0.1:8787/status',{headers:{Origin:'https://playforkade.com'},signal:AbortSignal.timeout(2000)}),j=await r.json();if(r.ok&&j.enabled===true)return;last='HTTP '+r.status+', enabled='+j.enabled;}catch(e){last=e.name;}await new Promise(r=>setTimeout(r,250));}
 throw Error('Isolated co-op Worker did not become enabled on port 8787: '+last);
}
async function waitForControl(frame,id,live){
 // The iframe's one-shot 5s status probe can time out after Wrangler is ready.
 // Retry that probe only locally; never force a hidden control or retry a join/write.
 for(let attempt=0;attempt<3;attempt++){
  try{await frame.locator('#'+id).waitFor({state:'visible',timeout:live?30000:8000});return attempt;}
  catch(error){
   const state=await frame.evaluate(()=>({ready:EchoRumble.coop?.ready,status:document.getElementById('coop-status').textContent,invite:!!parent.ForkadeCoopCode}));
   console.log('Co-op availability',id,JSON.stringify(state));
   if(live||attempt===2||state.ready||/resting/i.test(state.status))throw Error(id+' unavailable: '+JSON.stringify(state),{cause:error});
   await waitForWorker();await frame.evaluate(()=>EchoRumble.coop.check());
  }
 }
}
(async()=>{const live=process.env.COOP_LIVE,statusDelay=Number(process.env.COOP_STATUS_DELAY_MS||0);assert(Number.isFinite(statusDelay)&&statusDelay>=0&&statusDelay<=10000,'COOP_STATUS_DELAY_MS must be 0–10000');assert(!live||!statusDelay,'Status delay is local-only');if(!live)await waitForWorker();const fixture=live?null:server();if(fixture)await new Promise(r=>fixture.app.listen(0,'127.0.0.1',r));const base=live||'http://127.0.0.1:'+fixture.app.address().port;
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader',...(!live?['--disable-features=LocalNetworkAccessChecks']:[])]});const report=[];
 try{for(const width of [390,1280]){const context=await browser.newContext({viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390,serviceWorkers:'block',recordVideo:{dir:artifact('coop/videos/'),size:{width,height:width===390?844:900}}});const errors=[];
  await context.addInitScript(()=>{try{localStorage.setItem('forkade-settings',JSON.stringify({analytics:false,reduceMotion:true}));}catch{}});
  // Never write ranking, promo, Forge, stats or token fixtures to production.
  await context.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,items:[],ghosts:[],entries:[],scores:[],total:0})}));
  let delayedStatus=false;
  if(!live){await context.route('https://forkade-coop.breek.workers.dev/**',async route=>{const req=route.request();
   // Reproduce the CI desktop join failure after the host and phone cases are healthy.
   if(statusDelay&&width===1280&&!delayedStatus&&req.url().endsWith('/status')&&req.frame().page()===b){delayedStatus=true;await new Promise(r=>setTimeout(r,statusDelay));}
   const res=await fetch(req.url().replace('https://forkade-coop.breek.workers.dev','http://127.0.0.1:8787'),{method:req.method(),headers:{Origin:base,'CF-Connecting-IP':'192.0.2.'+(width===390?31:32)},signal:AbortSignal.timeout(10000)});await route.fulfill({status:res.status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':base},body:await res.text()});});
   await context.route(base+'/**',async route=>{if(route.request().url().includes('/api/'))return route.fallback();const res=await route.fetch(),headers={...res.headers()};delete headers['content-security-policy'];await route.fulfill({response:res,headers});});
   await context.addInitScript(()=>{window.ForkadeCoopLocal=true;const Native=WebSocket;window.WebSocket=class extends Native{constructor(url,protocols){super(String(url).replace('wss://forkade-coop.breek.workers.dev','ws://127.0.0.1:8787'),protocols);}};});
  }
  const a=await context.newPage(),b=await context.newPage();for(const p of [a,b]){p.on('pageerror',e=>(errors.push(e.message),console.log('PAGE',e.message)));p.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('CONSOLE',m.text());}});}
  await a.goto(base+'/rumble');const f=()=>a.frames().find(f=>f.url().includes('games3d/rumble'));await a.waitForFunction(()=>document.querySelector('#gframe')?.contentWindow?.EchoRumble?.coop);const fa=f();const createRetries=await waitForControl(fa,'coop-create',live);await fa.locator('#coop-create').click();await fa.waitForFunction(()=>EchoRumble.coop.active&&EchoRumble.coop.slot!==null).catch(async e=>{console.log(await fa.locator('#coop-status').textContent());throw e;});
  const code=await fa.evaluate(()=>EchoRumble.coop.code);await b.goto(base+'/r/coop/'+code);await b.waitForFunction(()=>document.querySelector('#gframe')?.contentWindow?.EchoRumble?.coop);const fb=b.frames().find(f=>f.url().includes('games3d/rumble'));assert.equal(await fb.evaluate(()=>parent.ForkadeCoopCode),code);const joinRetries=await waitForControl(fb,'coop-join',live);if(statusDelay>5000&&width===1280)assert(delayedStatus&&joinRetries>0,'Delayed availability probe must exercise local recovery');await fb.locator('#coop-join').click();await fb.waitForFunction(()=>EchoRumble.coop.active&&EchoRumble.coop.slot!==null);
  await fa.waitForFunction(()=>EchoRumble.core.s.echoes.length===1);await fb.waitForFunction(()=>EchoRumble.core.s.echoes.length===1);
  if(!live&&width===390){const extras=[];for(let i=0;i<2;i++){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/');await p.evaluate(code=>new Promise((resolve,reject)=>{const ws=window.coopProbe=new WebSocket('wss://forkade-coop.breek.workers.dev/rooms/'+code);ws.onerror=reject;ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.t==='joined'){window.coopTimer=setInterval(()=>{if(ws.readyState===1)ws.send(JSON.stringify({t:'input',v:[1,0,0,0,0,1,1,2,0,0,0,0]}));},75);resolve();}};}),code);extras.push(p);}
   await fa.waitForFunction(()=>EchoRumble.core.s.echoes.length===3);await a.waitForTimeout(2000);await a.screenshot({path:artifact('coop/local-four-390.png')});for(const p of extras)await p.close();await fa.waitForFunction(()=>EchoRumble.core.s.echoes.length===1);}
  const before=await fa.evaluate(()=>EchoRumble.core.s.tick);for(const frame of [fa,fb])await frame.evaluate(()=>{EchoRumble.emote();dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}));});await a.waitForTimeout(2000);for(const frame of [fa,fb])await frame.evaluate(()=>dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'})));await a.waitForTimeout(live?28000:3000);
  const after=await fa.evaluate(()=>({tick:EchoRumble.core.s.tick,players:EchoRumble.core.s.echoes.length+1,score:EchoRumble.core.s.score}));assert(after.tick>before);assert.equal(after.players,2);
  await a.screenshot({path:artifact('coop/'+(live?'live':'local')+'-'+width+'.png')});await b.screenshot({path:artifact('coop/'+(live?'live':'local')+'-join-'+width+'.png')});
  await fa.locator('#coop-solo').click();await fa.waitForFunction(()=>EchoRumble.isPlaying()&&!EchoRumble.coop.active);await fa.waitForFunction(()=>EchoRumble.core.s.tick>20);await context.close();assert.deepEqual(errors,[]);report.push({width,...after,consoleErrors:errors,solo:true,createRetries,joinRetries,delayedStatus});
 }}finally{await browser.close();if(fixture){await new Promise(r=>fixture.app.close(r));fixture.restore();}}
 fs.writeFileSync(artifact('coop/'+(live?'live':'local')+'-report.json'),JSON.stringify(report,null,2));console.log(report);
})().catch(e=>{console.error(e);process.exitCode=1;});
