const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
const {chromium,webkit}=require('playwright');
(async()=>{for(const [name,type]of [['chromium',chromium],['webkit',webkit]]){
 const b=await type.launch({...(name==='chromium'?{channel:'chromium',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});
 try{const c=await b.newContext({offline:true}),p=await c.newPage(),errors=[],network=[];
 p.on('requestfailed',r=>console.log('offline request failure',r.url(),r.failure()?.errorText));p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 await p.goto(pathToFileURL(path.resolve('dist/forkade.html')).href);await p.waitForFunction(()=>window.Forkade);
 await p.evaluate(()=>openGame('skyhop'));await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>Forkade.current().id),'skyhop');await p.evaluate(()=>Forkade.stop());
 for(const id of ['echo3d','rampage','rumble']){await p.evaluate(id=>open3D(id),id);await p.frameLocator('#gframe').locator('canvas').waitFor({state:'visible'});await p.evaluate(()=>closeStage());}
 assert.deepEqual(network,[]);assert.deepEqual(errors,[]);console.log(name+': file:// offline 2D + all three 3D games; zero network requests or console errors');
 }finally{await b.close();}
}})().catch(e=>{console.error(e);process.exitCode=1;});
