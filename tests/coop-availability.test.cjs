const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('web/games3d/rumble-coop.js','utf8');
function fixture(fetch){
 const elements=new Map(),document={getElementById:id=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:''});return elements.get(id);}},window={},parent={location:{protocol:'https:',hostname:'playforkade.com'},ForkadeCoopCode:'ABCDEF'};
 new Function('window','document','parent','location','fetch','setTimeout','clearTimeout','addEventListener',source)(window,document,parent,{protocol:'https:'},fetch,(fn,ms)=>setTimeout(fn,Math.min(ms,10)),clearTimeout,()=>{});
 const game={solo(){},disconnected(){}};return {coop:new window.RumbleCoop(game),elements,parent};
}
test('availability coalesces checks and distinguishes invalid responses from disabled',async()=>{
 let count=0,enabled=null;const {coop,elements}=fixture(async()=>{count++;return {ok:true,json:async()=>enabled===null?{}:{enabled}};});
 const first=coop.check();assert.equal(coop.check(),first);await first;assert.equal(count,4);assert.equal(elements.get('coop-retry').hidden,false);assert.match(elements.get('coop-status').textContent,/Couldn't reach/);
 enabled=false;count=0;await coop.check();assert.equal(count,1);assert.match(elements.get('coop-status').textContent,/resting/);assert.equal(elements.get('coop-retry').hidden,true);
 enabled=true;await coop.check();assert.equal(elements.get('coop-join').hidden,false);
});
test('leaving cancels a pending availability probe and prevents stale UI updates',async()=>{
 let resolve,signal;const {coop,elements}=fixture((url,options)=>{signal=options.signal;return new Promise(r=>resolve=r);});const pending=coop.check();coop.close();assert.equal(signal.aborted,true);
 resolve({ok:true,json:async()=>({enabled:true})});await pending;assert.equal(elements.get('coop-join').hidden,true);assert.equal(elements.get('coop-retry').hidden,true);assert.equal(coop.checking,null);
});
test('an HTTP failure is retried even if its body says disabled',async()=>{
 let count=0;const {coop,elements}=fixture(async()=>({ok:++count>1,json:async()=>({enabled:count>1})}));await coop.check();assert.equal(count,2);assert.equal(elements.get('coop-join').hidden,false);assert.doesNotMatch(elements.get('coop-status').textContent,/resting/);
});
