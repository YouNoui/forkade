/* GAME 11 - GLASS CITY : run-and-smash destruction.
   ECHO sprints through a neon city on his own. Glass walls: SMASH them (→ / D, or the ▶ button).
   Solid walls: JUMP them (SPACE / ↑, or ACT). Floating panes: jump through for a bonus.
   Chain smashes for a combo. Hit a solid wall, or a glass wall without smashing, and you lose a life.
   Crashed? Hold R and take the jump again. */
(function () {
  const NE = Forkade, P = NE.palette;
  const GROUND_OFF = 70, ECHO_X = 190, MAX_DEBRIS = 160;

  class Glass extends NE.GameBase {
    reset() {
      this.elapsed=0;this.fxSeed=8917;this.smashed=0;this.shield=0;this.smashGoal=false;this.nextVault=120;this.makePane();this.G = this.H - GROUND_OFF;
      this.dist = 0; this.speed = 270; this.y = this.G - 18; this.vy = 0; this.onGround = true;
      this.dash = 0; this.cool = 0; this.lives = 3; this.inv = 0;
      this.combo = 0; this.best = 0; this.smashPts = 0; this.score = 0;
      this.obs = []; this.debris = []; this.nextX = 700;
      this.state = "play";
      while (this.nextX < this.W + 600) this.spawn();
    }
    fx(a,b){this.fxSeed=(Math.imul(this.fxSeed,1664525)+1013904223)>>>0;return a+(b-a)*this.fxSeed/4294967296;}
    makePane(){this.pane=document.createElement('canvas');this.pane.width=24;this.pane.height=34;const c=this.pane.getContext('2d'),g=c.createLinearGradient(0,0,24,34);g.addColorStop(0,'#c4ffff');g.addColorStop(.3,'#28bfc955');g.addColorStop(1,'#103b6e');c.fillStyle=g;c.beginPath();c.roundRect(2,2,18,30,3);c.fill();c.strokeStyle=P.cyan;c.lineWidth=2;c.stroke();c.strokeStyle='#e5ffff';c.beginPath();c.moveTo(5,4);c.lineTo(5,23);c.moveTo(9,5);c.lineTo(17,5);c.stroke();}
    smashReward(o){this.smashed++;this.juice?.hit(ECHO_X,this.y,'SMASH ×'+this.combo,true);
      if(this.smashed%5===0){this.shield=1;this.juice?.hit(ECHO_X,this.y-45,'PRISM SHIELD',true);}
      if(this.smashed>=8&&!this.smashGoal){this.smashGoal=true;this.smashPts+=300;this.juice?.hit(this.W/2,100,'8 WALLS +300',true);}
      if(o.vault){this.smashPts+=500;this.juice?.hit(ECHO_X,this.y-65,'VAULT +500',true);}
    }
    // obstacles live in world space (x along the street)
    spawn() {
      const r = NE.rng(), x = this.nextX, hard = Math.min(1, this.dist / 12000);
      const vault=this.elapsed>=this.nextVault;if(vault)this.nextVault+=120;
      if (r < 0.55 || vault) {
        const panes = vault?8:3 + ((NE.rng() * 3) | 0);                         // glass wall: SMASH
        this.obs.push({ x, kind: "glass", h: panes * 34, panes,...(vault?{vault:true}:{}),hit: false });
      } else if (r < 0.85) {
        this.obs.push({ x, kind: "solid", h: 46 + ((NE.rng() * 24) | 0), hit: false });  // JUMP
      } else {
        this.obs.push({ x, kind: "pane", y: this.G - 120 - NE.rng() * 60, hit: false });   // bonus in the air
      }
      this.nextX = x + NE.rand(300, 470) - hard * 90;
    }
    shatter(wx, top, bottom, n, color) {
      const sx = wx - this.dist + ECHO_X;
      for (let k = 0; k < n; k++)
        this.debris.push({ x: sx + this.fx(-6, 6), y: this.fx(top, bottom), vx: this.fx(80, 420), vy: this.fx(-380, 40),
                           rot: this.fx(0, NE.TAU), vr: this.fx(-12, 12), s: this.fx(4, 9), c: color, life: this.fx(0.8, 1.6) });
      if (this.debris.length > MAX_DEBRIS) this.debris.splice(0, this.debris.length - MAX_DEBRIS);
    }
    crash(o) {
      if (this.inv > 0) return;if(this.shield){this.shield=0;this.inv=1.4;this.juice?.hit(ECHO_X,this.y,"SHIELD SAVE",true);NE.sfx.pickup();return;}
      this.lives--; this.inv = 1.4; this.combo = 0;
      NE.sfx.hit();this.juice?.hit(ECHO_X,this.y,"OUCH",true,true); this.shake.add(12);
      this.particles.emit(ECHO_X, this.y, P.red, { n: 24, speed: 5 });
      if (this.lives <= 0) this.state = "over";
    }
    step(dt) {
      this.elapsed+=dt;const I = this.input;
      if (this.state !== "play") return;
      this.dist += this.speed * dt;
      this.speed = Math.min(600, 270 + this.dist / 55);

      // controls: jump = SPACE / ↑ / W (touch ACT), smash = → / D (touch ▶)
      if ((I.pressed.Space || I.pressed.ArrowUp || I.pressed.KeyW) && this.onGround) {
        this.vy = -640; this.onGround = false; NE.sfx.jump();
      }
      this.cool -= dt; this.dash -= dt; this.inv -= dt;
      if ((I.pressed.ArrowRight || I.pressed.KeyD || (I.tapped && I.mouse.x > this.W / 2)) && this.cool <= 0) {
        this.dash = 0.28; this.cool = 0.36; NE.sfx.shoot();
      }
      if (!this.onGround) {
        this.vy += 1700 * dt; if (!(I.keys.Space || I.keys.ArrowUp || I.keys.KeyW) && this.vy < 0) this.vy += 1500 * dt;
        this.y += this.vy * dt;
        if (this.y >= this.G - 18) { this.y = this.G - 18; this.vy = 0; this.onGround = true; }
      }

      // collisions: ECHO is at world x = dist
      for (const o of this.obs) {
        if (o.hit) continue;
        const dx = o.x - this.dist;
        if (o.kind === "pane") {
          if (Math.abs(dx) < 22 && Math.abs(this.y - o.y) < 34) {
            o.hit = true; this.combo++; const pts = 40 * this.combo; this.smashPts += pts;
            this.shatter(o.x, o.y - 20, o.y + 20, 10, P.lime); NE.sfx.pickup(); this.shake.add(2);
          }
          continue;
        }
        if (dx > -10 && dx < 24) {
          const top = this.G - o.h;
          if (this.y + 16 < top) continue;                 // cleared it in the air
          o.hit = true;
          if (o.kind === "glass" && this.dash > 0) {
            this.combo++; const pts = 25 * o.panes * this.combo; this.smashPts += pts;
            this.shatter(o.x, top, this.G, 8 + o.panes * 4, P.cyan);
            NE.sfx.explode();this.smashReward(o); this.shake.add(4 + Math.min(8, this.combo));
            if (this.combo % 5 === 0) this.reward(3 + this.combo / 5, `x${this.combo} combo`, "combo" + this.combo);
          } else {
            this.shatter(o.x, top, this.G, 8, o.kind === "glass" ? P.cyan : P.magenta);
            this.crash(o);
          }
        }
      }
      let live=0;for(const o of this.obs)if(o.x-this.dist>-80)this.obs[live++]=o;this.obs.length=live;
      while (this.nextX - this.dist < this.W + 400) this.spawn();

      for (const d of this.debris) {
        d.vy += 1100 * dt; d.x += (d.vx - this.speed * 0.6) * dt; d.y += d.vy * dt; d.rot += d.vr * dt; d.life -= dt;
        if (d.y > this.G) { d.y = this.G; d.vy *= -0.3; d.vx *= 0.5; }
      }
      live=0;for(const d of this.debris)if(d.life>0)this.debris[live++]=d;this.debris.length=live;
      this.best = Math.max(this.best, this.combo);
      this.score = ((this.dist / 10) | 0) + this.smashPts;
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { v: [this.dist, this.speed, this.y, this.vy, this.onGround, this.dash, this.cool, this.lives, this.inv,
                   this.combo, this.best, this.smashPts, this.score, this.nextX],
               obs: this.obs.map(o => ({ ...o })), debris: this.debris.map(d => ({ ...d })),elapsed:this.elapsed,fxSeed:this.fxSeed,smashed:this.smashed,shield:this.shield,smashGoal:this.smashGoal,nextVault:this.nextVault };
    }
    restore(s) {
      [this.dist, this.speed, this.y, this.vy, this.onGround, this.dash, this.cool, this.lives, this.inv,
       this.combo, this.best, this.smashPts, this.score, this.nextX] = s.v;
      Object.assign(this,{elapsed:s.elapsed,fxSeed:s.fxSeed,smashed:s.smashed,shield:s.shield,smashGoal:s.smashGoal,nextVault:s.nextVault});this.obs = s.obs.map(o => ({ ...o })); this.debris = s.debris.map(d => ({ ...d }));
    }
    render(ctx) {
      // parallax skyline (pure function of distance, so it rewinds for free)
      for (const [layer, col, sp, hmin, hmax] of [[0, "rgba(160,123,255,0.16)", 0.2, 120, 260], [1, "rgba(255,62,165,0.14)", 0.45, 70, 180]]) {
        const off = (this.dist * sp) % 90;
        for (let i = -1; i < this.W / 90 + 2; i++) {
          const seed = Math.floor(this.dist * sp / 90) + i + layer * 97;
          const h = hmin + ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1 * (hmax - hmin);
          ctx.fillStyle=col;ctx.fillRect(i*90-off,this.G-h,70,h);ctx.fillStyle='rgba(142,231,240,.14)';for(let row=0;row<5;row++)ctx.fillRect(i*90-off+8,this.G-h+15+row*24,45,3);
        }
      }
      NE.glowLine(ctx, P.magenta, 0, this.G, this.W, this.G, 2);
      for (let k = 0; k < 14; k++) {             // moving street lines
        const x = ((k * 80 - this.dist) % (this.W + 80) + this.W + 80) % (this.W + 80) - 40;
        NE.glowLine(ctx, "rgba(255,62,165,0.35)", x, this.G + 18, x + 36, this.G + 18, 2);
      }
      for (const o of this.obs) {
        if (o.hit) continue;
        const sx = o.x - this.dist + ECHO_X;
        if (o.kind === "glass") {
          for (let k = 0; k < o.panes; k++) {
            const y = this.G - (k + 1) * 34;
            ctx.drawImage(this.pane,sx-2,y);if(o.vault){ctx.fillStyle=P.amber;ctx.fillRect(sx+5,y+14,8,4);}
          }
        } else if (o.kind === "solid") {
          ctx.save();ctx.fillStyle='#602951';ctx.strokeStyle=P.magenta;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx-4,this.G);ctx.lineTo(sx+1,this.G-o.h);ctx.lineTo(sx+17,this.G-o.h);ctx.lineTo(sx+22,this.G);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle='#ffb7d9';ctx.beginPath();ctx.moveTo(sx+2,this.G-15);ctx.lineTo(sx+17,this.G-o.h+10);ctx.stroke();ctx.restore();
          NE.text(ctx, "▲", sx + 9, this.G - o.h - 22, { size: 14, color: P.magenta, align: "center", glow: false });
        } else {
          ctx.save();ctx.fillStyle=P.lime;ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();for(let k=0;k<6;k++){const a=k*NE.TAU/6;ctx.lineTo(sx+Math.cos(a)*17,o.y+Math.sin(a)*22);}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=P.bg;ctx.fillRect(sx-2,o.y-8,4,16);ctx.fillRect(sx-7,o.y-2,14,4);ctx.restore();
        }
      }
      for (const d of this.debris) {
        ctx.save(); ctx.globalAlpha = Math.min(1, d.life * 1.5); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
        ctx.shadowColor = d.c; ctx.shadowBlur = 8; ctx.fillStyle = d.c;
        ctx.beginPath(); ctx.moveTo(-d.s / 2, d.s / 2); ctx.lineTo(d.s / 2, d.s / 3); ctx.lineTo(0, -d.s / 2); ctx.fill(); ctx.restore();
      }
      if (NE.settings.reduceMotion || !(this.inv > 0 && Math.floor(this.inv * 12) % 2)) {
        if (this.dash > 0) NE.glowCircle(ctx, P.cyan, ECHO_X + 18, this.y, 20, 3);
        if(this.shield)NE.glowCircle(ctx,P.lime,ECHO_X,this.y,28,2);NE.drawEcho(ctx, ECHO_X, this.y, 18, NE.palette.cyan, 1, this.t);
      }
      NE.text(ctx, String(this.score), 20, 16, { size: 40 });
      NE.text(ctx, `${Math.floor(this.dist/10)} m · ${this.smashed} walls`, 22, 64, { size: 14, color: P.dim });
      NE.text(ctx,this.shield?"SHIELD READY":`SHIELD ${this.smashed%5}/5`,22,88,{size:15,color:P.lime});NE.text(ctx,this.smashGoal?"8 WALLS ✓":`GOAL ${this.smashed}/8 WALLS`,22,112,{size:15,color:P.amber});
      if (this.combo > 1) NE.text(ctx, `COMBO x${this.combo}`, this.W / 2, 22, { size: 26, color: P.amber, align: "center" });
      for (let i = 0; i < this.lives; i++) NE.glowCircle(ctx, P.cyan, this.W - 30 - i * 26, 28, 7);
      if (this.dist < 2200)
        NE.text(ctx, "glass = SMASH (→ / ▶ / tap right)   ·   pink wall = JUMP (SPACE / ACT)", this.W / 2, this.H - 30,
                { size: 13, color: P.dim, align: "center" });
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "WIPED OUT", `score ${this.score} · ${this.smashed} walls · best combo ×${this.best} · tap to retry`);
    }
  }
  NE.register("glass",
    { polished:true,world:["#081b2c","#123641","#6bded6"],scene:"reactor",music:{root:207.65,tempo:128,wave:"sine"},hint:"JUMP WALLS · TAP RIGHT TO SMASH",touch: "lr", title: "GLASS CITY", genre: "Run & smash", color: P.cyan,
      desc: "Sprint through a neon city: smash the glass, jump the walls, chain combos. Crashed? Rewind the jump." },
    Glass);
})();
