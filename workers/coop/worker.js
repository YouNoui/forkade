import {DurableObject} from 'cloudflare:workers';
import Rules from '../../web/rumble-rules.js';
import V2 from '../../web/games3d/rumble-v2-core.js';
import IP from '../../lib/trusted-ip.cjs';

export const LIMITS={rooms:500,messages:5000000,players:4,idle:1800000,bytes:256,hz:20};
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',codePattern=/^[A-HJ-NP-Z2-9]{6}$/;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const resting=()=>json({error:'Co-op is resting, play solo.',enabled:false},503);
const day=()=>new Date(Date.now()+28800000).toISOString().slice(0,10);
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===keys.sort().join(',');
export function allowedOrigin(origin,env){return origin==='https://playforkade.com'||/^https:\/\/forkade(?:-[a-z0-9-]+)?-younesnoui-5231s-projects\.vercel\.app$/.test(origin||'')||(env.LOCAL_TEST==='true'&&/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin||''));}
export function validInput(m){return exact(m,['t','v'])&&m.t==='input'&&Array.isArray(m.v)&&m.v.length===12&&m.v.every((n,i)=>Number.isFinite(n)&&(i===0||i===1||i===3||i===4?Math.abs(n)<=1:Number.isInteger(n)&&n>=0&&n<=(i===7?5:i===11?3:1)));}
const idleInput=[0,0,0,0,0,1,0,0,0,0,0,0];
function raw(v){return {x:v[0],z:v[1],jump:!!v[2],ax:v[3],az:v[4],fire:!!v[5],emote:!!v[6],emoteKind:v[7],super:!!v[8],gadget:!!v[9],dash:!!v[10],choice:v[11]};}
const random=()=>crypto.getRandomValues(new Uint32Array(1))[0];
const makeCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>alphabet[n%alphabet.length]).join('');
async function network(req,env){const ip=IP.trustedIP(req.headers,'cloudflare',s=>/^[0-9a-f:.]{3,45}$/i.test(s));const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.COOP_SECRET+'|'+day()+'|'+ip));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
async function authorized(req,env){const actual=req.headers.get('X-Coop-Key')||'';if(!env.COOP_SECRET||actual.length>256)return false;const digest=s=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));const [a,b]=await Promise.all([digest(actual),digest(env.COOP_SECRET)]);return crypto.subtle.timingSafeEqual(a,b);}
export default {async fetch(req,env){
 const url=new URL(req.url),origin=req.headers.get('Origin'),budget=env.BUDGET.getByName('global');let response;
 try{
  if(url.pathname==='/admin'){
   if(!await authorized(req,env))return json({error:'Unauthorized'},401);
   if(req.method==='GET')return json(await budget.status());
   if(req.method!=='POST'||Number(req.headers.get('Content-Length'))>64)return json({error:'Invalid request'},400);
   const text=await req.text();if(text.length>64)return json({error:'Invalid request'},400);const b=JSON.parse(text);
   return exact(b,['enabled'])&&typeof b.enabled==='boolean'?json(await budget.toggle(b.enabled)):json({error:'Invalid request'},400);
  }
  if(!allowedOrigin(origin,env))return json({error:'Origin not allowed'},403);
  if(req.method==='OPTIONS')response=new Response(null,{status:204});
  else if(url.pathname==='/status'&&req.method==='GET')response=json({...await budget.status(),enabled:env.COOP_ENABLED==='true'&&(await budget.status()).enabled});
  else if(env.COOP_ENABLED!=='true'||!env.COOP_SECRET)response=resting();
  else if(url.pathname==='/rooms'&&req.method==='POST'){
   if(!await budget.attempt(await network(req,env)))response=json({error:'Too many attempts. Try again in a minute, or play solo.'},429);
   else if(!await budget.reserve(true,0))response=resting();
   else {let code;for(let i=0;i<5;i++){code=makeCode();if(await env.ROOMS.getByName(code).create(code)){response=json({code});break;}}response||=resting();}
  }else if(url.pathname.startsWith('/rooms/')&&req.method==='GET'&&req.headers.get('Upgrade')?.toLowerCase()==='websocket'){
   const code=url.pathname.slice(7);
   if(!await budget.attempt(await network(req,env)))response=json({error:'Too many attempts. Try again in a minute, or play solo.'},429);
   else if(!codePattern.test(code))response=json({error:'Room expired or not found. Play solo.'},404);
   else if(!(await budget.status()).enabled)response=resting();
   else return env.ROOMS.getByName(code).fetch(req);
  }else response=json({error:'Not found'},404);
 }catch{response=json({error:'Co-op is unavailable. Play solo.'},503);}
 const headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');headers.set('Access-Control-Allow-Headers','Content-Type');
 return new Response(response.body,{status:response.status,headers});
}};

