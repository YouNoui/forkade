const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit}=require('playwright'),serve=require('./server.cjs');
(async()=>{
 const fixture=serve();await new Promise(r=>fixture.app.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+fixture.app.address().port;
 const out=path.join(__dirname,'artifacts');fs.mkdirSync(out,{recursive:true});const report=[];
 const browser=await (process.env.WEBKIT?webkit:chromium).launch({headless:true,...(process.env.WEBKIT?{}:{channel:'chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']})});
 try{
  for(const bundle of ['web','dist'])for(const size of [{width:1280,height:900},{width:390,height:844},{width:844,height:390}]){
   console.log('Matrix',bundle,size.width);
   const context=await browser.newContext({viewport:size,hasTouch:size.width!==1280,isMobile:size.width!==1280,serviceWorkers:'block'}),page=await context.newPage(),errors=[],sent=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(r.url().includes('/api/'))sent.push({url:r.url(),body:r.postData()||''});});
   const url=base+(bundle==='web'?'/':'/dist/forkade.html');await page.goto(url);await page.waitForFunction(()=>window.Forkade&&document.querySelector('#daily-challenge'));
   assert.equal(sent.length,0,'default play must not send telemetry or tokens');
   await page.locator('.title').click();if(await page.evaluate(()=>!!(window.AudioContext||window.webkitAudioContext)))assert.equal(await page.evaluate(()=>Forkade.sfx._ac?.state),'running','audio unlocked on first tap');
   const ids=await page.evaluate(()=>Forkade.registry.map(g=>g.id));
   for(const id of ids){
    await page.evaluate(id=>openGame(id),id);await page.waitForTimeout(160);
    const info=await page.evaluate(()=>({id:Forkade.current().id,w:Forkade.current().W,h:Forkade.current().H}));assert.equal(info.id,id);
    if(size.width===390&&['skyhop','striker','breaker'].includes(id))assert.deepEqual([info.w,info.h],[560,900]);
    if(id==='breaker')assert.ok(await page.evaluate(()=>Forkade.current().bricks.every(b=>b.x+Forkade.current().brickW<=Forkade.current().W)));
    if(['skyhop','striker','breaker'].includes(id)){
     await page.keyboard.down('Space');await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');await page.keyboard.up('Space');
     await page.screenshot({path:path.join(out,`${bundle}-${size.width}-${id}.png`)});
    }
    await page.evaluate(()=>Forkade.stop());
   }
   // casual rounds only fetch an anonymous round token: game (+ daily flag), never a player id, name or score
   for(const r of sent){assert.ok(r.url.includes('/api/leaderboard'),'only round tokens: '+r.url);const b=JSON.parse(r.body||'{}');
    assert.equal(b.action,'start');assert.ok(!('pid' in b)&&!('name' in b)&&!('score' in b),'round token is anonymous: '+r.body);}
   await page.getByRole('button',{name:'⚙ Settings',exact:true}).first().click();
   await page.locator('[data-setting=colourBlind]').check();await page.locator('[data-setting=reduceMotion]').check();await page.locator('[data-setting=mute]').check();
   await page.locator('[data-setting=volume]').fill('0.25');await page.getByRole('button',{name:'Close settings'}).click();await page.reload();
   assert.deepEqual(await page.evaluate(()=>[Forkade.settings.colourBlind,Forkade.settings.reduceMotion,Forkade.settings.mute,Forkade.settings.volume]),[true,true,true,0.25]);
   for(const id of ['match','prism']){await page.evaluate(id=>openGame(id),id);await page.waitForTimeout(150);await page.screenshot({path:path.join(out,`${bundle}-${size.width}-${id}-symbols.png`)});await page.evaluate(()=>Forkade.stop());}
   await page.evaluate(()=>{openGame('skyhop');const g=Forkade.current();g.score=120;g.state='over';});await page.waitForTimeout(350);
   await page.evaluate(()=>{Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>window.copied=t},configurable:true});});
   await page.locator('#pb-share').click();assert.match(await page.evaluate(()=>window.copied),/I scored 120 in SKY HOP on FORKADE.*https:\/\/playforkade.com\/skyhop/);
   await page.evaluate(()=>Object.defineProperty(navigator,'share',{value:async data=>window.shared=data,configurable:true}));await page.locator('#pb-share').click();assert.match(await page.evaluate(()=>window.shared.text),/120/);
   await page.evaluate(()=>Forkade.stop());
   await page.evaluate(()=>open3D());await page.frameLocator('#gframe').locator('canvas').waitFor({state:'visible',timeout:10000}).catch(async e=>{console.log('3D diagnostic',errors,await page.locator('#stage').getAttribute('class'),await page.locator('#gframe').boundingBox(),page.frames().map(f=>f.url()));throw e;});await page.screenshot({path:path.join(out,`${bundle}-${size.width}-echo3d.png`)});
   await page.evaluate(()=>closeStage());
   if(await page.locator('.name').filter({hasText:'RAMPAGE 3D'}).count()){
    await page.evaluate(()=>open3D('rampage'));await page.waitForTimeout(700);
    const frame=page.frames().find(f=>f!==page.mainFrame());await frame.waitForFunction(()=>window.Rampage);
    const initial=await frame.evaluate(()=>Rampage.state.time);await frame.locator('#pause').click();await page.waitForTimeout(180);const paused=await frame.evaluate(()=>Rampage.state.time);await page.waitForTimeout(180);assert.equal(await frame.evaluate(()=>Rampage.state.time),paused);await frame.locator('#pause').click();
    await frame.evaluate(()=>{dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD'}));dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}));});await frame.waitForFunction(()=>Rampage.state.x>=3&&Rampage.state.z<=-3,null,{timeout:10000});
    await frame.evaluate(()=>{dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD'}));dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}));});
    await frame.locator('#stomp').click();await frame.waitForFunction(()=>Rampage.state.score>0,null,{timeout:5000});assert.ok(await frame.evaluate(()=>Rampage.state.score>0));assert.ok(await frame.evaluate(()=>Rampage.state.chunks.length>0));
    await page.screenshot({path:path.join(out,`${bundle}-${size.width}-rampage.png`)});
    const after=await frame.evaluate(()=>Rampage.state.score);await frame.locator('#rewind').hover();await page.mouse.down();await frame.waitForFunction(score=>Rampage.state.score<score,after,{timeout:5000});await page.mouse.up();assert.ok(await frame.evaluate(()=>Rampage.state.score)<after,'rewind restores destruction score');
    const stick=await frame.locator('#stick').boundingBox();await page.mouse.move(stick.x+stick.width/2,stick.y+stick.height/2);await page.mouse.down();await page.mouse.move(stick.x+stick.width*.8,stick.y+stick.height/2);const x=await frame.evaluate(()=>Rampage.state.x);await frame.waitForFunction(x=>Rampage.state.x>x,x,{timeout:5000});await page.mouse.up();const moved=await frame.evaluate(()=>({x:Rampage.state.x,paused:Rampage.paused,done:Rampage.state.done,time:Rampage.state.time}));assert.ok(moved.x>x,'thumb stick moves ECHO '+JSON.stringify({x,moved,stick}));
    await page.evaluate(()=>closeStage());
   }
   if(bundle==='web'){
    await page.goto(base+'/glass');await page.waitForFunction(()=>Forkade.current()?.id==='glass');assert.match(await page.title(),/GLASS CITY/);
    await page.goto(base+'/?game=skyhop');await page.waitForFunction(()=>Forkade.current()?.id==='skyhop');
    await page.goto(base+'/does-not-exist');assert.equal(await page.locator('#stage').evaluate(e=>e.classList.contains('on')),false);
   }
   assert.deepEqual(errors,[],`${bundle} ${size.width} console`);report.push({bundle,...size,result:'passed'});await context.close();
  }
  // Seeded levels match across separate devices, independent of cosmetic settings.
  const a=await browser.newPage({viewport:{width:1280,height:900}}),b=await browser.newPage({viewport:{width:390,height:844}});
  await a.goto(base);await b.goto(base);
  for(const game of ['skyhop','glass','demo','prism','match','wrecker']){
   const snap=page=>page.evaluate(game=>{Forkade.settings.reduceMotion=true;openGame(game,{seed:'same-level-test',daily:'2026-11-18'});return JSON.stringify(Forkade.current().snapshot());},game);
   assert.equal(await snap(a),await snap(b),game+' identical daily level');
  }
  // Opt-in run + deliberate Post through the actual handler (only in-memory test data).
  await a.evaluate(()=>{openGame('skyhop');});await a.waitForFunction(async()=>!!(await Forkade.board.run)?.token);
  for(const [k,v]of fixture.db.data)if(k.startsWith('run:')){const run=JSON.parse(v);run.at-=20000;fixture.db.data.set(k,JSON.stringify(run));}
  await a.evaluate(()=>{const g=Forkade.current();g.score=120;g.state='over';});await a.waitForTimeout(400);
  await a.locator('#pb-name').fill('Tester');await a.evaluate(()=>{const b=document.getElementById('pb-post');b.click();b.click();b.click();});await a.waitForFunction(()=>document.querySelector('#pb-msg').textContent.startsWith('Posted!'));
  await a.waitForTimeout(300);assert.ok(await a.locator('#pb-post').isDisabled(),'post locks after one tap');assert.match(await a.locator('#pb-msg').textContent(),/^Posted!/,'extra taps never overwrite the success');
  // rankings: 10 placeholder rows while loading, a deadline, and a Retry button instead of an endless spinner
  await a.evaluate(()=>{window.__realFetch=fetch;window.fetch=(u,o)=>String(u).includes('/api/leaderboard?')?new Promise((_,rej)=>o.signal.addEventListener('abort',()=>rej(Object.assign(new Error('a'),{name:'AbortError'})))):window.__realFetch(u,o);document.getElementById('pb-post');});
  await a.keyboard.press('Escape');await a.waitForTimeout(300);await a.evaluate(()=>document.getElementById('open-ranks').click());
  assert.equal(await a.locator('#rlist li.sk').count(),10,'space reserved while loading');
  await a.locator('#r-retry').waitFor({timeout:9000});assert.match(await a.locator('#rlist').textContent(),/too long/);
  await a.evaluate(()=>{window.fetch=window.__realFetch;});await a.locator('#r-retry').click();await a.waitForFunction(()=>/Tester/.test(document.querySelector('#rlist').textContent));
  await a.evaluate(()=>document.getElementById('close-ranks').click());
  // destructive actions are confirmed in a sheet: Cancel changes nothing
  await a.evaluate(()=>document.getElementById('open-ranks').click());await a.waitForFunction(()=>/Tester/.test(document.querySelector('#rlist').textContent));
  await a.evaluate(()=>document.getElementById('forget').click());assert.equal(await a.locator('#confirm').isHidden(),false,'remove asks first');
  assert.match(await a.locator('#confirm-text').innerText(),/removes every score you posted/);await a.locator('#confirm-no').click();
  await a.locator('#confirm').waitFor({state:'hidden'});assert.match(await a.locator('#rlist').textContent(),/Tester/,'cancel keeps scores');
  await a.evaluate(()=>document.getElementById('close-ranks').click());
  await a.goto(base+'/stats.html');await a.locator('#key').fill('owner-test');await a.locator('#go').click();await a.locator('#out').waitFor({state:'visible'});
  await a.goto(base);await a.waitForFunction(()=>window.Forkade);await a.evaluate(()=>document.getElementById('open-ranks').click());await a.waitForTimeout(800);
  await a.evaluate(()=>document.getElementById('forget').click());await a.locator('#confirm-yes').click();
  await a.waitForFunction(()=>/Removed/.test(document.getElementById('forget').textContent));
  await a.close();await b.close();
  // goal gradient: a new player starts at 1/4 (the visit counts), 3 different games pays +30 once, then the next badge shows
  { const pg=await browser.newPage({viewport:{width:390,height:844}});await pg.goto(base);await pg.waitForFunction(()=>window.Forkade);
   assert.match(await pg.locator('#goal').innerText(),/Starter goal[\s\S]*1 \/ 4/);assert.equal(await pg.locator('#w-sdots i.on').count(),1,'today counts in the streak');
   const r=await pg.evaluate(()=>{const R=Forkade.rewards,c=R.cores();['skyhop','glass','prism'].forEach(id=>Forkade.scores.submit(id,40));return {got:R.starter(),again:R.starter(),diff:R.cores()-c};});
   assert.deepEqual(r,{got:30,again:0,diff:30},'starter goal pays once');
   await pg.evaluate(()=>{Forkade.rewards.add(1);});await pg.waitForTimeout(1200);
   assert.match(await pg.locator('#goal').innerText(),/Next badge/);assert.equal(await pg.locator('#w-cores').textContent(),String(await pg.evaluate(()=>Forkade.rewards.cores())),'counter settles on the real total');
   await pg.close(); }
  // UX playbook at 390: one yellow main action on screen, 44px taps, bottom sheets, CSP clean (headers come from vercel.json)
  { const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const pg=await ctx.newPage();const csp=[];
   await pg.exposeFunction('__csp',v=>csp.push(v));await pg.addInitScript(()=>{document.addEventListener('securitypolicyviolation',e=>window.__csp(e.violatedDirective+' '+e.blockedURI));
     try{localStorage.setItem('forkade-install-snooze',String(Date.now()+9e9))}catch(_){}});
   const pops=()=>pg.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>40&&r.height>20&&r.top>=0&&r.bottom<=innerHeight&&getComputedStyle(e).backgroundColor==='rgb(255, 216, 77)';}).length);
   const small=()=>pg.evaluate(()=>[...document.querySelectorAll('button,a,input')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]')&&getComputedStyle(e).visibility!=='hidden'&&e.getBoundingClientRect().height<44).map(e=>e.id||e.textContent.trim().slice(0,20)));
   await pg.goto(base);await pg.waitForFunction(()=>window.Forkade);await pg.waitForTimeout(400);
   assert.equal(await pops(),1,'new player: one main action on the first screen');assert.deepEqual(await small(),[],'44px taps on home');
   await pg.evaluate(()=>{Forkade.scores.submit('glass',10);});await pg.reload();await pg.waitForFunction(()=>window.Forkade);await pg.waitForTimeout(400);
   assert.equal(await pops(),1,'returning player: one main action (Daily)');
   const bottom=async id=>{const r=await pg.evaluate(i=>{const s=document.querySelector('#'+i+' .sheet').getBoundingClientRect();return Math.round(innerHeight-s.bottom);},id);assert.ok(Math.abs(r)<=2,id+' is a bottom sheet');};
   await pg.evaluate(()=>document.getElementById('open-locker').click());await pg.waitForTimeout(350);await bottom('locker');
   await pg.keyboard.press('Escape');await pg.locator('#locker').waitFor({state:'hidden',timeout:1500});
   await pg.evaluate(()=>document.getElementById('open-ranks').click());await pg.waitForTimeout(350);await bottom('ranks');
   await pg.mouse.click(195,20);await pg.locator('#ranks').waitFor({state:'hidden',timeout:1500});
   await pg.evaluate(()=>document.querySelector('.wbtns .settings-button').click());await pg.waitForTimeout(350);
   await pg.evaluate(()=>{const s=document.querySelector('#settings .sheet'),t=(type,y)=>{const e=new Event(type,{bubbles:true});Object.defineProperty(e,'touches',{value:type==='touchend'?[]:[{identifier:1,target:s,clientX:200,clientY:y}]});s.dispatchEvent(e);};
     s.scrollTop=0;t('touchstart',300);t('touchmove',420);t('touchend',0);});await pg.waitForTimeout(150);
   await pg.locator('#settings').waitFor({state:'hidden',timeout:1500});
   await pg.evaluate(()=>open3D());await pg.frameLocator('#gframe').locator('canvas').waitFor({state:'visible',timeout:15000});
   await pg.evaluate(()=>closeStage());
   await pg.goto(base+'/playground.html');await pg.locator('button.run').first().click();await pg.waitForTimeout(600);
   assert.match(await pg.locator('#log').innerText(),/Running/,'Playground runs player code under its CSP');
   await pg.goto(base+'/delete.html');await pg.locator('#wipe').click();assert.equal(await pg.locator('#cf').isHidden(),false,'clear asks first');await pg.locator('#cf-no').click();
   assert.deepEqual(csp,[],'no CSP violations');await ctx.close(); }
  // fair play: the page reads its numbers from the engine, and a round's breakdown adds up to what it paid
  { const pg=await browser.newPage({viewport:{width:390,height:844}});await pg.goto(base+'/fair.html');await pg.waitForFunction(()=>document.querySelectorAll('#badges tbody tr').length);
   const f=await pg.evaluate(()=>({rows:document.querySelectorAll('#badges tbody tr').length,goals:Object.keys(Forkade.rewards.GOALS).length,skins:document.querySelectorAll('#skins tbody tr').length,
     skinN:Forkade.rewards.SKINS.length,sky:document.querySelector('#badges').innerText.includes('SKY HOP'),gold:document.querySelector('#badges tbody tr').innerText.includes(Forkade.rewards.GOALS[Object.keys(Forkade.rewards.GOALS)[0]][2].toLocaleString('en'))}));
   assert.deepEqual([f.rows,f.skins,f.sky,f.gold],[f.goals,f.skinN,true,true],'fair page matches the code');
   await pg.goto(base);await pg.waitForFunction(()=>window.Forkade);assert.equal(await pg.locator('.privacy-line a[href="fair.html"]').count(),1);
   const r=await pg.evaluate(()=>{const R=Forkade.rewards,got=R.roundEnd('trail',350,true,null);return {got,sum:R.breakdown.reduce((a,p)=>a+p[1],0),names:R.breakdown.map(p=>p[0])};});
   assert.equal(r.sum,r.got,'breakdown adds up');assert.ok(r.names.includes('round')&&r.names.includes('new best')&&r.names.includes('silver'),'breakdown names each part');
   await pg.close(); }
  // sense of place (playbook 5.2): card -> game -> Back returns to the same card, same scroll, every way back
  { const ctx=await browser.newContext({viewport:{width:1280,height:800}});await ctx.addInitScript(()=>{try{localStorage.setItem('forkade-install-snooze',String(Date.now()+9e9));localStorage.setItem('forkade-more-games','1')}catch(_){}});
   const pg=await ctx.newPage();await pg.goto(base);await pg.waitForFunction(()=>window.Forkade);
   const card=pg.locator('.card[data-game="glass"]');await card.scrollIntoViewIfNeeded();const y=await pg.evaluate(()=>scrollY);
   const st=()=>pg.evaluate(()=>({on:document.getElementById('stage').classList.contains('on'),path:location.pathname+location.search,y:scrollY}));
   await card.click();await pg.waitForTimeout(500);let s1=await st();assert.ok(s1.on&&s1.path==='/glass','game has its own URL');
   assert.match(await pg.locator('#where').innerText(),/Arcade.*GLASS CITY/s,'header says where you are');
   await pg.goBack();await pg.waitForTimeout(600);s1=await st();assert.ok(!s1.on&&s1.path==='/'&&Math.abs(s1.y-y)<=1,'browser Back closes the game at the same scroll');
   assert.ok(await card.evaluate(e=>e.classList.contains('back-pulse')),'the card pulses on return');
   await card.click();await pg.waitForTimeout(400);await pg.keyboard.press('Escape');await pg.waitForTimeout(600);s1=await st();assert.ok(!s1.on&&s1.path==='/','Esc goes back the same way');
   await card.click();await pg.waitForTimeout(400);await pg.locator('#back').click();await pg.waitForTimeout(600);s1=await st();assert.ok(!s1.on&&s1.path==='/','on-screen Back goes back the same way');
   await pg.goto(base+'/?game=prism');await pg.waitForFunction(()=>document.getElementById('stage').classList.contains('on'));await pg.goBack();await pg.waitForTimeout(600);
   s1=await st();assert.ok(!s1.on&&s1.path==='/','a deep link still has the arcade behind it');
   await pg.locator('#open-locker').click();await pg.waitForTimeout(300);
   assert.ok(await pg.evaluate(()=>!!document.querySelector('#locker .sheet').style.getPropertyValue('--ox')),'sheet grows from its button');
   await ctx.close(); }
  // first visit: one 'Start here' card; settings say Saved
  { const pg=await browser.newPage({viewport:{width:390,height:844}});await pg.goto(base);await pg.waitForFunction(()=>window.Forkade);
   assert.equal(await pg.locator('.card.start').count(),1,'one start card for new players');assert.match(await pg.locator('.card.start').innerText(),/START HERE/);assert.equal(await pg.locator('.card.start .name').innerText(),await pg.evaluate(()=>GAME_NAMES()[Forkade.experiment.start()]));
   await pg.evaluate(()=>document.querySelector('.settings-button').click());await pg.locator('[data-setting=colourBlind]').click();
   assert.match(await pg.locator('#settings .saved.on').innerText(),/Saved/);await pg.keyboard.press('Escape');
   await pg.evaluate(()=>{Forkade.scores.submit('glass',10);});await pg.reload();await pg.waitForFunction(()=>window.Forkade);
   assert.equal(await pg.locator('.card.start').count(),0,'gone once they have played');await pg.close(); }
  // install bar (playbook section 11): iPhone Safari sheet, Chrome prompt, 3-day snooze, hidden in games and when installed
  for(const [name,ua,size] of [['iphone','Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',{width:390,height:844}],['chrome','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',{width:1280,height:900}]]){
   const ctx=await browser.newContext({viewport:size,userAgent:ua,serviceWorkers:'block'}),pg=await ctx.newPage();await pg.goto(base);await pg.waitForFunction(()=>window.Forkade);
   const shown=()=>pg.evaluate(()=>{const b=document.getElementById('installbar');return !b.hidden&&b.getBoundingClientRect().height>0;});
   if(name==='chrome'){assert.equal(await shown(),false,'no bar before beforeinstallprompt');
    await pg.evaluate(()=>{const e=new Event('beforeinstallprompt');window.__p=0;e.prompt=()=>{window.__p++;};e.userChoice=Promise.resolve({outcome:'dismissed'});dispatchEvent(e);});}
   assert.equal(await shown(),true,name+': install bar shows');
   const r=await pg.evaluate(()=>{const b=document.getElementById('installbar').getBoundingClientRect(),w=document.querySelector('.wrap').getBoundingClientRect();return {h:b.height,below:w.top>=b.bottom-1};});
   assert.ok(r.h<=56&&r.below,name+': slim and pushes content down');
   await pg.locator('#ib-go').click();
   if(name==='iphone'){assert.ok(await pg.locator('#ios-install').isVisible(),'Share -> Add to Home Screen sheet');await pg.locator('#ios-install-close').click();}
   else {assert.equal(await pg.evaluate(()=>window.__p),1,'Install calls prompt()');
    // a dismissed prompt can't be reused, so the bar hides until the browser offers a new one (next visit)
    assert.equal(await shown(),false,'no dead Install button after a dismissed prompt');
    await pg.evaluate(()=>{const e=new Event('beforeinstallprompt');e.prompt=()=>{};e.userChoice=Promise.resolve({outcome:'dismissed'});dispatchEvent(e);});}
   await pg.evaluate(()=>openGame('skyhop'));await pg.waitForTimeout(250);assert.equal(await shown(),false,'never inside a game');await pg.keyboard.press('Escape');await pg.waitForTimeout(300);
   await pg.locator('#ib-x').click();assert.equal(await shown(),false,'x hides it');
   assert.ok(await pg.evaluate(()=>Number(localStorage.getItem('forkade-install-snooze'))-Date.now()>2.9*864e5),'snoozed for 3 days');
   await ctx.close();
  }
  { const ctx=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',serviceWorkers:'block'});
    await ctx.addInitScript(()=>Object.defineProperty(navigator,'standalone',{get:()=>true}));const pg=await ctx.newPage();await pg.goto(base);await pg.waitForFunction(()=>window.Forkade);
    assert.equal(await pg.evaluate(()=>document.getElementById('installbar').hidden),true,'hidden once installed');await ctx.close(); }
  fs.writeFileSync(path.join(out,'report'+(process.env.WEBKIT?'-webkit':'')+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();fixture.app.close();fixture.restore();}
})().catch(e=>{console.error(e);process.exitCode=1;});
