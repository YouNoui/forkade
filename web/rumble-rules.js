/* Shared, closed preset vocabulary: no free-text names or executable Forge content. */
(function(root,f){if(typeof module==='object'&&module.exports)module.exports=f();else root.RumbleRules=f();})(globalThis,()=>{
 const stages=['climb','brawl','smash','glass','tower','snake','match'];
 const limits={body:5,head:5,visor:3,colour:7,trail:5,pose:5,hat:5,moustache:2,cape:2};
 const first=['Sunny','Bouncy','Mint','Toast','Cloud','Neon'],last=['Duck','Bean','Wisp','Puff','Echo','Star'];
 const names=['Lava','Cloud','Mint','Neon','Toast','Crystal'],ends=['Garden','Parade','Rumble','City','Carnival','Circuit'];
 const defaults={stages:['climb','brawl','smash'],chaos:true,gravity:1,speed:1,size:1,enemies:12,palette:0,timer:20,nameA:0,nameB:0};
 function config(x){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!Object.hasOwn(defaults,k)))throw Error('Use the Forge presets.');const c={...defaults,...x};if(!Array.isArray(c.stages)||c.stages.length!==3||c.stages.some(s=>!stages.includes(s)))throw Error('Pick three stages.');if(typeof c.chaos!=='boolean')throw Error('Invalid chaos option.');for(const[k,min,max,step]of[['gravity',.6,1.4,.1],['speed',.7,1.3,.1],['size',.7,1.3,.1],['enemies',4,16,1],['palette',0,3,1],['timer',15,30,1],['nameA',0,5,1],['nameB',0,5,1]])if(!Number.isFinite(c[k])||c[k]<min||c[k]>max||Math.abs(c[k]/step-Math.round(c[k]/step))>.00001)throw Error('Invalid '+k+' preset.');return {...c,stages:c.stages.slice()};}
 function look(x={}){if(!x||typeof x!=='object'||Object.keys(x).some(k=>!Object.hasOwn(limits,k)))throw Error('Invalid avatar.');const a={};for(const k in limits){a[k]=x[k]??0;if(!Number.isInteger(a[k])||a[k]<0||a[k]>limits[k])throw Error('Invalid avatar part.');}return a;}
 const nickname=(a,b)=>{if(!Number.isInteger(a)||!Number.isInteger(b)||!first[a]||!last[b])throw Error('Pick a preset nickname.');return first[a]+last[b];};
 return {stages,limits,first,last,names,ends,defaults,config,look,nickname,forgeName:c=>names[c.nameA]+' '+ends[c.nameB],maxBytes:262144,maxOps:12000,replayVersion:2,ghosts:3,forgeDays:90};
});
