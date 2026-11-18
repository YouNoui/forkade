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
      this.G = this.H - GROUND_OFF;
      this.dist = 0; this.speed = 270; this.y = this.G - 18; this.vy = 0; this.onGround = true;
      this.dash = 0; this.cool = 0; this.lives = 3; this.inv = 0;
      this.combo = 0; this.best = 0; this.smashPts = 0; this.score = 0;
      this.obs = []; this.debris = []; this.nextX = 700;
      this.state = "play";
      while (this.nextX < this.W + 600) this.spawn();
    }
    // obstacles live in world space (x along the street)
    spawn() {
      const r = NE.rng(), x = this.nextX, hard = Math.min(1, this.dist / 12000);
      if (r < 0.55) {
        const panes = 3 + ((NE.rng() * 3) | 0);                         // glass wall: SMASH
        this.obs.push({ x, kind: "glass", h: panes * 34, panes, hit: false });
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
        this.debris.push({ x: sx + NE.rand(-6, 6), y: NE.rand(top, bottom), vx: NE.rand(80, 420), vy: NE.rand(-380, 40),
                           rot: NE.rand(0, NE.TAU), vr: NE.rand(-12, 12), s: NE.rand(4, 9), c: color, life: NE.rand(0.8, 1.6) });
      if (this.debris.length > MAX_DEBRIS) this.debris.splice(0, this.debris.length - MAX_DEBRIS);
    }
    crash(o) {
      if (this.inv > 0) return;
      this.lives--; this.inv = 1.4; this.combo = 0;
      NE.sfx.hit(); this.shake.add(12);
      this.particles.emit(ECHO_X, this.y, P.red, { n: 24, speed: 5 });
      if (this.lives <= 0) this.state = "over";
    }
    step(dt) {
      const I = this.input;
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
            NE.sfx.explode(); this.shake.add(4 + Math.min(8, this.combo));
            if (this.combo % 5 === 0) this.reward(3 + this.combo / 5, `x${this.combo} combo`, "combo" + this.combo);
          } else {
            this.shatter(o.x, top, this.G, 8, o.kind === "glass" ? P.cyan : P.magenta);
            this.crash(o);
          }
        }
      }
      this.obs = this.obs.filter(o => o.x - this.dist > -80);
      while (this.nextX - this.dist < this.W + 400) this.spawn();

      for (const d of this.debris) {
        d.vy += 1100 * dt; d.x += (d.vx - this.speed * 0.6) * dt; d.y += d.vy * dt; d.rot += d.vr * dt; d.life -= dt;
        if (d.y > this.G) { d.y = this.G; d.vy *= -0.3; d.vx *= 0.5; }
      }
      this.debris = this.debris.filter(d => d.life > 0);
      this.best = Math.max(this.best, this.combo);
      this.score = ((this.dist / 10) | 0) + this.smashPts;
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { v: [this.dist, this.speed, this.y, this.vy, this.onGround, this.dash, this.cool, this.lives, this.inv,
                   this.combo, this.best, this.smashPts, this.score, this.nextX],
               obs: this.obs.map(o => ({ ...o })), debris: this.debris.map(d => ({ ...d })) };
    }
    restore(s) {
      [this.dist, this.speed, this.y, this.vy, this.onGround, this.dash, this.cool, this.lives, this.inv,
       this.combo, this.best, this.smashPts, this.score, this.nextX] = s.v;
      this.obs = s.obs.map(o => ({ ...o })); this.debris = s.debris.map(d => ({ ...d }));
    }
    render(ctx) {
      // parallax skyline (pure function of distance, so it rewinds for free)
      for (const [layer, col, sp, hmin, hmax] of [[0, "rgba(160,123,255,0.16)", 0.2, 120, 260], [1, "rgba(255,62,165,0.14)", 0.45, 70, 180]]) {
        const off = (this.dist * sp) % 90;
        for (let i = -1; i < this.W / 90 + 2; i++) {
          const seed = Math.floor(this.dist * sp / 90) + i + layer * 97;
          const h = hmin + ((Math.sin(seed * 12.9898) * 43758.5453) % 1 + 1) % 1 * (hmax - hmin);
          ctx.fillStyle = col; ctx.fillRect(i * 90 - off, this.G - h, 70, h);
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
            ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = P.cyan; ctx.fillRect(sx, y + 2, 18, 30); ctx.restore();
            NE.glowRect(ctx, P.cyan, sx, y + 2, 18, 30, 3, 1.5);
          }
        } else if (o.kind === "solid") {
          NE.glowRect(ctx, P.magenta, sx - 4, this.G - o.h, 26, o.h, 4);
          NE.text(ctx, "▲", sx + 9, this.G - o.h - 22, { size: 14, color: P.magenta, align: "center", glow: false });
        } else {
          ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = P.lime; ctx.fillRect(sx - 14, o.y - 18, 28, 36); ctx.restore();
          NE.glowRect(ctx, P.lime, sx - 14, o.y - 18, 28, 36, 4, 1.5);
        }
      }
      for (const d of this.debris) {
        ctx.save(); ctx.globalAlpha = Math.min(1, d.life * 1.5); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
        ctx.shadowColor = d.c; ctx.shadowBlur = 8; ctx.fillStyle = d.c;
        ctx.beginPath(); ctx.moveTo(-d.s / 2, d.s / 2); ctx.lineTo(d.s / 2, d.s / 3); ctx.lineTo(0, -d.s / 2); ctx.fill(); ctx.restore();
      }
      if (NE.settings.reduceMotion || !(this.inv > 0 && Math.floor(this.inv * 12) % 2)) {
        if (this.dash > 0) NE.glowCircle(ctx, P.cyan, ECHO_X + 18, this.y, 20, 3);
        NE.drawEcho(ctx, ECHO_X, this.y, 16, NE.palette.cyan, 1, this.t);
      }
      NE.text(ctx, String(this.score), 20, 16, { size: 40 });
      NE.text(ctx, `${Math.round(this.speed)} km/h`, 22, 64, { size: 14, color: P.dim });
      if (this.combo > 1) NE.text(ctx, `COMBO x${this.combo}`, this.W / 2, 22, { size: 26, color: P.amber, align: "center" });
      for (let i = 0; i < this.lives; i++) NE.glowCircle(ctx, P.cyan, this.W - 30 - i * 26, 28, 7);
      if (this.dist < 2200)
        NE.text(ctx, "glass = SMASH (→ / ▶ / tap right)   ·   pink wall = JUMP (SPACE / ACT)", this.W / 2, this.H - 30,
                { size: 13, color: P.dim, align: "center" });
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "WIPED OUT", `score ${this.score}  ·  best combo x${this.best}   -   ENTER / tap to retry`);
    }
  }
  NE.register("glass",
    { touch: "lr", title: "GLASS CITY", genre: "Run & smash", color: P.cyan,
      desc: "Sprint through a neon city: smash the glass, jump the walls, chain combos. Crashed? Rewind the jump." },
    Glass);
})();
