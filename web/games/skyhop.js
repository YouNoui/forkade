/* GAME 1 - Sky Hop : bouncy platformer climb */
(function () {
  const NE = Forkade, P = NE.palette, C=["#22e4ff","#b0ffcd","#ffb23f","#fff2b0"];

  class SkyHop extends NE.GameBase {
    reset() {
      this.px = this.W / 2; this.py = this.H - 80;
      this.vx = 0; this.vy = 0; this.onGround = false;
      this.cam = 0; this.best = 0; this.score = 0; this.orbPts = 0;
      this.plats = [{ x: 0, y: this.H - 40, w: this.W, h: 40 }];
      this.orbs = []; this.lastX = this.W / 2; this.coyote = 0; this.buffer = 0;
      this.stage=0;
      let y = this.H - 130;
      for (let i = 0; i < 40; i++) { this.addPlat(y); y -= this.gap(); }
      this.nextGate=120;this.elapsed=0;this.sparks=0;this.magnet=0;this.shield=1;this.goal=5;this.stage=0;this.land=0;this.rescues=0;
      this.state = "play";
    }
    // jump reaches ~150px high; gaps stay well under that, and grow a little with height
    gap() { const normal=NE.rand(70, 95) + Math.min(15, this.best / 400); return NE.assist(this.id) ? normal * 0.8 : normal; }
    addPlat(y) {
      const w = Math.max(70, NE.rand(100, 170) - Math.min(50, this.best / 250));
      // keep each platform within a reachable sideways distance of the one below
      const cx = Math.max(20 + w / 2, Math.min(this.W - 20 - w / 2, this.lastX + NE.rand(-140, 140)));
      const x = cx - w / 2; this.lastX = cx;
      this.plats.push({ x, y, w, h: 18, home:x, kind:this.stage>=1&&NE.rng()<.3 ? 1 : this.stage>=2&&NE.rng()<.25 ? 2 : 0, phase:NE.rand(0,6.28), life:1 });
      if (NE.rng() < 0.5) this.orbs.push({ x: x + w / 2, y: y - 26, on: true });
    }
    step(dt) {
      const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter || I.pressed.NumpadEnter) this.reset(); return; }
      this.elapsed+=dt;const stage=Math.floor(this.elapsed/35);if(stage!==this.stage){this.stage=stage;for(let i=0;i<this.plats.length;i++){const p=this.plats[i];if(p.h<30&&p.kind!==3){p.home=p.x;p.kind=i%4===0?1:stage>1&&i%4===2?2:0;}}this.juice?.hit(this.W/2,120,stage===1?'Drift islands':stage===2?'Crumble islands':'High sky',true);}
      this.magnet=Math.max(0,this.magnet-dt);this.land=Math.max(0,this.land-dt);
      if(this.elapsed>=this.nextGate){this.nextGate+=120;const y=180-this.cam;this.plats.push({x:this.W*.12,y,w:this.W*.76,h:18,kind:3,life:1,home:this.W*.12,phase:0});for(let i=0;i<8;i++)this.orbs.push({x:this.W*(.18+i*.09),y:y-28,on:true});this.juice?.hit(this.W/2,150,'Sky gate · spark rush',true);}
      for(const p of this.plats){if(p.kind===1)p.x=Math.max(10,Math.min(this.W-p.w-10,p.home+Math.sin(this.elapsed*1.3+p.phase)*45));if(p.kind===2&&p.life<1)p.life-=dt;}
      const ax = (I.right() ? 1 : 0) - (I.left() ? 1 : 0);
      this.vx = ax * 320;
      // forgiving jump: press slightly early (buffer) or just after leaving a ledge (coyote)
      if (I.pressed.Space || I.pressed.KeyW || I.pressed.ArrowUp) this.buffer = 0.12;
      else this.buffer = Math.max(0, this.buffer - dt);
      this.coyote = this.onGround ? 0.09 : Math.max(0, this.coyote - dt);
      if ((this.buffer > 0 || I.keys.Space) && this.coyote > 0) {
        this.vy = -680; this.onGround = false; this.coyote = 0; this.buffer = 0; NE.sfx.jump();
        this.particles.emit(this.px, this.py + 16, P.cyan, { n: 10, angle: Math.PI / 2, spread: 1.2, speed: 3 });
      }
      this.vy += 1500 * dt;
      if (this.vy < 0 && !(I.keys.Space || I.keys.KeyW || I.keys.ArrowUp)) this.vy += 1400 * dt;  // tap = short hop, hold = full jump
      this.px = Math.max(16, Math.min(this.W - 16, this.px + this.vx * dt));
      this.py += this.vy * dt;

      this.onGround = false;
      if (this.vy >= 0) {
        const fx = this.px, fb = this.py + 16;
        for (const p of this.plats) {
          const sy = p.y + this.cam;
          if (p.life!==undefined&&p.life<=0)continue;
          if (fx > p.x - 12 && fx < p.x + p.w + 12 &&
              fb >= sy && fb - this.vy * dt <= sy + 14) {
            if(!this.onGround&&this.vy>120){this.land=.14;this.particles.emit(this.px,sy,P.cyan,{n:5,speed:1});}
            this.py = sy - 16; this.vy = 0; this.onGround = true;if(p.kind===2&&p.life===1)p.life=.7;
          }
        }
      }
      // camera: once ECHO climbs above 42% of the screen, scroll the world down AND
      // move ECHO down with it, so he always stays in view
      if (this.py < this.H * 0.42) {
        const d = this.H * 0.42 - this.py;
        this.cam += d; this.py += d; this.best += d;
      }
      let top = Infinity; for (const p of this.plats) top = Math.min(top, p.y);
      if (top + this.cam > -40) this.addPlat(top - this.gap());
      let np=0;for(const p of this.plats)if(p.y+this.cam<this.H+60)this.plats[np++]=p;this.plats.length=np;

      for (const o of this.orbs){
        if(o.on&&this.magnet>0&&Math.hypot(o.x-this.px,o.y+this.cam-this.py)<140){o.x+=(this.px-o.x)*Math.min(1,dt*8);o.y+=(this.py-this.cam-o.y)*Math.min(1,dt*8);}
        if (o.on && Math.abs(o.x - this.px) < 22 && Math.abs(o.y + this.cam - this.py) < 22) {
          o.on = false; this.orbPts += 25; this.sparks++; this.shake.add(2); NE.sfx.pickup();this.juice?.hit(o.x,o.y+this.cam,'+25');
          if(this.sparks>=this.goal){this.orbPts+=50;this.goal+=5;this.magnet=8;this.juice?.hit(this.W/2,this.H*.35,'Spark goal +50 · magnet',true);}
          if(this.elapsed>=120&&this.sparks%10===0){this.shield=1;this.juice?.hit(this.W/2,this.H*.4,'Sky gate · shield',true);}
          this.particles.emit(o.x, o.y + this.cam, P.amber, { n: 16, speed: 4 });
        }
      }
      let no=0;for(const o of this.orbs)if(o.y+this.cam<this.H+40)this.orbs[no++]=o;this.orbs.length=no;
      this.score = ((this.best / 10) | 0) + this.orbPts;

      if(this.py>this.H-25&&this.vy>0&&this.shield){this.shield=0;this.rescues++;this.py=this.H-70;this.vy=-780;this.juice?.hit(this.px,this.py,'Shield save',true);this.shake.add(4);}
      if (this.py > this.H + 40) { this.state = "over"; this.shake.add(8);this.juice?.hit(this.px,this.H-50,'Rewind next time',true,true); }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { run:[this.elapsed,this.sparks,this.magnet,this.shield,this.goal,this.stage,this.land,this.rescues,this.nextGate], v: [this.px, this.py, this.vx, this.vy, this.cam, this.best, this.score, this.onGround, this.lastX, this.coyote, this.buffer, this.orbPts],
               plats: this.plats.map(p => ({ ...p })), orbs: this.orbs.map(o => ({ ...o })) };
    }
    restore(s) {
      [this.elapsed,this.sparks,this.magnet,this.shield,this.goal,this.stage,this.land,this.rescues,this.nextGate]=s.run;
      [this.px, this.py, this.vx, this.vy, this.cam, this.best, this.score, this.onGround, this.lastX, this.coyote, this.buffer, this.orbPts] = s.v;
      this.plats = s.plats.map(p => ({ ...p })); this.orbs = s.orbs.map(o => ({ ...o }));
    }
    render(ctx) {
      for (const p of this.plats) {
        const sy=p.y+this.cam;if(sy < -35 || sy>this.H+35 || p.life<=0)continue;
        const color=C[p.kind||0];ctx.save();ctx.globalAlpha=p.life===undefined?1:Math.min(1,p.life*2);
        ctx.fillStyle='#071b2e';ctx.beginPath();ctx.moveTo(p.x,sy+6);ctx.lineTo(p.x+p.w,sy+6);ctx.lineTo(p.x+p.w-12,sy+25);ctx.lineTo(p.x+12,sy+25);ctx.closePath();ctx.fill();
        NE.glowRect(ctx,color,p.x,sy,p.w,5,2);ctx.fillStyle='#d5ffff';ctx.fillRect(p.x+8,sy+1,p.w-16,2);
        for(let x=p.x+12;x<p.x+p.w-8;x+=22){ctx.fillStyle=color;ctx.globalAlpha=.35;ctx.fillRect(x,sy+10,9,3);}
        if(p.kind===1)NE.text(ctx,'↔',p.x+p.w/2,sy+5,{size:13,align:'center',glow:false});
        if(p.kind===2)NE.text(ctx,'!',p.x+p.w/2,sy+5,{size:13,align:'center',glow:false});ctx.restore();
      }
      for(const o of this.orbs)if(o.on){const y=o.y+this.cam;if(y<-40||y>this.H+40)continue;this.world?.glow(ctx,o.x,y,25);ctx.save();ctx.translate(o.x,y);ctx.rotate(Math.PI/4);ctx.fillStyle=P.amber;ctx.fillRect(-6,-6,12,12);ctx.fillStyle='#fff2b0';ctx.fillRect(-2,-2,4,4);ctx.restore();}
      this.world?.glow(ctx,this.px,this.py,90);
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(this.px,this.py+22,18,5,0,0,NE.TAU);ctx.fill();
      ctx.save();ctx.translate(this.px,this.py);const stretch=Forkade.settings.reduceMotion?0:Math.max(-.18,Math.min(.18,-this.vy/4000))-(this.land>0?.15:0);ctx.scale(1-stretch,1+stretch);NE.drawEcho(ctx,0,0,20,P.cyan,this.vx>=0?1:-1,this.elapsed);ctx.restore();
      if(this.shield){ctx.strokeStyle='#b0ffcd';ctx.lineWidth=2;ctx.beginPath();ctx.arc(this.px,this.py,29,0,NE.TAU);ctx.stroke();}
      NE.text(ctx,String(this.score),20,16,{size:38});NE.text(ctx,Math.floor(this.best/10)+'m · SKY '+(this.stage+1),20,58,{size:16,color:'#b0ffcd',glow:false});
      NE.text(ctx,'◆ '+this.sparks+'/'+this.goal+' sparks · +50',20,82,{size:16,color:P.amber,glow:false});
      if(this.magnet>0)NE.text(ctx,'Magnet '+Math.ceil(this.magnet)+'s',this.W-20,88,{size:16,align:'right',color:P.amber,glow:false});
      if(this.state==='over'){NE.banner(ctx,this.W,this.H,'Sky run complete',Math.floor(this.best/10)+'m · '+this.sparks+' sparks · combo '+(this.juice?.best||0));const best=NE.scores.get(this.id);NE.text(ctx,best>this.score?(best-this.score)+' points to your best':'Your best flight',this.W/2,this.H/2+130,{size:18,align:'center',glow:false});}
    }
  }
  NE.register("skyhop",
    { polished:true, world:["#020e20","#103a50","#22e4ff"], music:{root:164.81,tempo:112,wave:"triangle"}, hint:"Hold jump · steer left / right", touch: "lr", title: "Sky Hop", genre: "Platformer", color: P.cyan,
      desc: "Ride floating sky islands, gather sparks and unlock a magnet. Your shield saves one fall; rewind saves the next." },
    SkyHop);
})();
