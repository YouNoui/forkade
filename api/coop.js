'use strict';
const Security=require('../lib/security'),redis=require('./leaderboard').redis;
module.exports=async(req,res)=>{const send=(status,data)=>{res.statusCode=status;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
 try{if(!['GET','POST'].includes(req.method))return send(405,{error:'Method not allowed.'});const auth=await Security.owner(req,redis());if(auth!==200)return send(auth,{error:'Owner key required.'});
  if(!process.env.COOP_SECRET)return send(503,{error:'Co-op owner control is unavailable.'});let body;
  if(req.method==='POST'){const b=await Security.body(req,64);if(Object.keys(b).join()!=='enabled'||typeof b.enabled!=='boolean')return send(400,{error:'Choose enabled or disabled.'});body=JSON.stringify(b);}
  const r=await fetch('https://forkade-coop.breek.workers.dev/admin',{method:req.method,headers:{'X-Coop-Key':process.env.COOP_SECRET,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(5000)});return send(r.status,await r.json());
 }catch(e){return send(e.status||503,{error:e.status?e.message:'Co-op control is unavailable. Try again.'});}
};
