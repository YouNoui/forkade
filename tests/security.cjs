// Attacks are confined to the in-memory/local fixture. No hosted URL is accepted.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const {Redis,request}=require('./redis.cjs'),LB=require('../api/leaderboard'),promo=require('../api/promo'),forge=require('../api/forge'),stats=require('../api/stats'),ghosts=require('../api/rumble'),S=require('../lib/security'),Rules=require('../web/rumble-rules');
const owner='local-security-owner-'.repeat(3),pid='a'.repeat(32),other='b'.repeat(32),fuzz=[-1,0,Infinity,NaN,'1e3','words',[],{},'x'.repeat(300001)];
async function api(){const db=new Redis(),restore=db.install(),clock=Date.now;let now=clock(),address=1;Date.now=()=>now;process.env.STATS_KEY=owner;process.env.PROMO_SALT='isolated-security-promo-salt';
 const call=(fn,method,body={},url='/api/leaderboard',headers={})=>request(fn,method,body,url,{'x-real-ip':'192.0.2.'+(address++%250+1),...headers});
 const auth={'x-stats-key':owner},seedKey=t=>'run:'+crypto.createHash('sha256').update(t).digest('hex');
 const start=async game=>{const r=await call(LB,'POST',{action:'start',game});assert.equal(r.status,200);return r.body;};
 const age=(token,seconds)=>{const k=seedKey(token),r=JSON.parse(db.get(k));r.at-=seconds*1000;db.run(['SET',k,JSON.stringify(r),'EX','7200']);};
 const publicOnly=b=>{assert.ok(!JSON.stringify(b).includes(pid));const walk=v=>{if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){assert.ok(!['pid','owner'].includes(k),'private field '+k);walk(x);}};walk(b);};
 try{
  // 1, 8, 9: every owner operation, header only; shared, expiring wrong-key counter.
  const endpoints=[[stats,'GET',{},'/api/stats'],...[ 'list','create','delete','enable','generate'].map(action=>[promo,'POST',{action,code:'ABCDEF'},'/api/promo']),...[ 'list','hide','remove','dismiss','approve-score','reject-score'].map(doAction=>[LB,'POST',{action:'moderate',do:doAction}]),...['list','hide','dismiss'].map(doAction=>[forge,'POST',{action:'moderate',do:doAction},'/api/forge'])];
  for(const[fn,method,body,url='/api/leaderboard']of endpoints)for(const wrong of [{},{'x-stats-key':'wrong'}]){assert.equal((await call(fn,method,{...body,key:owner,role:'admin',admin:true,owner:true,isOwner:true},url+'?key='+owner,wrong)).status,401);}
  const fixed={'x-real-ip':'198.51.100.10','x-forwarded-for':'spoof'};for(let i=0;i<5;i++)assert.equal((await call(stats,'GET',{},'/api/stats',fixed)).status,401);assert.equal((await call(promo,'POST',{action:'list'},'/api/promo',fixed)).status,429);assert.equal((await call(forge,'POST',{action:'moderate',do:'list'},'/api/forge',fixed)).status,429);assert.equal((await call(stats,'GET',{},'/api/stats',{...fixed,...auth})).status,200);now+=600001;assert.equal((await call(stats,'GET',{},'/api/stats',fixed)).status,401);
  assert.equal(S.ip({headers:{'x-real-ip':'203.0.113.1','x-forwarded-for':'evil'}}),'203.0.113.1');assert.equal(S.ip({headers:{'x-forwarded-for':'evil'},socket:{remoteAddress:'127.0.0.1'}}),'127.0.0.1');
  console.log('1/8/9: owner authorization, body/query impersonation, shared lockout and trusted IP passed');
  // 4: every ranked game, no token/seed, wrong seed, too fast and just-under-cap.
  for(const game of Object.keys(LB.CAPS)){now+=9000;
   const name=game.startsWith('rumble')?'SunnyDuck':'Tester';
   assert.equal((await call(LB,'POST',{game,pid,name,score:1})).status,400);
   // V2 options must bind the requested difficulty.
   const begin=async()=>{const options=game.startsWith('rumble-')?{difficulty:game==='rumble-nightmare'?'hard':game.slice(7),nightmare:game==='rumble-nightmare'}:undefined;const r=await call(LB,'POST',{action:'start',game,options});assert.equal(r.status,200);return r.body;};
   for(const variant of ['missing-seed','wrong-seed','fast','near-cap']){now+=9000;const run=await begin();if(variant.includes('seed'))age(run.token,10);const score=variant==='near-cap'?LB.CAPS[game]-1:variant==='fast'?Math.min(LB.CAPS[game],10000):1;const seed=variant==='missing-seed'?undefined:variant==='wrong-seed'?'wrong':run.seed;const r=await call(LB,'POST',{game,pid,name,score,token:run.token,seed});assert.equal(r.status,400,game+' '+variant);assert.equal(db.get(seedKey(run.token)),undefined,'rejected submission consumes token');now+=9000;assert.equal((await call(LB,'POST',{game,pid,name,score:1,token:run.token,seed:run.seed})).status,400,'reused '+game);}
  }
  now+=9000;let run=await start('skyhop');age(run.token,20);let posted=await call(LB,'POST',{game:'skyhop',pid,name:'Tester',score:100,token:run.token,seed:run.seed});assert.equal(posted.status,200);now+=9000;assert.equal((await call(LB,'POST',{game:'skyhop',pid,name:'Tester',score:100,token:run.token,seed:run.seed})).status,400);
  // Concurrent valid submissions consume one token, even across different player IDs.
  run=await start('skyhop');age(run.token,20);now+=9000;const concurrent=await Promise.all(Array.from({length:20},(_,i)=>call(LB,'POST',{game:'skyhop',pid:crypto.randomBytes(16).toString('hex'),name:'Tester',score:100,...run})));assert.equal(concurrent.filter(r=>r.status===200).length,1);
  console.log('4: every ranked game rejects missing/mismatched seed, missing/reused token and impossible speed');
  // 2: bearer player IDs are never in public responses; they are generated with 128 random bits.
  publicOnly((await call(LB,'GET',{},'/api/leaderboard?game=skyhop&pid='+pid)).body);
  const made=await call(forge,'POST',{action:'publish',pid,config:Rules.defaults},'/api/forge');assert.equal(made.status,200);publicOnly(made.body);publicOnly((await call(forge,'GET',{},'/api/forge?code='+made.body.code)).body);assert.equal((await call(forge,'POST',{action:'unpublish',pid:other,code:made.body.code},'/api/forge')).status,403);
  const friend='c'.repeat(24),date=require('../web/daily').date(),key='rumble:replay:'+date+':'+pid;db.run(['SET',key,JSON.stringify({score:100,v:3,seed:1,ops:[],look:{},name:'SunnyDuck',friend})]);db.run(['ZADD','lb:rumble:d:'+date,'100',pid]);db.run(['SET','rumble:friend:'+friend,JSON.stringify({key,pid,date,game:'rumble'})]);publicOnly((await call(ghosts,'GET',{},'/api/rumble')).body);publicOnly((await call(ghosts,'GET',{},'/api/rumble?friend='+friend)).body);
  assert.match(fs.readFileSync('web/engine.js','utf8'),/new Uint8Array\(16\); crypto.getRandomValues\(b\)/);
  console.log('2: rankings, Forge, replay/friend output contains no pid/owner; other device cannot unpublish');
  // 5/11/14: strict numeric types, closed key vocabulary and nickname allow-list.
  for(const value of fuzz){now+=9000;assert.ok([400,413].includes((await call(LB,'POST',{game:'skyhop',pid,name:'Tester',score:value})).status));assert.ok([400,413].includes((await call(LB,'POST',{action:'report',game:'skyhop',pid,rank:value})).status));
   for(const field of ['maxUses','expires']){const b={action:'create',code:'FUZZED',reward:{cores:1},maxUses:1,expires:0,note:'', [field]:value};if(field==='expires'&&value===0)continue;if(field==='maxUses'&&value===0)continue;assert.ok([400,413].includes((await call(promo,'POST',b,'/api/promo',auth)).status),field);}
   assert.ok([400,413].includes((await call(promo,'POST',{action:'create',code:'FUZZED',reward:{cores:value},maxUses:1,note:''},'/api/promo',auth)).status));
   for(const field of ['gravity','speed','size','enemies','timer'])assert.ok([400,413].includes((await call(forge,'POST',{action:'publish',pid,config:{...Rules.defaults,[field]:value}},'/api/forge')).status));
  }
  for(const days of ['-1','0','1e309','NaN','1e3','[]','{}','91','1.2'])assert.equal((await call(stats,'GET',{},'/api/stats?days='+encodeURIComponent(days),auth)).status,400);
  for(const game of ['__proto__','constructor','toString','skyhop:all',[],{},'x'.repeat(1000)]){assert.equal((await call(LB,'POST',{action:'start',game})).status,400);}
  for(const name of ['<img src=x onerror=alert(1)>','"><script>','javascript:','😀','ab\u202Ecd','ab\u200Bcd','A.B']){now+=9000;assert.equal((await call(LB,'POST',{game:'skyhop',pid,name,score:1})).status,400);}
  for(const fn of [LB,stats,forge,promo])assert.equal((await call(fn,'POST',{pad:'x'.repeat(300001)})).status,413);
  assert.throws(()=>Rules.config({...Rules.defaults,url:'https://attacker.invalid/x.js'}));
  console.log('5/11/12/14: numeric fuzz, body limits, key injection, unsafe names and remote Forge input rejected');
  // 7: 100 fresh device IDs cannot overrun maxUses; daily network cap survives ID resets.
  const create=async(code,maxUses)=>{const r=await call(promo,'POST',{action:'create',code,maxUses,reward:{cores:100},note:''},'/api/promo',auth);assert.equal(r.status,200);};
  await create('PARALLEL',10);const redeems=await Promise.all(Array.from({length:100},()=>call(promo,'POST',{action:'redeem',code:'PARALLEL',device:crypto.randomBytes(16).toString('hex')},'/api/promo')));assert.equal(redeems.filter(r=>r.status===200).length,10);
  await create('NETDAILY',0);const ip={'x-real-ip':'203.0.113.40'};for(let i=0;i<5;i++)assert.equal((await call(promo,'POST',{action:'redeem',code:'NETDAILY',device:crypto.randomBytes(16).toString('hex')},'/api/promo',ip)).status,200);now+=61000;assert.equal((await call(promo,'POST',{action:'redeem',code:'NETDAILY',device:crypto.randomBytes(16).toString('hex')},'/api/promo',{...ip,'x-forwarded-for':'different'})).status,429);
  assert.ok([...db.expiry].filter(([k])=>k.startsWith('promo:daily:')).every(([,t])=>t<=now+86400000));
  console.log('7: 100 concurrent redeems respect maxUses; five/code/network/day and spoof resistance passed');
 }finally{Date.now=clock;restore();}
}
function staticChecks(){
 const config=JSON.parse(fs.readFileSync('vercel.json'));for(const rule of config.headers)for(const h of rule.headers)if(h.key==='Content-Security-Policy'){const script=h.value.match(/script-src ([^;]+)/)[1];assert.ok(!script.includes("'unsafe-inline'"));assert.ok(script.includes("'sha256-"));}
 for(const route of ['/admin','/admin.html','/stats','/stats.html'])assert.ok(config.headers.some(r=>r.source===route&&r.headers.some(h=>h.key==='X-Robots-Tag'&&h.value.includes('noindex'))));
 for(const file of require('../tools/build_csp.cjs').files('web').filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');assert.ok(!/\son[a-z]+\s*=\s*["']/i.test(html),'HTML event attribute in '+file);}
 assert.deepEqual(fs.readdirSync('api').filter(x=>x.endsWith('.js')).sort(),['forge.js','leaderboard.js','promo.js','rumble.js','stats.js']);assert.match(fs.readFileSync('web/terms.html','utf8'),/no purchases/);assert.match(fs.readFileSync('SECURITY.md','utf8'),/no accounts, payments, AI integration or upload endpoint/);assert.match(fs.readFileSync('README.md','utf8'),/co-op is \*\*disabled/);assert.ok(!fs.existsSync('wrangler.toml')&&!fs.existsSync('wrangler.jsonc'));console.log('1/6/10/11/12: private-page robots, hashed CSP, no inline handlers/payments/AI/uploads; co-op disabled');
}
async function main(){await api();staticChecks();const found=require('../tools/scan_client.cjs').all();assert.deepEqual(found,[]);const {scan}=require('../tools/scan_client.cjs');assert.ok(scan('STATS_KEY').length);assert.ok(scan('"'+crypto.randomBytes(32).toString('hex')+'"').length);assert.ok(scan('"'+crypto.randomBytes(40).toString('base64url')+'"').length);require('node:child_process').execFileSync(process.execPath,['tools/build_csp.cjs','--check'],{stdio:'inherit'});console.log('3/13: built files contain no server configuration, known credentials or token literals');if(process.env.SECURITY_BROWSER==='1')await require('./security-browser.cjs')();if(process.env.SECURITY_REDIS==='1')await require('./security-redis.cjs')();console.log('Security attack suite passed (isolated fixtures only).');}
main().catch(e=>{console.error(e);process.exitCode=1;});
