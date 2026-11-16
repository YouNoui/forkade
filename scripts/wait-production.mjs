// GitHub's Vercel commit status is emitted for production builds even when
// no deployment_status event is emitted. Wait for this exact production SHA.
const {GITHUB_REPOSITORY:repo,GITHUB_SHA:sha,GH_TOKEN:token}=process.env;
if(!repo||!sha||!token)throw Error('Missing workflow context');
let ready=false;
for(let attempt=0;attempt<90;attempt++){
 const r=await fetch('https://api.github.com/repos/'+repo+'/commits/'+sha+'/status',{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Commit status HTTP '+r.status);
 const data=await r.json();const deployment=data.statuses.find(s=>s.context==='Vercel');
 if(deployment?.state==='success'){ready=true;break}
 if(['error','failure'].includes(deployment?.state))throw Error('Production deployment did not succeed');
 await new Promise(resolve=>setTimeout(resolve,10000));
}
if(!ready)throw Error('Production deployment wait timed out');
console.log('Production deployment succeeded for '+sha);
