/* GAME 3 - Sky Striker : vertical airplane shmup */
(function () {
  const NE = Forkade, P = NE.palette;

  class Striker extends NE.GameBase {
    reset() {
      this.px = this.W / 2; this.py = this.H - 90;
      this.hp = 3; this.score = 0;
      this.bullets = []; this.ebullets = []; this.foes = [];
      this.cool=0;this.spawn=0;this.elapsed=0;this.kills=0;this.power=0;this.invuln=0;this.nextBoss=120;this.drops=[];this.grazes=0;this.state="play";
    }
    step(dt) {
      const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }
      this.elapsed+=dt;this.power=Math.max(0,this.power-dt);this.invuln=Math.max(0,this.invuln-dt);
      if(this.elapsed>=this.nextBoss){this.nextBoss+=120;this.foes.push({x:this.W/2,y:-60,hp:800,sp:28,sway:1,fire:2,kind:3,hit:0});this.juice?.hit(this.W/2,140,'Tempest carrier',true);}
      const dx = (I.right() ? 1 : 0) - (I.left() ? 1 : 0);
      const dy = (I.down() ? 1 : 0) - (I.up() ? 1 : 0);
      this.px = Math.max(16, Math.min(this.W - 16, this.px + dx * 360 * dt));
      this.py = Math.max(60, Math.min(this.H - 20, this.py + dy * 360 * dt));
      if(I.mouse.down&&I.mouse.kind==='touch'){const x=I.mouse.x-this.px,y=I.mouse.y-this.py,d=Math.max(1,Math.hypot(x,y));this.px+=x/d*Math.min(d,dt*420);this.py+=y/d*Math.min(d,dt*420);this.px=Math.max(20,Math.min(this.W-20,this.px));this.py=Math.max(60,Math.min(this.H-30,this.py));}
      this.cool -= dt;
      if ((I.keys.Space || I.mouse.down) && this.cool <= 0) {
        this.cool=.14;NE.sfx.shoot();if(this.bullets.length<90)for(let i=0;i<(this.power>0?3:1);i++)this.bullets.push({x:this.px,y:this.py-18,vx:this.power>0?(i-1)*110:0});
        this.particles.emit(this.px, this.py - 18, P.cyan, { n: 3, angle: -Math.PI / 2, spread: 0.3, speed: 3 });
      }
      this.particles.emit(this.px,this.py+24,P.amber,{n:1,angle:Math.PI/2,spread:.4,speed:2,life:.3});
      for (const b of this.bullets){b.y-=680*dt;b.x+=b.vx*dt;}
      let nb=0;for(const b of this.bullets)if(b.y>-20)this.bullets[nb++]=b;this.bullets.length=nb;
      for (const b of this.ebullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
      let ne=0;for(const b of this.ebullets)if(b.y>-20&&b.y<this.H+20&&b.x>-30&&b.x<this.W+30)this.ebullets[ne++]=b;this.ebullets.length=ne;
      this.spawn -= dt;
      if (this.spawn <= 0 && this.foes.length<32) {
        this.spawn = Math.max(0.4, 1.3 - this.score / 2000);
        this.foes.push({ x: NE.rand(40, this.W - 40), y: -20, hp: this.elapsed>=70?90:40, sp: NE.rand(70, 130),
                         sway: NE.rand(1, 2.2), fire: this.elapsed<20?2:1, kind:this.elapsed<35?0:this.elapsed<70?1:2, hit:0 });
      }
      for (const f of this.foes) {
        f.hit=Math.max(0,f.hit-dt);if(f.kind===3){f.y=Math.min(130,f.y+f.sp*dt);f.x=this.W/2+Math.sin(this.elapsed*.7)*this.W*.28;}else{f.y+=f.sp*dt;f.x+=Math.sin(this.elapsed*f.sway)*60*dt;}f.fire-=dt;
        if (f.fire <= 0 && f.y < this.H - 100) {
          f.fire = NE.rand(1.2, 2.5);
          const a = Math.atan2(this.py - f.y, this.px - f.x);
          if(this.ebullets.length<120)for(let i=0;i<(f.kind===3?7:f.kind===1?3:1);i++){const count=f.kind===3?7:f.kind===1?3:1,angle=a+(i-(count-1)/2)*.17,speed=this.elapsed<20?140:200;this.ebullets.push({x:f.x,y:f.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,grazed:false});}
        }
      }
      for (const b of this.bullets) for (const f of this.foes)
        if (b.y>-50&&Math.abs(b.x-f.x)<(f.kind===3?58:20)&&Math.abs(b.y-f.y)<(f.kind===3?34:20)) {
          f.hp -= 20;f.hit=.1; b.y = -99; this.particles.emit(f.x, f.y, P.amber, { n: 5, speed: 3 });
        }
      for (const f of this.foes) if (f.hp <= 0) {
        const points=f.kind===3?300:20;this.score+=points;this.kills++;this.juice?.hit(f.x,f.y,'+'+points,f.kind===3);if(this.kills%5===0&&this.drops.length<6)this.drops.push({x:f.x,y:f.y,life:10});if(this.kills%10===0){this.score+=100;this.juice?.hit(this.W/2,140,'10 SHIPS +100',true);}if(f.kind===3){this.hp=Math.min(3,this.hp+1);this.invuln=5;}this.shake.add(3); NE.sfx.explode(); this.particles.emit(f.x, f.y, P.magenta, { n: 16, speed: 4 });
      }
      let nf=0;for(const f of this.foes)if(f.hp>0&&f.y<this.H+30)this.foes[nf++]=f;this.foes.length=nf;
      for(const d of this.drops){d.y+=55*dt;d.life-=dt;if(Math.hypot(d.x-this.px,d.y-this.py)<30){d.life=0;this.power=8;this.juice?.hit(d.x,d.y,'SPREAD SHOT · 8s',true);NE.sfx.pickup();}}let nd=0;for(const d of this.drops)if(d.life>0&&d.y<this.H+30)this.drops[nd++]=d;this.drops.length=nd;
      let hit = false;
      for (const b of this.ebullets)
        if (Math.abs(b.x - this.px) < 14 && Math.abs(b.y - this.py) < 14) { hit = true; b.y = 9999; break; }
      for(const b of this.ebullets){const d=Math.hypot(b.x-this.px,b.y-this.py);if(!b.grazed&&d>20&&d<36){b.grazed=true;this.grazes++;this.score+=5;this.juice?.hit(this.px,this.py-35,'Graze +5');if(!NE.settings.reduceMotion)this.juice.slow=.12;}}
      if (!hit) for (const f of this.foes)
        if (Math.abs(f.x - this.px) < 22 && Math.abs(f.y - this.py) < 22) { hit = true; f.hp = 0; break; }
      if (hit && this.invuln<=0) {
        this.invuln=1;this.juice?.hit(this.px,this.py,"HIT",true,true);
        this.hp -= 1; this.shake.add(10); NE.sfx.hit(); this.particles.emit(this.px, this.py, P.red, { n: 20, speed: 5 });
        if (this.hp <= 0) this.state = "over";
      }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return {extra:[this.cool,this.spawn,this.elapsed,this.kills,this.power,this.invuln,this.nextBoss,this.grazes],drops:this.drops.map(d=>({...d})),px: this.px, py: this.py, hp: this.hp, score: this.score,
               b: this.bullets.map(o => ({ ...o })), eb: this.ebullets.map(o => ({ ...o })),
               f: this.foes.map(o => ({ ...o })) };
    }
    restore(s) {
      [this.cool,this.spawn,this.elapsed,this.kills,this.power,this.invuln,this.nextBoss,this.grazes]=s.extra;this.drops=s.drops.map(d=>({...d}));
      this.px = s.px; this.py = s.py; this.hp = s.hp; this.score = s.score;
      this.bullets = s.b.map(o => ({ ...o })); this.ebullets = s.eb.map(o => ({ ...o }));
      this.foes = s.f.map(o => ({ ...o }));
    }
    render(ctx){
      for(const f of this.foes){const size=f.kind===3?58:f.kind===2?24:19;ctx.save();ctx.translate(f.x,f.y);ctx.fillStyle=f.hit>0?'#fff2cf':f.kind===3?'#ffb23f':f.kind===2?'#ff6680':'#f77ac3';ctx.beginPath();ctx.moveTo(0,size);ctx.lineTo(-size,-size*.5);ctx.lineTo(-size*.35,-size*.25);ctx.lineTo(0,-size);ctx.lineTo(size*.35,-size*.25);ctx.lineTo(size,-size*.5);ctx.closePath();ctx.fill();ctx.fillStyle='#251528';ctx.beginPath();ctx.moveTo(0,size*.5);ctx.lineTo(-6,-5);ctx.lineTo(6,-5);ctx.closePath();ctx.fill();ctx.strokeStyle='#ffefc1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-size*.7,-size*.3);ctx.lineTo(-size*.3,4);ctx.moveTo(size*.7,-size*.3);ctx.lineTo(size*.3,4);ctx.stroke();ctx.restore();if(f.kind===3)NE.bar(ctx,f.x-55,f.y-48,110,7,f.hp/800,P.amber);}
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle='#caffff';for(const b of this.bullets)ctx.fillRect(b.x-2,b.y-10,4,18);ctx.restore();
      ctx.fillStyle=P.red;for(const b of this.ebullets){ctx.beginPath();ctx.moveTo(b.x,b.y-7);ctx.lineTo(b.x+5,b.y);ctx.lineTo(b.x,b.y+7);ctx.lineTo(b.x-5,b.y);ctx.closePath();ctx.fill();}
      for(const d of this.drops){this.world?.glow(ctx,d.x,d.y,35);ctx.fillStyle=P.lime;ctx.beginPath();ctx.moveTo(d.x,d.y-15);ctx.lineTo(d.x+15,d.y);ctx.lineTo(d.x,d.y+15);ctx.lineTo(d.x-15,d.y);ctx.closePath();ctx.fill();NE.text(ctx,'3',d.x,d.y-10,{size:18,align:'center',color:P.bg,glow:false});}
      const x=this.px,y=this.py;this.world?.glow(ctx,x,y,90);ctx.save();ctx.translate(x,y);const lean=NE.settings.reduceMotion?0:((this.input.right()?1:0)-(this.input.left()?1:0))*.12;ctx.rotate(lean);ctx.fillStyle='#95fff1';ctx.beginPath();ctx.moveTo(0,-34);ctx.lineTo(-10,-6);ctx.lineTo(-33,15);ctx.lineTo(-28,24);ctx.lineTo(-8,15);ctx.lineTo(0,22);ctx.lineTo(8,15);ctx.lineTo(28,24);ctx.lineTo(33,15);ctx.lineTo(10,-6);ctx.closePath();ctx.fill();ctx.fillStyle='#157a91';ctx.beginPath();ctx.moveTo(0,-22);ctx.lineTo(-6,12);ctx.lineTo(6,12);ctx.closePath();ctx.fill();NE.drawEcho(ctx,0,2,12,P.cyan,1,this.elapsed);ctx.restore();
      if(this.invuln>0){ctx.strokeStyle='#d2fff3';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,38,0,NE.TAU);ctx.stroke();}
      NE.text(ctx,this.score+'',20,16,{size:36});NE.text(ctx,'Next 10: '+(this.kills%10)+'/10 · +100',20,60,{size:17,color:'#c0e4ef',glow:false});for(let i=0;i<this.hp;i++)NE.text(ctx,'◆',this.W-26-i*26,20,{size:24,color:P.lime,glow:false});if(this.power>0)NE.text(ctx,'Spread '+Math.ceil(this.power)+'s',this.W-20,80,{size:18,align:'right',color:P.lime,glow:false});
      if(this.state==='over'){NE.banner(ctx,this.W,this.H,'Flight complete',this.kills+' ships · '+this.grazes+' grazes · combo '+(this.juice?.best||0));const best=NE.scores.get(this.id);NE.text(ctx,best>this.score?(best-this.score)+' points to your best':'Your best flight',this.W/2,this.H/2+130,{size:18,align:'center',glow:false});}
    }
  }
  NE.register("striker",
    { polished:true,scene:"clouds",world:["#071624","#163a4b","#9dffcf"],music:{root:196,tempo:148,wave:"sawtooth"},hint:"Drag to fly + fire · or arrows + space", title: "Sky Striker", genre: "Airplane shmup", color: P.lime,
      desc: "Surf luminous storm clouds, graze danger and catch spread-shot cells. Bring down the Tempest Carrier — or rewind your last mistake." },
    Striker);
})();
