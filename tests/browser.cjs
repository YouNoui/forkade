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
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(r.url().includes('/api/'))sent.push(r.url());});
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
   assert.equal(sent.length,0,'casual rounds remain local');
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
    await frame.evaluate(()=>{dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD'}));dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}));});await page.waitForTimeout(700);
    await frame.evaluate(()=>{dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD'}));dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}));});
    await frame.locator('#stomp').click();await page.waitForTimeout(150);assert.ok(await frame.evaluate(()=>Rampage.state.score>0));assert.ok(await frame.evaluate(()=>Rampage.state.chunks.length>0));
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
  await a.locator('#pb-name').fill('Tester');await a.locator('#pb-post').click();await a.waitForFunction(()=>document.querySelector('#pb-msg').textContent.startsWith('Posted!'));
  await a.goto(base+'/stats.html');await a.locator('#key').fill('owner-test');await a.locator('#go').click();await a.locator('#out').waitFor({state:'visible'});
  await a.close();await b.close();
  fs.writeFileSync(path.join(out,'report'+(process.env.WEBKIT?'-webkit':'')+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();fixture.app.close();fixture.restore();}
})().catch(e=>{console.error(e);process.exitCode=1;});