export class CoopBudget extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;ctx.blockConcurrencyWhile(async()=>{this.data=await ctx.storage.get('budget')||{day:day(),rooms:0,messages:0,enabled:true};this.rates=await ctx.storage.get('rates')||{};});}
 rollover(){if(this.data.day!==day())Object.assign(this.data,{day:day(),rooms:0,messages:0});}
 async status(){this.rollover();return {...this.data,enabled:this.data.enabled&&this.data.messages<LIMITS.messages,limits:{rooms:LIMITS.rooms,messages:LIMITS.messages}};}
 async toggle(enabled){this.data.enabled=enabled;await this.ctx.storage.put('budget',this.data);return this.status();}
 async reserve(room,count){this.rollover();if(!this.data.enabled||room&&this.data.rooms>=LIMITS.rooms||this.data.messages+count>LIMITS.messages)return false;if(room)this.data.rooms++;this.data.messages+=count;await this.ctx.storage.put('budget',this.data);return true;}
 async attempt(key){const now=Date.now();for(const k in this.rates)if(this.rates[k].until<=now)delete this.rates[k];if(!this.rates[key]&&Object.keys(this.rates).length>=2000)return false;const r=this.rates[key]||={n:0,until:now+60000};r.n++;await this.ctx.storage.put('rates',this.rates);await this.ctx.storage.setAlarm(Math.min(...Object.values(this.rates).map(r=>r.until)));return r.n<=10;}
 async alarm(){const now=Date.now();for(const k in this.rates)if(this.rates[k].until<=now)delete this.rates[k];if(Object.keys(this.rates).length){await this.ctx.storage.put('rates',this.rates);await this.ctx.storage.setAlarm(Math.min(...Object.values(this.rates).map(r=>r.until)));}else await this.ctx.storage.delete('rates');}
}

