/* GAME 6 - Driftstorm : neon asteroids */
(function () {
  const NE = Forkade, P = NE.palette, TAU = NE.TAU;

  class Drift extends NE.GameBase {
    reset() {
      this.elapsed=0;this.kills=0;this.twin=0;this.killGoal=false;this.nextGuardian=120;this.makeRocks();this.px = this.W / 2; this.py = this.H / 2; this.vx = 0; this.vy = 0;
      this.ang = -Math.PI / 2; this.hp = 3; this.score = 0;
      this.bullets = []; this.rocks = [];this.spareRocks=[]; this.cool = 0; this.inv = 0; this.state = "play"; this.wave = 1;
      for (let i = 0; i < 4; i++) this.spawnRock();
    }
    spawnRock(x, y, size = 3,guardian=false) {
      if(this.rocks.length>=96)return;
      if (x == null) {
        if (NE.rng() < 0.5) { x = NE.rng() < 0.5 ? 0 : this.W; y = NE.rand(0, this.H); }
        else { x = NE.rand(0, this.W); y = NE.rng() < 0.5 ? 0 : this.H; }
      }
      const a = NE.rand(0, TAU), sp = NE.rand(30, 80) / size;
      this.rocks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size,hp:guardian?12:1,guardian,spin:NE.rand(0,TAU) });
    }
    makeRocks(){this.rockTiles={};for(const size of [1,2,3,5]){const c=document.createElement('canvas'),rad=size*12;c.width=c.height=rad*2+8;const x=c.getContext('2d'),m=rad+4,g=x.createRadialGradient(m-rad*.3,m-rad*.4,1,m,m,rad);g.addColorStop(0,size===5?'#ffe69d':'#a8a0c4');g.addColorStop(.5,size===5?'#a45c39':'#504965');g.addColorStop(1,'#191d30');x.fillStyle=g;x.strokeStyle=size===5?P.amber:P.violet;x.lineWidth=2;x.beginPath();for(let k=0;k<10;k++){const a=k/10*TAU,r=rad*(.8+.17*Math.sin(k*17+size));x.lineTo(m+Math.cos(a)*r,m+Math.sin(a)*r);}x.closePath();x.fill();x.stroke();x.fillStyle='rgba(8,10,25,.45)';for(let k=0;k<4;k++){const a=k*2.1;x.beginPath();x.ellipse(m+Math.cos(a)*rad*.35,m+Math.sin(a)*rad*.35,rad*.15,rad*.1,a,0,TAU);x.fill();}this.rockTiles[size]=c;}}
    step(dt) {
      this.elapsed+=dt;this.twin=Math.max(0,this.twin-dt);if(this.elapsed>=this.nextGuardian){this.nextGuardian+=120;if(!this.rocks.some(r=>r.guardian)){this.spawnRock(this.W/2,0,5,true);this.juice?.hit(this.W/2,100,"Guardian comet",true);}}const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }
      const turn = (I.right() ? 1 : 0) - (I.left() ? 1 : 0);
      this.ang += turn * 3.4 * dt;
      if (I.up()) {
        this.vx += Math.cos(this.ang) * 260 * dt; this.vy += Math.sin(this.ang) * 260 * dt;
        this.particles.emit(this.px - Math.cos(this.ang) * 14, this.py - Math.sin(this.ang) * 14,
          P.amber, { n: 2, angle: this.ang + Math.PI, spread: 0.4, speed: 2, life: 0.3 });
      }
      this.vx *= 0.99; this.vy *= 0.99;
      this.px = (this.px + this.vx * dt + this.W) % this.W;
      this.py = (this.py + this.vy * dt + this.H) % this.H;
      this.cool -= dt; this.inv = Math.max(0, this.inv - dt);
      if (I.keys.Space && this.cool <= 0) {
        this.cool=this.twin>0?.18:.22;NE.sfx.shoot();for(const offset of this.twin>0?[-.12,.12]:[0]){const a=this.ang+offset;if(this.bullets.length<96)this.bullets.push({x:this.px,y:this.py,vx:Math.cos(a)*520+this.vx,vy:Math.sin(a)*520+this.vy,life:1.2});}
        this.shake.add(1.5);
      }
      for (const b of this.bullets) {
        b.x = (b.x + b.vx * dt + this.W) % this.W; b.y = (b.y + b.vy * dt + this.H) % this.H; b.life -= dt;
      }
      let live=0;for(const b of this.bullets)if(b.life>0)this.bullets[live++]=b;this.bullets.length=live;
      for (const r of this.rocks) {
        r.x = (r.x + r.vx * dt + this.W) % this.W; r.y = (r.y + r.vy * dt + this.H) % this.H; r.spin += dt;
      }
      const previous=this.rocks;this.rocks=this.spareRocks;this.rocks.length=0;this.spareRocks=previous;
      for (const r of previous) {
        const rad = r.size * 12; let hit = false;
        for (const b of this.bullets)
          if (b.life>0 && (b.x - r.x) ** 2 + (b.y - r.y) ** 2 < rad * rad) { hit = true; b.life = 0; break; }
        if(hit&&(r.hp=(r.hp||1)-1)>0){this.rocks.push(r);this.juice?.hit(r.x,r.y,r.hp+" HITS LEFT",false);continue;}
        if (hit) {
          this.kills++;if(this.kills%6===0){this.twin=8;this.juice?.hit(this.px,this.py,"Twin shot 8s",true);}if(this.kills>=12&&!this.killGoal){this.killGoal=true;this.score+=200;this.juice?.hit(this.W/2,100,"12 ROCKS +200",true);}if(r.guardian)this.score+=400;this.juice?.hit(r.x,r.y,r.guardian?"Guardian +400":"+15",true);
          this.score += 15; this.shake.add(3); NE.sfx.explode(); this.particles.emit(r.x, r.y, P.cyan, { n: 12, speed: 4 });
          if (r.size > 1 && !r.guardian) for (let i = 0; i < 2; i++) this.spawnRock(r.x, r.y, r.size - 1);
        } else this.rocks.push(r);
      }
      if(this.rocks.length>96)this.rocks.length=96;
      if (this.inv <= 0)
        for (const r of this.rocks) {
          const rad = r.size * 12 + 10;
          if ((this.px - r.x) ** 2 + (this.py - r.y) ** 2 < rad * rad) {
            this.hp -= 1;this.juice?.hit(this.px,this.py,"Hull hit",true,true); this.inv = 1.5; this.shake.add(12); NE.sfx.hit();
            this.particles.emit(this.px, this.py, P.red, { n: 20, speed: 5 });
            if (this.hp <= 0) this.state = "over";
            break;
          }
        }
      if (!this.rocks.length) {   // next wave: more rocks, +1 hull every 3 waves
        this.wave++; this.score += 100 * this.wave;
        if (this.wave % 3 === 0) this.hp = Math.min(5, this.hp + 1);
        for (let i = 0; i < Math.min(10, 3 + this.wave); i++) this.spawnRock();
        NE.sfx.win(); this.reward(2 + 2 * this.wave, `wave ${this.wave}`, "wave" + this.wave);
      }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { px: this.px, py: this.py, vx: this.vx, vy: this.vy, ang: this.ang,
               hp:this.hp,score:this.score,inv:this.inv,wave:this.wave,cool:this.cool,elapsed:this.elapsed,kills:this.kills,twin:this.twin,killGoal:this.killGoal,nextGuardian:this.nextGuardian,
               b: this.bullets.map(o => ({ ...o })), r: this.rocks.map(o => ({ ...o })) };
    }
    restore(s) {
      this.px = s.px; this.py = s.py; this.vx = s.vx; this.vy = s.vy; this.ang = s.ang;
      this.hp=s.hp;this.score=s.score;this.inv=s.inv;this.wave=s.wave;Object.assign(this,{cool:s.cool,elapsed:s.elapsed,kills:s.kills,twin:s.twin,killGoal:s.killGoal,nextGuardian:s.nextGuardian});
      this.bullets = s.b.map(o => ({ ...o })); this.rocks = s.r.map(o => ({ ...o }));
    }
    render(ctx) {
      for(const r of this.rocks){const tile=this.rockTiles[r.size];ctx.save();ctx.translate(r.x,r.y);ctx.rotate(NE.settings.reduceMotion?0:r.spin);ctx.drawImage(tile,-tile.width/2,-tile.height/2);ctx.restore();if(r.guardian)NE.bar(ctx,r.x-35,r.y-r.size*12-10,70,5,r.hp/12,P.amber);}
      for (const b of this.bullets) NE.glowCircle(ctx, P.cyan, b.x, b.y, 3);
      if (NE.settings.reduceMotion || this.inv <= 0 || ((this.t * 20) | 0) % 2 === 0) {
        const x = this.px, y = this.py, a = this.ang;
        const nose = [x + Math.cos(a) * 18, y + Math.sin(a) * 18];
        const l = [x + Math.cos(a + 2.5) * 14, y + Math.sin(a + 2.5) * 14];
        const rr = [x + Math.cos(a - 2.5) * 14, y + Math.sin(a - 2.5) * 14];
        ctx.save();ctx.fillStyle='#145064';ctx.beginPath();ctx.moveTo(nose[0],nose[1]);ctx.lineTo(l[0],l[1]);ctx.lineTo(x,y);ctx.lineTo(rr[0],rr[1]);ctx.closePath();ctx.fill();ctx.restore();NE.glowLine(ctx,P.cyan,nose[0],nose[1],l[0],l[1],3);
        NE.glowLine(ctx, P.cyan, nose[0], nose[1], rr[0], rr[1], 3);
        NE.glowLine(ctx, P.cyan, l[0], l[1], rr[0], rr[1], 3);
        if(this.twin>0)NE.glowCircle(ctx,P.amber,x,y,25,2);NE.drawEcho(ctx, x, y, 11, P.cyan, 1, this.t);
      }
      NE.text(ctx, String(this.score), 20, 16, { size: 40 });
      NE.text(ctx,`Wave ${this.wave}`,22,60,{size:15,color:P.dim});NE.text(ctx,this.twin>0?`Twin shot ${this.twin.toFixed(1)}s`:`Power ${this.kills%6}/6`,22,86,{size:15,color:P.amber});NE.text(ctx,this.killGoal?"12 rocks ✓":`Goal ${this.kills}/12`,22,110,{size:15,color:P.lime});
      for (let i = 0; i < this.hp; i++) NE.glowCircle(ctx, P.cyan, this.W - 30 - i * 26, 28, 7);
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "Lost in the storm", `score ${this.score} · wave ${this.wave} · ${this.kills} rocks · tap to retry`);
    }
  }
  NE.register("drift",
    { polished:true,world:["#161529","#352a46","#d499c5"],scene:"clouds",music:{root:155.56,tempo:116,wave:"triangle"},hint:"Turn · thrust · hold fire",title: "Driftstorm", genre: "Space rocks", color: P.red,
      desc: "Spin, thrust and blast neon rocks to dust. Clipped one? Rewind the drift." },
    Drift);
})();
