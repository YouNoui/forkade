// Sky Hop physics + real-engine integration. All network writes use the local fixture.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=fs.readFileSync('web/games/skyhop.js','utf8'),engine=fs.readFileSync('web/engine.js','utf8');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function harness(seed=732,on=false,dimensions=[900,560],code=source){
  const random=new Function(engine.slice(engine.indexOf('  let rngState = null;'),engine.indexOf('  const fxrand'))+';return {seed,rng,rand,get:()=>rngState,set:v=>rngState=v};')();random.seed(seed);
  const Rewind=new Function(engine.slice(engine.indexOf('  class Rewind {'),engine.indexOf('  /*',engine.indexOf('  class Rewind {')))+';return Rewind;')();
  const saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,String(v))};
  const input={keys:{},pressed:{},right(){return !!this.keys.ArrowRight;},left(){return !!this.keys.ArrowLeft;}};
  class GameBase{constructor(){[this.W,this.H]=dimensions;this.id='skyhop';this.input=input;this.rewind=new Rewind();this.particles={emit(){}};this.shake={add(){}};}}
  let Game;const ne={GameBase,palette:{},...random,assist:()=>false,sfx:{jump(){},pickup(){}},register:(id,meta,cls)=>Game=cls};
  new Function('Forkade','localStorage',code)(ne,storage);if(on)ne.skyhopTimeGaps.set(true);
  const g=new Game();g.configureRound?.({seed:String(seed)});g.reset();
  const tick=(rewind=false,dt=1/60)=>{const s=g.rewind.step(rewind,dt);if(s){g.restore(s.game);random.set(s.rng);}else{g.step(dt);g.rewind.record({game:g.snapshot(),rng:random.get()});}input.pressed={};};
  return {g,ne,input,tick,storage,rng:random.get};
}
function classic(code=source){
  const h=harness(732,false,[900,560],code),samples=[];
  for(let i=0;i<1800;i++){
    if(h.g.state==='over')h.g.reset();
    h.input.keys={Space:true,ArrowRight:Math.floor(i/70)%2===0,ArrowLeft:Math.floor(i/70)%2!==0};h.input.pressed=i%45===0?{Space:true}:{};h.tick();
    if(i%30===29)samples.push({game:h.g.snapshot(),rng:h.rng()});
  }
  return hash(samples);
}
function gateRun(seed,rewind=true,dimensions=[900,560],shield=false,dt=1/60){
  const h=harness(seed,true,dimensions),{g,input,tick}=h;
  const a={x:g.W/2-65,y:g.H-40,w:130,h:18,kind:0,life:1};
  g.plats=[a];g.py=a.y-16;g.px=g.W/2;g.onGround=true;g.elapsed=15;g.addTimeGate();
  const b=g.plats.find(p=>p.gateExit);g.nextTimeGate=Infinity;
  if(shield){g.px=16;g.py=g.H-24;g.onGround=false;g.vy=250;}
  let phase=0,maxRise=0,minEnergy=1;
  for(let n=0;n<480;n++){
    const target=phase>=3||!rewind?b.x+b.w/2:a.x+a.w/2;
    input.keys={Space:true,ArrowLeft:g.px>target+3,ArrowRight:g.px<target-3};
    if(rewind&&phase===0&&g.vy<0&&g.vy>=-55&&a.y-(g.py+16-g.cam)>130)phase=1;
    if(phase===1&&g.echoRewind?.duration>=.35)phase=2;
    tick(phase===1,dt);minEnergy=Math.min(minEnergy,g.rewind.energy);
    if(phase===2&&g.echo&&((g.onGround&&Math.abs(g.py+16-g.cam-g.echo.y)<.01)||(g.vy<-500&&g.py+16-g.cam<g.echo.y)))phase=3;
    maxRise=Math.max(maxRise,a.y-(g.py+16-g.cam));
    if(g.timeGate?.cleared)return {cleared:true,maxRise,minEnergy};
    if(g.state==='over')break;
  }
  return {cleared:false,maxRise,minEnergy};
}
function simulation(){
  // Frozen from main 1b4c448c7921e8c6bfbcdcf80526a546782fdfbb, before changing Sky Hop.
  assert.equal(classic(),'fef97408ed3c07a1a208633e16a2b630afb9b002f17bc37f65ac54c9fc117729','30-second classic state + RNG trace must remain identical');
  let yes=0,no=0,shieldCrossings=0,maxReach=0,energy=1;
  for(let seed=0;seed<200;seed++){
    for(const dimensions of [[900,560],[560,900]]){
      const {g,input,tick}=harness(seed,true,dimensions);g.py=g.H-56;g.onGround=true;g.stage=3;g.elapsed=110;
      const a=g.plats[0];assert.ok(g.addTimeGate());const b=g.plats.find(p=>p.gateExit);
      assert.ok(a.y-b.y>=190&&a.y-b.y<=270);assert.ok(Math.abs(a.x+a.w/2-b.x-b.w/2)<=90);
      assert.ok(a.w>=110&&b.w>=110);assert.equal(a.kind,0);assert.equal(b.kind,0);
      assert.ok(!g.plats.some(p=>p.y>a.y-190&&p.y<a.y));assert.ok(!g.plats.some(p=>p.y>b.y&&p.y<a.y));
      const above=g.plats.filter(p=>p.y<b.y).sort((p,q)=>q.y-p.y)[0];assert.equal(above.kind,0);
      assert.ok(g.nextTimeGate-g.elapsed>=12&&g.nextTimeGate-g.elapsed<=18);
      const snapshot=g.snapshot();g.plats=[];g.restore(snapshot);assert.deepEqual(g.snapshot(),snapshot);
      input.keys.Space=true;tick();assert.equal(g.plats.find(p=>p.gateExit).kind,0,'stage changes preserve static gate');
      const good=gateRun(seed,true,dimensions),bad=gateRun(seed,false,dimensions),shield=gateRun(seed,false,dimensions,true);
      yes+=good.cleared;no+=bad.cleared;shieldCrossings+=shield.cleared;maxReach=Math.max(maxReach,bad.maxRise);energy=Math.min(energy,good.minEnergy);
    }
  }
  assert.equal(yes,400);assert.equal(no,0);assert.equal(shieldCrossings,0);assert.ok(maxReach<=160);assert.ok(energy>=.2);
  for(const dt of [1/30,1/20])for(let seed=0;seed<200;seed++)assert.equal(gateRun(seed,true,[900,560],false,dt).cleared,true,'slow-frame gate '+seed+' at '+dt);
  {const {g,tick}=harness(7,true);g.py=g.H-56;g.onGround=true;g.elapsed=15;g.rewind.energy=.49;g.step(0);assert.equal(g.timeGate,null);g.rewind.energy=.5;g.step(0);assert.ok(g.timeGate);}
  {const {g,tick,rng}=harness(8,true);g.py=g.H-56;g.onGround=true;g.elapsed=15;const before={game:g.snapshot(),rng:rng()};g.rewind.record(before);g.rewind.record(before);tick(false,0);const gate=g.snapshot();tick(true);tick(true);tick(false,0);assert.deepEqual(g.snapshot(),gate,'rewinding across generation reproduces the exact gate');}
  {const {g,tick,input,rng}=harness(4,true);g.py=g.H-56;g.onGround=true;input.keys.Space=true;for(let i=0;i<27;i++)tick();
    const start={x:g.px,y:g.py-g.cam};for(let i=0;i<22;i++)tick(true);const beforeRng=rng();g.rewind.step(false,0);
    assert.equal(rng(),beforeRng,'echo creation consumes no RNG');assert.ok(g.echo);assert.equal(g.echo.x,start.x-32);assert.equal(g.echo.y,start.y+24);assert.equal(g.echo.w,64);assert.equal(g.echo.life,4);
    const echo=g.echo,s=g.snapshot();assert.ok(!('echo' in s));g.restore(s);assert.equal(g.echo,echo);assert.deepEqual(g.snapshot(),s);
    for(let i=0;i<12;i++)tick();const life=g.echo.life;for(let i=0;i<8;i++)tick(true);assert.equal(g.echo,echo);assert.equal(g.echo.life,life);g.rewind.step(false,0);assert.equal(g.echo,echo,'short rewind does not replace echo');
    // An upward pass never lands; a descending feet crossing does.
    g.plats=[];g.nextTimeGate=Infinity;g.px=echo.x+32;g.py=echo.y+g.cam;g.vy=-200;g.onGround=false;g.step(1/60);assert.equal(g.onGround,false);
    g.py=echo.y+g.cam-17;g.vy=200;g.step(1/60);assert.equal(g.onGround,true);
    g.echo.life=.01;g.step(.02);assert.equal(g.echo,null);g.echo=echo;g.reset();assert.equal(g.echo,null);assert.equal(g.echoRewind,null);
  }
  {const {g,tick}=harness(9,true);g.plats=[];g.py=180;g.vy=0;g.shield=0;g.onGround=false;for(let i=0;i<30;i++)tick();const low=g.py-g.cam;
    for(let i=0;i<22;i++)tick(true);g.rewind.step(false,0);assert.ok(g.py-g.cam<low);assert.equal(g.echo,null,'fall rescue cannot produce echo');}
  {const {g,ne,storage}=harness(5,true);g.configureRound({daily:'2026-11-26'});assert.equal(g.timeGaps,false);assert.equal(g.unranked,false);g.configureRound({});assert.equal(g.timeGaps,true);ne.skyhopTimeGaps.set(false);assert.equal(g.timeGaps,true,'toggle is fixed for current round');g.configureRound({});assert.equal(g.timeGaps,false);}
  console.log(JSON.stringify({classic:classic(),gates:400,seeds:200,withRewind:yes,withoutRewind:no,shieldCrossings,maxReach,minEnergy:energy}));
}
async function browserChecks(){
  const {chromium,webkit}=require('playwright'),serve=require('./server.cjs'),artifact=require('./artifacts.cjs');
  const f=serve();await new Promise(r=>f.app.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+f.app.address().port;
  const browser=await(process.env.WEBKIT?webkit:chromium).launch(process.env.WEBKIT?{}:{channel:'chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const out=artifact('skyhop-time-gaps/');fs.mkdirSync(out,{recursive:true});
  try{for(const bundle of ['web','dist'])for(const size of [{width:1280,height:900},{width:390,height:844},{width:844,height:390}]){
    const context=await browser.newContext({viewport:size,hasTouch:size.width!==1280,isMobile:size.width!==1280,serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(r.url().includes('/api/leaderboard'))requests.push(r.postData()||'');});
    await page.addInitScript(()=>{requestAnimationFrame=()=>0;cancelAnimationFrame=()=>{};});
    // A Sky Hop Daily fixture regardless of today's rotating game; server Daily rules are unchanged.
    await page.route('**/api/leaderboard',r=>{const body=r.request().postDataJSON();return body?.daily?r.fulfill({contentType:'application/json',body:JSON.stringify({token:'isolated-skyhop-daily',seed:'time-gaps-daily-test'})}):r.continue();});
    await page.goto(base+(bundle==='web'?'/':'/download/forkade.html'));await page.waitForFunction(()=>window.Forkade?.skyhopTimeGaps,null,{polling:50});
    const card=page.locator('.card[data-game=skyhop]');if(!await card.isVisible())await page.locator('#more-games').click();await card.click();
    const start=page.locator('#skyhop-start-time-gaps');assert.equal(await start.isChecked(),false);assert.equal(await page.evaluate(()=>Forkade.current()),null);assert.equal(requests.length,0,'opening start screen does not start a ranked round');
    const target=await start.boundingBox();assert.ok(target.width>=44&&target.height>=44);await start.check();await page.keyboard.press('Escape');assert.equal(await page.locator('#skyhop-start').isVisible(),false);
    await page.evaluate(()=>{Forkade.settings.mute=true;Forkade.openSettings();});assert.equal(await page.locator('#skyhop-time-gaps').isChecked(),true);await page.locator('#skyhop-time-gaps').uncheck();await page.locator('#close-settings').click();
    await card.click();assert.equal(await start.isChecked(),false,'Settings and start share one preference');await page.locator('#skyhop-start .x').click();
    await page.evaluate(()=>Forkade.openSettings());assert.equal(await page.locator('#skyhop-time-gaps').isChecked(),false);
    await page.locator('#skyhop-time-gaps').check();await page.screenshot({path:path.join(out,`${process.env.WEBKIT?'webkit':'chromium'}-${bundle}-${size.width}-toggle.png`)});
    await page.locator('#close-settings').click();await page.waitForTimeout(3200);await card.click();assert.equal(await start.isChecked(),true);await page.screenshot({path:path.join(out,`${process.env.WEBKIT?'webkit':'chromium'}-${bundle}-${size.width}-start.png`)});await page.locator('#skyhop-start-play').click();
    assert.equal(requests.length,0,'Time Gaps never requests a ranked token');
    const mode=await page.evaluate(()=>{const g=Forkade.current();Forkade.skyhopTimeGaps.set(false);return {enabled:g.timeGaps,run:Forkade.board.run,daily:Forkade.board.daily};});assert.deepEqual(mode,{enabled:true,run:null,daily:null});
    if(size.width!==1280){const r=await page.locator('[data-code=KeyR]').boundingBox();assert.ok(r&&r.width>=44&&r.height>=44,'visible 44px rewind target');const canvas=await page.locator('#game').boundingBox();assert.ok(r.y>=canvas.y+canvas.height,'rewind must stay below the play area');assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=size.width&&r.y+r.height<=size.height);await page.locator('[data-code=KeyR]').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',buttons:1});assert.equal(await page.evaluate(()=>!!Forkade.Input.keys.KeyR),true);await page.locator('[data-code=KeyR]').dispatchEvent('pointerup',{pointerId:1,pointerType:'touch'});}
    await page.evaluate(()=>{const g=Forkade.current();g.py=g.H-56;g.onGround=true;g.elapsed=15;g.hint=false;g.frame(document.getElementById('game').getContext('2d'),0);});
    assert.ok(await page.evaluate(()=>Forkade.current().timeGate));assert.equal(await page.evaluate(()=>typeof Forkade.current().rewind.frames.at(-1).rng),'number','unseeded beta starts a local rewindable RNG');await page.screenshot({path:path.join(out,`${process.env.WEBKIT?'webkit':'chromium'}-${bundle}-${size.width}-hint.png`)});
    const solved=await page.evaluate(()=>{const g=Forkade.current(),I=Forkade.Input,ctx=document.getElementById('game').getContext('2d');const a=g.plats.find(p=>p.timeGate&&p.y===g.timeGate.aY),b=g.plats.find(p=>p.gateExit);let phase=0,echoFrame=false;
      window.skyhopTestTick=()=>{const target=phase>=3?b.x+b.w/2:a.x+a.w/2;I.keys={Space:true,ArrowLeft:g.px>target+3,ArrowRight:g.px<target-3};I.pressed={};if(phase===0&&g.vy<0&&g.vy>=-55&&a.y-(g.py+16-g.cam)>130)phase=1;if(phase===1&&g.echoRewind?.duration>=.35)phase=2;I.keys.KeyR=phase===1;g.frame(ctx,1/60);if(phase===2&&g.onGround&&g.echo&&Math.abs(g.py+16-g.cam-g.echo.y)<.01)phase=3;return {echo:!!g.echo,cleared:g.timeGate.cleared};};
      for(let i=0;i<240;i++){const state=skyhopTestTick();if(state.echo)return state;}throw Error('no echo in real engine');});assert.equal(solved.echo,true);
    await page.screenshot({path:path.join(out,`${process.env.WEBKIT?'webkit':'chromium'}-${bundle}-${size.width}-echo.png`)});
    assert.equal(await page.evaluate(()=>{for(let i=0;i<240;i++)if(skyhopTestTick().cleared)return true;return false;}),true);
    const rewards=await page.evaluate(()=>{const g=Forkade.current(),ctx=document.getElementById('game').getContext('2d'),before=Forkade.rewards.cores(),badges=JSON.stringify(Forkade.rewards.badges());g.score=2000;g.state='over';g.frame(ctx,0);return {classic:Forkade.scores.get('skyhop'),beta:Forkade.scores.get('skyhop-time-gaps'),earned:Forkade.rewards.cores()-before,badges:JSON.stringify(Forkade.rewards.badges())===badges,last:Forkade.board.last.assisted};});
    assert.deepEqual({...rewards,earned:0},{classic:0,beta:2000,earned:0,badges:true,last:true});assert.ok(rewards.earned>0);
    await page.waitForTimeout(350);assert.equal(await page.locator('#pb-post').isVisible(),false);
    assert.equal(await page.evaluate(async()=>{try{await Forkade.board.post('Tester');return false;}catch(e){return /not ranked/.test(e.message);}}),true);
    await page.evaluate(()=>{Forkade.skyhopTimeGaps.set(true);requestGame('skyhop',{seed:'time-gaps-daily-test',daily:'2026-11-26'});});assert.equal(await page.locator('#skyhop-start').isVisible(),false,'Daily bypasses mode selection');assert.equal(await page.evaluate(()=>Forkade.current().timeGaps),false);assert.equal(await page.evaluate(()=>Forkade.board.assisted),false);
    await page.waitForFunction(()=>Forkade.current().state==='play',null,{polling:50});assert.ok(requests.length>0,'classic Daily still starts its normal token');
    assert.deepEqual(errors,[],bundle+' '+size.width);await context.close();console.log('Time Gaps browser',process.env.WEBKIT?'WebKit':'Chromium',bundle,size.width,'passed');
  }
  const playground=await browser.newPage(),errors=[];playground.on('pageerror',e=>errors.push(e.message));
  await playground.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:'{"seed":"playground-test"}'}));
  await playground.goto(base+'/playground.html');await playground.locator('#run').click();
  await playground.waitForFunction(()=>Forkade.current()?.state==='play');
  const time=await playground.evaluate(()=>Forkade.current().t);
  await playground.waitForFunction(t=>Forkade.current().t>t&&Forkade.current().drops.length>0,time,{timeout:5000});assert.deepEqual(errors,[]);
  await playground.close();
  }finally{await browser.close();f.app.close();f.restore();}
}
module.exports={harness,classic,gateRun};
if(require.main===module){(async()=>{simulation();if(!process.env.SKYHOP_SIM_ONLY)await browserChecks();})().catch(e=>{console.error(e);process.exitCode=1;});}
