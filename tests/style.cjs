// UI contract and comparable before/after evidence. Never writes production API data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),serve=require('./server.cjs');
const baseline=process.env.STYLE_BASELINE==='1',phase=process.env.STYLE_PHASE||(baseline?'before':'after');
const out=process.env.STYLE_OUT||require('./artifacts.cjs')('style');
function inspect(){
 const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden],[inert]');};
 const fonts=new Set(),radii=new Set(),buttons=new Set(),spacing=new Set(),fail=[];
 const label=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'.'+String(e.className).split(' ').slice(0,2).join('.'));
 const near=(v,n)=>Math.abs(v-n)<.05;
 for(const e of document.body.querySelectorAll('*')){
  if(!visible(e)||['SCRIPT','STYLE','SVG','PATH'].includes(e.tagName))continue;
  const s=getComputedStyle(e),r=e.getBoundingClientRect(),id=label(e);
  if([...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||e.matches('input,select,textarea')){fonts.add(s.fontSize);if(!['400','700','900'].includes(s.fontWeight))fail.push(id+' weight '+s.fontWeight);if(![12,14,16,20,24,32].some(n=>near(parseFloat(s.fontSize),n)))fail.push(id+' font '+s.fontSize);}
  for(const prop of ['borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius']){const v=s[prop];if(parseFloat(v)){radii.add(v);if(![8,12,16,999].some(n=>near(parseFloat(v),n))&&!(v==='50%'&&near(r.width,r.height)))fail.push(id+' radius '+v);}}
  for(const prop of ['paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','rowGap','columnGap']){
   const v=s[prop];if(!v.endsWith('px'))continue;
   // Auto margins are geometry (centering/flex), not authored spacing. Inspect their specified value.
   if(prop.startsWith('margin')&&e.computedStyleMap?.().get(prop.replace(/[A-Z]/g,x=>'-'+x.toLowerCase()))?.toString()==='auto')continue;
   const n=parseFloat(v);if(!near(n/4,Math.round(n/4))){spacing.add(v);fail.push(id+' '+prop+' '+v);}
  }
  const control=e.closest('button,a[href],[role=button]');if(control&&getComputedStyle(e).webkitLineClamp==='none'){const bounds=control.getBoundingClientRect();for(const n of e.childNodes){if(n.nodeType!==3||!n.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(n);for(const t of range.getClientRects())if(t.left<bounds.left-1||t.right>bounds.right+1||t.top<bounds.top-1||t.bottom>bounds.bottom+1)fail.push(label(control)+' clipped text');}}
  if(e.matches('button,a[href],input:not([type=hidden]),select,textarea,summary,[role=button]')){
   if(r.width<43.9||r.height<43.9)fail.push(id+' hit '+r.width.toFixed(1)+'x'+r.height.toFixed(1));
   if(e.matches('button,.btn'))buttons.add([s.fontSize,s.fontWeight,s.borderRadius,s.padding,s.minHeight].join('|'));
  }
  if(r.right>innerWidth+.5&&s.position!=='fixed'&&!e.closest('pre,textarea'))fail.push(id+' overflow '+r.right.toFixed(1));
 }
 const pops=[...document.querySelectorAll('.btn-pop')].filter(e=>visible(e)&&e.getBoundingClientRect().bottom>0&&e.getBoundingClientRect().top<innerHeight);
 if(pops.length>1)fail.push('Multiple primary actions: '+pops.map(label));
 if(document.documentElement.scrollWidth>innerWidth)fail.push('Document horizontal overflow');
 return {fonts:[...fonts].sort(),radii:[...radii].sort(),offGrid:[...spacing].sort(),buttonStyles:[...buttons].sort(),fail:[...new Set(fail)]};
}
(async()=>{fs.mkdirSync(out,{recursive:true});const f=serve();await new Promise(r=>f.app.listen(0,'127.0.0.1',r));const base=process.env.CHECK_URL||'http://127.0.0.1:'+f.app.address().port;const browser=await chromium.launch({channel:'chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[];
 try{for(const width of [390,1280]){const c=await browser.newContext({viewport:{width,height:844},hasTouch:width===390,isMobile:width===390,serviceWorkers:'block',reducedMotion:'reduce',extraHTTPHeaders:{DNT:'1'}});
 try{for(const scene of (process.env.STYLE_SCENES?process.env.STYLE_SCENES.split(','):['home','game-over','locker','settings','rankings','rumble','rumble-play','echo3d','rampage','fair','admin','playground','delete','privacy','terms','guidelines'])){
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.route('**/api/**',r=>r.fulfill({contentType:'application/json',body:'{"rows":[],"entries":[]}'}));
 const routes={fair:'/fair.html',admin:'/admin',playground:'/playground.html',delete:'/delete.html',privacy:'/privacy.html',terms:'/terms.html',guidelines:'/guidelines.html'};
 await p.goto(base+(routes[scene]||'/'));if(!routes[scene])await p.waitForFunction(()=>window.Forkade);
 if(scene==='game-over'){await p.evaluate(()=>openGame('glass'));await p.waitForFunction(()=>Forkade.current()?.id==='glass' && Forkade.current().state==='play');await p.evaluate(()=>{const g=Forkade.current();g.score=100;g.state='over';});await p.locator('#postbar').waitFor({state:'visible'});}
 if(scene==='locker')await p.locator('#open-locker').click();
 if(scene==='settings')await p.evaluate(()=>Forkade.openSettings());
 if(scene==='rankings')await p.locator('#open-ranks').click();
 if(['rumble','rumble-play','echo3d','rampage'].includes(scene)){await p.evaluate(id=>open3D(id),scene==='rumble-play'?'rumble':scene);if(scene.startsWith('rumble')){await p.frameLocator('#gframe').locator('#hero-menu').waitFor();if(scene==='rumble-play'){await p.frameLocator('#gframe').locator('#start').click();await p.frameLocator('#gframe').locator('#sheet').waitFor({state:'hidden'});}}else await p.frameLocator('#gframe').locator('#back').waitFor();}
 await p.waitForTimeout(scene==='home'?4000:500);await p.screenshot({path:path.join(out,phase+'-'+width+'-'+scene+'.png'),fullPage:!['game-over','rumble','rumble-play','echo3d','rampage','locker','settings','rankings'].includes(scene)});
 const surface=['rumble','rumble-play','echo3d','rampage'].includes(scene)?await(await p.locator('#gframe').elementHandle()).contentFrame():p;const metrics=await surface.evaluate(inspect);results.push({width,scene,...metrics,errors});console.log(width,scene,metrics.fail.length+' style violations',errors.length+' errors');await p.close();
 }}finally{await c.close();}}}finally{await browser.close();f.app.close();f.restore();}
 fs.writeFileSync(path.join(out,phase+'-metrics.json'),JSON.stringify(results,null,2));if(!baseline){const bad=results.filter(r=>r.fail.length||r.errors.length);assert.deepEqual(bad.map(r=>({width:r.width,scene:r.scene,fail:r.fail,errors:r.errors})),[]);}
})().catch(e=>{console.error(e);process.exitCode=1;});
