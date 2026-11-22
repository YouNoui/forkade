const test=require('node:test'),assert=require('node:assert/strict');
const {Run,dailySeed,LIMIT}=require('../web/games3d/rumble-core.js');
const input=i=>({x:Math.sin(i/100),z:Math.cos(i/150),jump:i%60<15});
test('Rumble same seed + inputs + forks give the same complete 90-second run',()=>{
  function simulate(){const r=new Run(20261122),stages=new Set();for(let i=0;i<LIMIT;i++){r.step(input(i));if(i===400||i===800)r.fork();stages.add(r.kind());}return {snapshot:r.snapshot(),stages:[...stages]};}
  const a=simulate(),b=simulate();assert.deepEqual(a,b);assert.equal(a.snapshot.s.done,true);assert.equal(a.stages.length,4);assert.ok(a.snapshot.s.echoes.length<=3);assert.ok(a.snapshot.s.score>0);
});
test('echo follows the exact previous input replay and preserves the run clock',()=>{
  const r=new Run(8),track=[];for(let i=0;i<180;i++){r.step(input(i));track.push({...r.s.player});}const tick=r.s.tick;r.fork();assert.equal(r.s.tick,tick);assert.equal(r.s.echoes.length,1);
  for(let i=0;i<180;i++){r.step({x:0,z:0,fire:false});for(const key of ['x','y','z','vy','yaw'])assert.equal(r.s.echoes[0][key],track[i][key],key+' '+i);}
});
test('full snapshot rewind restores RNG, input logs, targets, combo and the squad',()=>{
  const r=new Run(24);for(let i=0;i<180;i++)r.step(input(i));r.fork();const before=r.snapshot();for(let i=0;i<180;i++)r.step(input(i));const after=r.snapshot();r.restore(before);for(let i=0;i<180;i++)r.step(input(i));assert.deepEqual(r.snapshot(),after);
});
test('boss shield needs a squad; the actual replay squad can defeat it',()=>{
  const r=new Run(9);r.s.tick=3600;r.s.stage=3;r.enter();for(let a=0;a<2;a++){for(let i=0;i<90;i++)r.step({z:i<45?-1:0});assert.equal(r.s.boss,120);r.fork();}for(let i=0;i<1500&&!r.s.done;i++)r.step({z:i<45?-1:0});assert.equal(r.s.win,true);assert.equal(r.s.boss,0);assert.equal(r.s.echoes.length>=2,true);
});
test('Singapore seed changes only at midnight and inputs cannot exceed movement caps',()=>{
  assert.equal(dailySeed(new Date('2026-11-22T00:00:00Z')),dailySeed(new Date('2026-11-22T15:59:59Z')));assert.notEqual(dailySeed(new Date('2026-11-22T15:59:59Z')),dailySeed(new Date('2026-11-22T16:00:00Z')));
  const r=new Run(4);r.step({x:9999,z:-9999});assert.ok(Math.abs(r.s.player.x)<.2);assert.ok(r.s.player.z>6.8);
});
test('death forks the stage automatically and the squad is capped at three',()=>{
  const r=new Run(13);for(let n=0;n<5;n++){for(let i=0;i<60;i++)r.step({x:.4,z:-.3});r.s.player.hp=0;r.step({});assert.equal(r.s.player.hp,4);assert.equal(r.s.stageTick,0);}assert.equal(r.s.echoes.length,3);assert.equal(r.s.logs.length,3);assert.equal(r.s.forks,5);
});
const {CHAOS}=require('../web/games3d/rumble-core.js');
test('all eight chaos events are seeded, last 600 simulation ticks and rewind exactly',()=>{const seen=new Set();for(let seed=1;seed<=64;seed++){const a=new Run(Math.imul(seed,2654435761)),b=new Run(Math.imul(seed,2654435761));assert.deepEqual(a.s.chaosPlan,b.s.chaosPlan);assert.equal(new Set(a.s.chaosPlan).size,4);a.s.chaosPlan.forEach(x=>seen.add(x));a.s.objects=[];for(let i=0;i<600;i++)a.step({fire:false});assert.equal(a.chaos(),-1);}assert.equal(seen.size,CHAOS.length);});
test('emotes copy with delay, survive recorded replay and never alter movement',()=>{const a=new Run(8),b=new Run(8);for(let i=0;i<90;i++){a.step({...input(i),emote:i===10,emoteKind:2});b.step(input(i));for(const k of ['x','y','z','vy'])assert.equal(a.s.player[k],b.s.player[k]);}a.fork();for(let i=0;i<28;i++)a.step({fire:false});assert.equal(a.s.echoes[0].emote,0);a.step({fire:false});assert.equal(a.s.echoes[0].emoteKind,2);assert.equal(a.s.echoes[0].emote,120);const snap=a.snapshot();for(let i=0;i<80;i++)a.step({emote:i===0,emoteKind:3});const after=a.snapshot();a.restore(snap);for(let i=0;i<80;i++)a.step({emote:i===0,emoteKind:3});assert.deepEqual(a.snapshot(),after);});
test('boss locks a visible target 75 ticks before a dodgeable slam and splits mini jellies',()=>{const r=new Run(9);r.s.stage=3;r.s.tick=3600;r.enter();r.s.objects=[];r.s.chaosLeft=0;for(let i=0;i<150;i++)r.step({fire:false});assert.equal(r.s.bossAttack.phase,'windup');const hp=r.s.player.hp,target={...r.s.bossAttack};for(let i=0;i<74;i++)r.step({x:1,fire:false});assert.equal(r.s.player.hp,hp);assert.equal(r.s.bossAttack.x,target.x);r.step({x:1,fire:false});assert.equal(r.s.bossAttack.phase,'slam');assert.equal(r.s.player.hp,hp);assert.equal(r.s.objects.filter(o=>o.variant===0).length,2);});
