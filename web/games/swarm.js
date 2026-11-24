/* Neon Swarm — original reactor-garden survival arena; procedural art and sound. */
(function(){
 const NE=Forkade,P=NE.palette,C=['#ff3ea5','#ffb23f','#a07bff','#ff5a6e'];
 class Swarm extends NE.GameBase{
  reset(){this._keys=new Set();this.px=this.W/2;this.py=this.H/2;this.hp=100;this.score=0;this.wave=1;this.cool=0;this.spawnT=1;this.aim=0;this.elapsed=0;this.kills=0;this.multi=0;this.shield=0;this.clean=0;this.goal=20;this.nextBoss=120;this.enemies=[];this.bullets=[];this.drops=[];this.state='play';this.spawnWave();}
  spawnWave(){for(let i=0;i<4+Math.min(12,this.wave*2);i++)this.spawnEnemy();}
  spawnEnemy(kind){if(this.enemies.length>=48)return;const side=(NE.rng()*4)|0;let x,y;if(side===0){x=NE.rand(20,this.W-20);y=-24;}else if(side===1){x=NE.rand(20,this.W-20);y=this.H+24;}else if(side===2){x=-24;y=NE.rand(20,this.H-20);}else{x=this.W+24;y=NE.rand(20,this.H-20);}if(kind==null)kind=this.elapsed<35?0:this.elapsed<70?(NE.rng()<.4?1:0):(NE.rng()*3)|0;this.enemies.push({x,y,kind,hp:kind===3?600:kind===2?100:30+this.wave*4,sp:kind===3?30:kind===2?38:kind===1?95:48+Math.min(40,this.elapsed*.3),phase:NE.rand(0,6.28),hit:0});}
  step(dt){if(this.state!=='play')return;const I=this.input,M=I.mouse;this.elapsed+=dt;const wave=1+Math.floor(this.elapsed/35);if(wave!==this.wave){this.wave=wave;this.reward(2+2*wave,"sector "+wave,"wave"+wave);}this.multi=Math.max(0,this.multi-dt);this.shield=Math.max(0,this.shield-dt);this.clean+=dt;
   if(this.clean>=this.goal){this.score+=25;this.goal+=20;this.juice?.hit(this.W/2,100,'No-hit +25',true);}
   if(this.elapsed>=this.nextBoss){this.nextBoss+=120;this.spawnEnemy(3);this.juice?.hit(this.W/2,110,'Reactor guardian',true);}
   let dx=(I.right()?1:0)-(I.left()?1:0),dy=(I.down()?1:0)-(I.up()?1:0);
   if(M.down&&M.kind==='touch'){const d=Math.hypot(M.x-this.px,M.y-this.py);if(d>10){dx=(M.x-this.px)/d;dy=(M.y-this.py)/d;}}
   const length=Math.max(1,Math.hypot(dx,dy));this.px=Math.max(18,Math.min(this.W-18,this.px+dx/length*240*dt));this.py=Math.max(30,Math.min(this.H-35,this.py+dy/length*240*dt));
   let target=null,nearest=Infinity;for(const e of this.enemies){const d=(e.x-this.px)**2+(e.y-this.py)**2;if(d<nearest){nearest=d;target=e;}}
   this.aim=M.seen&&M.kind==='mouse'?Math.atan2(M.y-this.py,M.x-this.px):target?Math.atan2(target.y-this.py,target.x-this.px):this.aim;
   this.cool-=dt;if((M.down||I.keys.Space)&&this.cool<=0&&this.bullets.length<90){this.cool=.14;NE.sfx.shoot();const shots=this.multi>0?3:1;for(let i=0;i<shots;i++){const a=this.aim+(i-(shots-1)/2)*.18;this.bullets.push({x:this.px,y:this.py,vx:Math.cos(a)*650,vy:Math.sin(a)*650,life:1.3});}this.particles.emit(this.px+Math.cos(this.aim)*20,this.py+Math.sin(this.aim)*20,P.cyan,{n:3,speed:2,angle:this.aim,spread:.3});}
   for(const b of this.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;}
   for(const e of this.enemies){e.phase+=dt;e.hit=Math.max(0,e.hit-dt);const a=Math.atan2(this.py-e.y,this.px-e.x),dash=e.kind===1?(Math.sin(e.phase*2)> .85?2.4:.6):1;e.x+=Math.cos(a)*e.sp*dash*dt;e.y+=Math.sin(a)*e.sp*dash*dt;
    if(Math.hypot(e.x-this.px,e.y-this.py)<(e.kind===3?38:24)){if(!this.shield){this.hp-=18*dt;this.clean=0;this.goal=20;if(e.hit<=0){this.juice?.hit(this.px,this.py,'HIT',false,true);e.hit=.25;}this.shake.add(1);}else{e.hp-=80*dt;}}}
   for(const b of this.bullets)if(b.life>0)for(const e of this.enemies)if(e.hp>0&&Math.hypot(b.x-e.x,b.y-e.y)<(e.kind===3?36:18)){e.hp-=20;b.life=0;e.hit=.1;this.particles.emit(e.x,e.y,C[e.kind],{n:4,speed:3});break;}
   for(const e of this.enemies)if(e.hp<=0){const points=e.kind===3?150:10;this.score+=points;this.kills++;this.juice?.hit(e.x,e.y,'+'+points,e.kind===3);this.shake.add(e.kind===3?8:2);NE.sfx.explode();this.particles.emit(e.x,e.y,C[e.kind],{n:e.kind===3?40:12,speed:4});
    if(this.kills%5===0&&this.drops.length<8)this.drops.push({x:e.x,y:e.y,life:12,kind:e.kind===3?1:0});if(this.kills%10===0){this.score+=50;this.juice?.hit(this.W/2,100,'10 DRONES +50',true);}if(e.kind===3)this.shield=8;}
   let n=0;for(const e of this.enemies)if(e.hp>0)this.enemies[n++]=e;this.enemies.length=n;n=0;for(const b of this.bullets)if(b.life>0)this.bullets[n++]=b;this.bullets.length=n;
   for(const d of this.drops){d.life-=dt;if(Math.hypot(d.x-this.px,d.y-this.py)<28){d.life=0;this.multi=10;this.hp=Math.min(100,this.hp+12);this.juice?.hit(d.x,d.y,'Triple shot · +12 hull',true);NE.sfx.pickup();}}
   n=0;for(const d of this.drops)if(d.life>0)this.drops[n++]=d;this.drops.length=n;
   this.spawnT-=dt;if(this.spawnT<=0){this.spawnT=Math.max(.55,2.5-this.elapsed/150);this.spawnEnemy();}if(!this.enemies.length)this.spawnWave();
   if(this.hp<=0){this.hp=0;this.state='over';this.shake.add(8);}
  }
  snapshot(){if(this.state!=='play')return null;return {v:[this.px,this.py,this.hp,this.score,this.wave,this.cool,this.spawnT,this.aim,this.elapsed,this.kills,this.multi,this.shield,this.clean,this.goal,this.nextBoss],en:this.enemies.map(e=>({...e})),bu:this.bullets.map(b=>({...b})),drops:this.drops.map(d=>({...d}))};}
  restore(s){[this.px,this.py,this.hp,this.score,this.wave,this.cool,this.spawnT,this.aim,this.elapsed,this.kills,this.multi,this.shield,this.clean,this.goal,this.nextBoss]=s.v;this.enemies=s.en.map(e=>({...e}));this.bullets=s.bu.map(b=>({...b}));this.drops=s.drops.map(d=>({...d}));}
  render(ctx){
   for(const e of this.enemies){const r=e.kind===3?34:e.kind===2?21:16,ang=Math.atan2(this.py-e.y,this.px-e.x);ctx.save();ctx.translate(e.x,e.y);ctx.rotate(ang);ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(0,6,r+4,r*.7,0,0,NE.TAU);ctx.fill();ctx.fillStyle=e.hit>0?'#ffe8ef':C[e.kind];ctx.strokeStyle=C[e.kind];ctx.lineWidth=2;
    ctx.beginPath();for(let i=0;i<6;i++){const a=i*NE.TAU/6,rr=i%2?r*.7:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();ctx.fillStyle='#160b24';ctx.beginPath();ctx.ellipse(4,0,r*.45,r*.33,0,0,NE.TAU);ctx.fill();ctx.fillStyle='#ffefdb';ctx.fillRect(r*.2,-2,r*.3,4);
    const flap=Forkade.settings.reduceMotion?0:Math.sin(e.phase*12)*4;ctx.beginPath();ctx.moveTo(-8,-r*.6);ctx.lineTo(-r-5,-r-flap);ctx.lineTo(-r*.6,-3);ctx.moveTo(-8,r*.6);ctx.lineTo(-r-5,r+flap);ctx.lineTo(-r*.6,3);ctx.stroke();if(e.kind===2){ctx.strokeRect(-r,-r,r*2,r*2);}ctx.restore();}
   ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#aaffee';ctx.lineWidth=4;ctx.beginPath();for(const b of this.bullets){ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx*.014,b.y-b.vy*.014);}ctx.stroke();ctx.restore();
   for(const d of this.drops){this.world?.glow(ctx,d.x,d.y,40);ctx.save();ctx.translate(d.x,d.y);ctx.rotate(Math.PI/4);ctx.fillStyle=P.lime;ctx.fillRect(-13,-13,26,26);ctx.restore();NE.text(ctx,'3',d.x,d.y-10,{size:19,align:'center',color:P.bg,glow:false});}
   this.world?.glow(ctx,this.px,this.py,85);ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(this.px,this.py+20,22,6,0,0,NE.TAU);ctx.fill();ctx.save();ctx.translate(this.px,this.py);ctx.rotate(this.aim);ctx.fillStyle='#baffff';ctx.beginPath();ctx.roundRect(12,-5,18,10,3);ctx.fill();ctx.restore();NE.drawEcho(ctx,this.px,this.py,20,P.cyan,Math.cos(this.aim)>=0?1:-1,this.elapsed);if(this.shield){ctx.strokeStyle=P.lime;ctx.lineWidth=3;ctx.beginPath();ctx.arc(this.px,this.py,30,0,NE.TAU);ctx.stroke();}
   NE.bar(ctx,16,24,180,12,this.hp/100,P.lime,'HULL');NE.text(ctx,this.score+'',this.W-20,15,{size:32,align:'right'});NE.text(ctx,'Sector '+this.wave,16,48,{size:18,color:'#ffb4dc',glow:false});NE.text(ctx,'No hit '+Math.floor(this.clean)+'/'+this.goal+'s · +25',16,72,{size:16,color:'#ffb4dc',glow:false});if(this.multi>0)NE.text(ctx,'Triple '+Math.ceil(this.multi)+'s',this.W-20,90,{size:18,align:'right',color:P.lime,glow:false});
   if(this.state==='over'){NE.banner(ctx,this.W,this.H,'Reactor run',Math.floor(this.elapsed)+'s · '+this.kills+' drones · combo '+(this.juice?.best||0));const best=NE.scores.get(this.id);NE.text(ctx,best>this.score?(best-this.score)+' points to your best':'New personal best',this.W/2,this.H/2+130,{size:18,align:'center',glow:false});}
  }
 }
 NE.register("swarm",{polished:true,scene:"reactor",world:["#120719","#271431","#ff3ea5"],music:{root:130.81,tempo:136,wave:"square"},hint:"Drag to move + fire · or arrows + space",title:"Neon Swarm",genre:"Survival shooter",color:P.magenta,desc:"Defend a glowing reactor garden. Dash drones, armoured husks and a guardian hunt you; collect triple-shot cells and rewind mistakes."},Swarm);
})();
