import {env} from 'cloudflare:workers';
import {runInDurableObject,runDurableObjectAlarm} from 'cloudflare:test';
import {it,expect} from 'vitest';
import worker,{validInput,allowedOrigin,LIMITS} from '../../workers/coop/worker.js';
const origin='https://playforkade.com';let n=1;
const request=(path,options={})=>worker.fetch(new Request('https://worker.test'+path,{...options,headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.'+(n++),...options.headers}}),env);
const create=async()=>{const r=await request('/rooms',{method:'POST'});expect(r.status).toBe(200);return (await r.json()).code;};
const connect=async code=>{const r=await request('/rooms/'+code,{headers:{Upgrade:'websocket'}});expect(r.status).toBe(101);const ws=r.webSocket;ws.accept();return ws;};
const next=ws=>new Promise(resolve=>ws.addEventListener('message',e=>resolve(JSON.parse(e.data)),{once:true}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const input=JSON.stringify({t:'input',v:[1,0,0,0,0,1,1,2,0,0,0,0]});
it('2 and 4 sockets share real game state, emote, leave; full room rejected',async()=>{
 const code=await create(),all=[];for(let i=0;i<4;i++){const ws=await connect(code);all.push(ws);await wait(20);}
 expect((await request('/rooms/'+code,{headers:{Upgrade:'websocket'}})).status).toBe(409);
 let packets=[];all.forEach(ws=>ws.addEventListener('message',e=>packets.push(JSON.parse(e.data))));
 for(let i=0;i<5;i++){await wait(65);all.forEach(ws=>ws.send(input));}await wait(100);
 const states=packets.filter(p=>p.t==='state');expect(states.some(p=>p.players.length===4&&p.s.tick>0)).toBe(true);expect(states.some(p=>p.players.some(p=>p.actor.emote>0))).toBe(true);expect(JSON.stringify(states)).not.toMatch(/pid|owner|isolated-test-secret/);
 all[3].close();all[2].close();await wait(50);all[0].send(input);await wait(100);expect(packets.some(p=>p.players?.length===2)).toBe(true);all[0].close();all[1].close();
});
it('strict schemas, origin, invalid/free text and oversized packets; flood closes',async()=>{
 expect(allowedOrigin('https://evil.vercel.app',env)).toBe(false);expect(allowedOrigin('https://playforkade.com.evil.test',env)).toBe(false);
 expect((await request('/rooms',{method:'POST',headers:{Origin:'https://evil.test'}})).status).toBe(403);expect(validInput({t:'input',v:Array(12).fill(0),text:'hello'})).toBe(false);
 const code=await create(),a=await connect(code),b=await connect(code);let received=[];b.addEventListener('message',e=>received.push(e.data));await wait(60);
 a.send(JSON.stringify({t:'chat',text:'INJECTION'}));a.send(JSON.stringify({t:'input',v:Array(12).fill(0),text:'INJECTION'}));a.send('X'.repeat(1024));await wait(100);expect(received.join('')).not.toContain('INJECTION');
 const closed=new Promise(r=>a.addEventListener('close',r,{once:true}));for(let i=0;i<24;i++)a.send(input);expect((await closed).code).toBe(4008);b.close();
});
it('idle alarm wipes room, wrong joins are throttled, header-only owner auth',async()=>{
 const code=await create(),stub=env.ROOMS.getByName(code);await runInDurableObject(stub,async room=>{room.room.last=Date.now()-LIMITS.idle-1;await room.save();});await runDurableObjectAlarm(stub);
 expect((await request('/rooms/'+code,{headers:{Upgrade:'websocket'}})).status).toBe(410);
 for(let i=0;i<10;i++)await request('/rooms/XXXXXX',{headers:{Upgrade:'websocket','CF-Connecting-IP':'192.0.2.200'}});
 expect((await request('/rooms/XXXXXX',{headers:{Upgrade:'websocket','CF-Connecting-IP':'192.0.2.200','X-Forwarded-For':'1.2.3.4'}})).status).toBe(429);
 expect((await request('/admin?key=isolated-test-secret')).status).toBe(401);
 expect((await request('/admin',{headers:{'X-Coop-Key':'wrong'}})).status).toBe(401);
});
it('kill switch and hard room/message budgets, rollover, no production fixtures',async()=>{
 const b=env.BUDGET.getByName('global'),code=await create(),ws=await connect(code),closed=new Promise(r=>ws.addEventListener('close',r,{once:true}));await b.toggle(false);expect((await request('/rooms',{method:'POST'})).status).toBe(503);await wait(1100);ws.send(input);expect((await closed).code).toBe(4003);await b.toggle(true);
 await runInDurableObject(b,async obj=>{obj.data.messages=LIMITS.messages;await obj.ctx.storage.put('budget',obj.data);});expect(await b.reserve(false,1)).toBe(false);expect((await request('/status')).status).toBe(200);expect((await (await request('/status')).json()).enabled).toBe(false);
 await runInDurableObject(b,async obj=>{obj.data.messages=0;obj.data.rooms=LIMITS.rooms;await obj.ctx.storage.put('budget',obj.data);});expect(await b.reserve(true,0)).toBe(false);
 await runInDurableObject(b,async obj=>{obj.data.day='2020-01-01';await obj.ctx.storage.put('budget',obj.data);});expect(await b.reserve(true,1)).toBe(true);
});