export class CoopRoom extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env;ctx.blockConcurrencyWhile(async()=>{this.room=await ctx.storage.get('room');if(this.room){this.run=new V2.Run(this.room.seed);this.run.restore(this.room.snapshot);}this.lastTick=Date.now();});}
 async create(code){if(this.room)return false;this.run=new V2.Run(random());this.room={code,seed:this.run.seed,last:Date.now(),next:0,credit:0,creditDay:day(),checked:0,actors:{},snapshot:this.run.snapshot()};await this.save();await this.ctx.storage.setAlarm(this.room.last+LIMITS.idle);return true;}
 async save(){this.room.snapshot=this.run.snapshot();await this.ctx.storage.put('room',this.room);}
 sockets(){return this.ctx.getWebSockets().filter(w=>w.readyState===1);}
 async permit(n){const b=this.env.BUDGET.getByName('global');if(Date.now()-this.room.checked>=1000){this.room.checked=Date.now();if(this.env.COOP_ENABLED!=='true'||!(await b.status()).enabled){this.closeAll(4003,'Co-op is resting, play solo.');return false;}}
  if(this.room.creditDay!==day()){this.room.credit=0;this.room.creditDay=day();}
  if(this.room.credit<n){if(!await b.reserve(false,256)){this.closeAll(4003,'Co-op is resting, play solo.');return false;}this.room.credit+=256;}
  this.room.credit-=n;await this.ctx.storage.put('room',this.room);return true;
 }
 async fetch(req){
  if(!this.room||Date.now()-this.room.last>=LIMITS.idle)return json({error:'Room expired. Play solo.'},410);
  if(this.sockets().length>=LIMITS.players)return json({error:'Room is full. Play solo.'},409);
  if(!await this.permit(5))return resting();
  if(this.sockets().length>=LIMITS.players)return json({error:"Room is full. Play solo."},409);
  const pair=new WebSocketPair(),client=pair[0],ws=pair[1],slot=Array.from({length:4},(_,i)=>i).find(i=>!this.sockets().some(w=>w.deserializeAttachment()?.slot===i));
  const name=Rules.nickname(slot,random()%Rules.last.length);this.ctx.acceptWebSocket(ws);ws.serializeAttachment({slot,name,last:0,window:0,count:0,input:idleInput});
  const actor=structuredClone(this.run.s.player);Object.assign(actor,{x:(slot-1.5)*2,z:7});this.room.actors[slot]=actor;this.room.last=Date.now();
  ws.send(JSON.stringify({t:'joined',slot,name,code:this.room.code,seed:this.room.seed}));await this.broadcast();await this.save();return new Response(null,{status:101,webSocket:client});
 }
 async webSocketMessage(ws,text){
  if(!this.room)return ws.close(4004,'Room expired. Play solo.');
  const a=ws.deserializeAttachment(),now=Date.now();if(!a)return ws.close(1008,'Invalid session');
  a.recent=(a.recent||[]).filter(t=>now-t<1000);a.recent.push(now);ws.serializeAttachment(a);
  if(a.recent.length>20)return ws.close(4008,'Too many messages. Play solo.');
  if(!await this.permit(1))return;
  if(typeof text!=='string'||new TextEncoder().encode(text).length>LIMITS.bytes)return;
  let m;try{m=JSON.parse(text);}catch{return;}
  if(exact(m,['t'])&&m.t==='leave'){ws.close(1000,'Left room');return this.leave(ws);}
  if(!validInput(m))return;
  a.input=m.v;a.last=now;ws.serializeAttachment(a);this.room.last=now;
  // Input-driven fixed steps: no timers or charged idle compute. Clamp catch-up to 100ms.
  const steps=Math.min(6,Math.floor((now-this.lastTick)/(1000/60)));
  if(steps>=3){this.lastTick=now;const peers=this.sockets().map(w=>w.deserializeAttachment()).sort((a,b)=>a.slot-b.slot);
   if(peers.length>=2&&!this.run.s.done)for(let i=0;i<steps;i++){
    const leader=peers[0],stage=this.run.s.stage;this.run.s.player=this.room.actors[leader.slot];this.run.s.echoes=[];this.run.s.logs=[];
    this.run.step(raw(now-leader.last<300?leader.input:idleInput));this.room.actors[leader.slot]=this.run.s.player;
    for(const p of peers.slice(1)){if(stage!==this.run.s.stage)this.room.actors[p.slot]=structuredClone(this.run.s.player);this.run.move(this.room.actors[p.slot],now-p.last<300?p.input:idleInput);if(this.room.actors[p.slot].hp<=0)this.run.actor(this.room.actors[p.slot]);}
    this.run.s.log=[];if(this.run.s.offer)this.run.step({choice:1});
   }
   await this.broadcast();await this.save();
  }
 }
 async broadcast(){if(Date.now()-(this.room.broadcast||0)<34)return;this.room.broadcast=Date.now();const sockets=this.sockets();if(!await this.permit(sockets.length))return;const players=sockets.map(w=>{const a=w.deserializeAttachment();return {slot:a.slot,name:a.name,actor:this.room.actors[a.slot]};});const s={...this.run.s,logs:[],log:[],echoes:[]};const packet=JSON.stringify({t:'state',seed:this.room.seed,s,players});for(const ws of sockets)try{ws.send(packet);}catch{} }
 async leave(ws){const a=ws.deserializeAttachment();if(a&&this.room){if(!this.sockets().some(w=>w.deserializeAttachment()?.slot===a.slot))delete this.room.actors[a.slot];await this.broadcast();await this.save();}}
 async webSocketClose(ws,code){try{ws.close(code===1000?1000:1001);}catch{}await this.leave(ws);}
 async webSocketError(ws){try{ws.close(1011,'Connection lost');}catch{}await this.leave(ws);}
 closeAll(code,reason){for(const ws of this.sockets())ws.close(code,reason);}
 async alarm(){if(this.room&&Date.now()<this.room.last+LIMITS.idle){await this.ctx.storage.setAlarm(this.room.last+LIMITS.idle);return;}this.closeAll(4004,'Room expired. Play solo.');this.room=null;this.run=null;await this.ctx.storage.deleteAll();}
}
