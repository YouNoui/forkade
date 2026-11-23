'use strict';
const assert=require('node:assert/strict'),Core=require('../web/games3d/rumble-v2-core'),Rules=require('../web/rumble-v2-rules'),Replay=require('../web/rumble-v2-replay');
for(const hero of Object.keys(Rules.heroes)){
 const run=new Core.Run(42,null,{hero}),a=run.s.player;
 run.s.objects=[{type:'drone',role:'tank',x:0,z:5,hp:100,maxHp:100,cool:999}];
 run.step({fire:true});assert.ok(run.s.objects[0].hp<100,hero+' basic');assert.ok(a.charge>0);
 a.charge=100;run.step({super:true,fire:false});assert.equal(run.s.superCount,1);assert.ok(run.s.events.some(x=>x.type==='super'));
 run.step({gadget:true,fire:false});assert.equal(a.gadgets,1);run.step({gadget:true,fire:false});assert.equal(a.gadgets,1,'held gadget never repeats');
 run.step({gadget:false,fire:false});run.step({gadget:true,fire:false});assert.equal(a.gadgets,0);
 const before=run.snapshot();run.step({dash:true,x:1});assert.ok(run.s.player.dashCool>0);run.restore(before);assert.deepEqual(run.snapshot(),before);
}
const options={hero:'lumen',difficulty:'hard'},a=new Core.Run(420,null,options),b=new Core.Run(420,null,options),ops=[];
for(let i=0;i<8000&&!a.s.done;i++){const raw={x:Math.sin(i/90),z:Math.cos(i/90),super:i%90===0,gadget:i%180===0,dash:i%120===0,choice:a.s.offer?1:0};Replay.append(ops,a.input(raw));a.step(raw);b.step(raw);}assert.deepEqual(a.snapshot(),b.snapshot());assert.ok(a.s.done);assert.equal(a.s.picks.length,3);
const packet={v:3,seed:420,options:Rules.options(options),ops,look:{}};assert.equal(Replay.validate(packet,420,a.s.score,packet.options).packet.v,3);assert.throws(()=>Replay.validate(packet,420,a.s.score+1));assert.throws(()=>Replay.validate(packet,420,a.s.score,Rules.options({difficulty:'normal'})));
const boss=new Core.Run(42,null,{difficulty:'hard'});boss.s.stage=3;boss.enter();boss.bossHit(boss.s.player,Math.ceil(boss.s.bossMax*.4));boss.bossHit(boss.s.player,Math.ceil(boss.s.bossMax*.3));boss.bossHit(boss.s.player,999);assert.deepEqual(boss.s.phaseHistory,[1,2,3]);assert.equal(boss.s.win,true);
assert.equal(Rules.options({difficulty:'hard',assist:true}).assist,false);assert.equal(Rules.weeklySeed(new Date('2026-11-23T00:00:00+08:00')),Rules.weeklySeed(new Date('2026-11-29T23:59:59+08:00')));assert.notEqual(Rules.weeklySeed(new Date('2026-11-23T00:00:00+08:00')),Rules.weeklySeed(new Date('2026-11-30T00:00:00+08:00')));
for(const reward of Rules.road){assert.ok(!Rules.rewards(reward.xp-1).some(r=>r.id===reward.id));assert.ok(Rules.rewards(reward.xp).some(r=>r.id===reward.id));}assert.equal(Rules.next(0).length,3);
console.log('Rumble v3: kits, abilities, snapshots, deterministic replay, upgrades, boss phases and progression constants passed');

const echoTest=new Core.Run(42);echoTest.s.player.charge=100;echoTest.step({super:true,fire:false});assert.equal(echoTest.s.log[0][12],1);echoTest.fork();echoTest.step({fire:false});assert.ok(echoTest.s.events.some(e=>e.type==='super'&&e.value===0),'echo copies the recorded super even if its targets changed');
const seededA=new Core.Run(42),seededB=new Core.Run(42);for(let i=0;i<1200;i++){seededA.step({fire:true});seededB.step({fire:false});}assert.deepEqual(seededA.start.objects,seededB.start.objects,'combat RNG never changes the next seeded layout');assert.deepEqual(seededA.s.offer,seededB.s.offer,'upgrade offers do not depend on shots fired');
