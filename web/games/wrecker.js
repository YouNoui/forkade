/* GAME 10 - TOWER WRECKER : launch a wrecking ball, flatten neon towers.
   Aim with the mouse (or ↑↓), hold click / SPACE to charge, release to fire.
   Glass shatters, steel takes two hits, TNT blows a hole and chains.
   Smash it, then hold R and watch the whole thing rebuild itself. */
(function () {
  const NE = Forkade, P = NE.palette, TAU = NE.TAU;
  const CELL = 20, COLS = 18, ROWS = 19;
  const EMPTY = 0, BRICK = 1, GLASS = 2, TNT = 3, STEEL = 4;
  const GRAV = 700, BALL_R = 16, MAX_DEBRIS = 180;

  class Wrecker extends NE.GameBase {
    reset() {
      this.G = this.H - 46;                       // ground line
      this.gx = this.W - COLS * CELL - 40;        // tower area left edge
      this.gy = this.G - ROWS * CELL;             // tower area top edge
      this.lx = 120; this.ly = this.G - 62;       // launch point
      this.level = 1; this.score = 0; this.state = "play";
      this.newLevel();
    }
    newLevel() {
      const g = this.grid = new Int8Array(COLS * ROWS);
      this.tint = new Int8Array(COLS * ROWS);
      const L = this.level, towers = Math.min(3, 1 + ((L + 1) / 2 | 0));
      let x = 0;
      for (let t = 0; t < towers && x < COLS - 2; t++) {
        const w = Math.min(COLS - x, 3 + ((Math.random() * 3) | 0) + (towers === 1 ? 3 : 0));
        const h = Math.min(ROWS, 8 + ((Math.random() * (5 + L * 2)) | 0));
        const tint = t % 3;
        for (let cx = x; cx < x + w; cx++) for (let r = 0; r < h; r++) {
          const row = ROWS - 1 - r, i = row * COLS + cx;
          let type = BRICK;
          if (r > 1 && r % 3 === 1 && cx > x && cx < x + w - 1) type = GLASS;       // windows
          if (L >= 3 && r === 0) type = STEEL;                                     // steel base later on
          g[i] = type; this.tint[i] = tint;
        }
        // TNT tucked inside
        for (let k = 0; k < 1 + ((L / 2) | 0); k++) {
          const cx = x + ((Math.random() * w) | 0), r = 1 + ((Math.random() * Math.max(1, h - 2)) | 0);
          g[(ROWS - 1 - r) * COLS + cx] = TNT;
        }
        x += w + 1 + ((Math.random() * 2) | 0);
      }
      this.initial = g.reduce((n, v) => n + (v ? 1 : 0), 0);
      this.destroyed = 0;
      this.target = Math.min(0.75, 0.5 + (L - 1) * 0.04);
      this.shots = 4 + Math.min(3, (L / 2) | 0);
      this.debris = [];
      this.ball = null;
      this.phase = "aim";                          // aim | fly | settle | clear
      this.aimA = -0.6; this.power = 0; this.charging = false; this.chargeT = 0;
      this.collapseT = 0; this.idleT = 0; this.waitRelease = true;
    }

    /* ---------------------------------------------------------- physics --- */
    at(cx, cy) { return (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) ? EMPTY : this.grid[cy * COLS + cx]; }
    smash(cx, cy, vx, vy, viaBlast = false) {
      const i = cy * COLS + cx, type = this.grid[i];
      if (!type) return 0;
      if (type === STEEL && !viaBlast) { this.grid[i] = BRICK; NE.sfx.hit(); this.shake.add(3); return 0.55; }
      this.grid[i] = EMPTY; this.destroyed++; this.score += type === GLASS ? 5 : 10;
      const px = this.gx + cx * CELL + CELL / 2, py = this.gy + cy * CELL + CELL / 2;
      const color = this.cellColor(type, this.tint[i]);
      const pieces = type === GLASS ? 3 : 2;
      for (let k = 0; k < pieces; k++) this.addDebris(px, py,
        vx * NE.rand(0.25, 0.6) + NE.rand(-90, 90), vy * NE.rand(0.25, 0.6) + NE.rand(-220, 40),
        color, type === GLASS ? 5 : 8);
      if (type === TNT) this.blast(cx, cy);
      return type === GLASS ? 0.97 : 0.9;           // how much speed the ball keeps
    }
    blast(cx, cy) {
      NE.sfx.explode(); this.shake.add(12);
      this.particles.emit(this.gx + cx * CELL + CELL / 2, this.gy + cy * CELL + CELL / 2, P.amber, { n: 30, speed: 7, life: 0.7, size: 4 });
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy > 6) continue;
        const ax = cx + dx, ay = cy + dy;
        if (this.at(ax, ay)) this.smash(ax, ay, dx * 260, dy * 260 - 200, true);   // chains into other TNT
      }
    }
    addDebris(x, y, vx, vy, c, s) {
      this.debris.push({ x, y, vx, vy, rot: NE.rand(0, TAU), vr: NE.rand(-9, 9), c, s, life: NE.rand(1.6, 2.6) });
      if (this.debris.length > MAX_DEBRIS) this.debris.shift();
    }
    stepBall(dt) {
      const b = this.ball;
      const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 6));
      const h = dt / steps;
      for (let s = 0; s < steps && this.ball; s++) {
        b.vy += GRAV * h; b.x += b.vx * h; b.y += b.vy * h;
        // cells under the ball
        const c0 = Math.floor((b.x - BALL_R - this.gx) / CELL), c1 = Math.floor((b.x + BALL_R - this.gx) / CELL);
        const r0 = Math.floor((b.y - BALL_R - this.gy) / CELL), r1 = Math.floor((b.y + BALL_R - this.gy) / CELL);
        for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
          if (!this.at(cx, cy)) continue;
          const nx = Math.max(this.gx + cx * CELL, Math.min(b.x, this.gx + cx * CELL + CELL));
          const ny = Math.max(this.gy + cy * CELL, Math.min(b.y, this.gy + cy * CELL + CELL));
          if ((nx - b.x) ** 2 + (ny - b.y) ** 2 > BALL_R * BALL_R) continue;
          const keep = this.smash(cx, cy, b.vx, b.vy);
          b.vx *= keep; b.vy *= keep;
          if (keep < 0.7) { b.vx *= -0.35; }          // steel knocks it back
          this.shake.add(0.8);
        }
        if (b.y > this.G - BALL_R) {
          b.y = this.G - BALL_R; b.vy *= -0.35; b.vx *= 0.7;
          if (Math.abs(b.vy) > 60) { NE.sfx.bounce(); this.shake.add(3); }
        }
      }
      const sp = Math.hypot(b.vx, b.vy);
      b.trail.push([b.x, b.y]); if (b.trail.length > 12) b.trail.shift();
      if (b.x > this.W + 60 || b.x < -60 || (sp < 40 && b.y >= this.G - BALL_R - 1)) {
        this.ball = null; this.phase = "settle"; this.idleT = 0;
      }
    }
    // loose cells drop one row per tick, so towers crumble from the hole up
    collapse() {
      let moved = false;
      for (let cy = ROWS - 2; cy >= 0; cy--) for (let cx = 0; cx < COLS; cx++) {
        const i = cy * COLS + cx, j = i + COLS;
        if (this.grid[i] && !this.grid[j]) {
          this.grid[j] = this.grid[i]; this.tint[j] = this.tint[i]; this.grid[i] = EMPTY; moved = true;
        }
      }
      return moved;
    }

    /* ------------------------------------------------------------- loop --- */
    step(dt) {
      const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }

      for (const d of this.debris) {
        d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; d.life -= dt;
        if (d.y > this.G - d.s / 2) { d.y = this.G - d.s / 2; d.vy *= -0.3; d.vx *= 0.6; d.vr *= 0.5; }
      }
      this.debris = this.debris.filter(d => d.life > 0);

      this.collapseT += dt;
      let moving = false;
      if (this.collapseT >= 0.045) { this.collapseT = 0; moving = this.collapse(); if (moving) this.idleT = 0; }

      if (this.phase === "aim") {
        // aim: mouse direction from the launcher, or ↑↓
        const mx = I.mouse.x - this.lx, my = I.mouse.y - this.ly;
        if (I.up()) this.aimA -= 1.4 * dt;
        else if (I.down()) this.aimA += 1.4 * dt;
        else if (mx > 10) this.aimA = Math.atan2(my, mx);
        this.aimA = Math.max(-1.35, Math.min(0.15, this.aimA));
        const hold = I.keys.Space || I.mouse.down;
        if (this.waitRelease) { if (!hold) this.waitRelease = false; }
        else if (hold) { this.charging = true; this.chargeT += dt; this.power = 0.5 - 0.5 * Math.cos(this.chargeT * 3.2); }
        else if (this.charging) this.fire();
      } else if (this.phase === "fly") {
        this.stepBall(dt);
      } else if (this.phase === "settle") {
        this.idleT += dt;
        if (this.idleT > 0.5) {
          if (this.destroyed / this.initial >= this.target) {
            this.phase = "clear"; this.score += this.shots * 150; NE.sfx.win();
          } else if (this.shots <= 0) this.state = "over";
          else this.phase = "aim";
        }
      } else if (this.phase === "clear") {
        if (I.pressed.Enter || I.pressed.Space || I.mouse.down) { this.level++; this.newLevel(); }
      }
    }
    fire() {
      const sp = 380 + this.power * 820;
      this.ball = { x: this.lx, y: this.ly, vx: Math.cos(this.aimA) * sp, vy: Math.sin(this.aimA) * sp, trail: [] };
      this.shots--; this.charging = false; this.chargeT = 0; this.power = 0;
      this.phase = "fly"; NE.sfx.jump(); this.shake.add(2);
    }

    snapshot() {
      if (this.state !== "play") return null;
      const b = this.ball;
      return { grid: this.grid.slice(), tint: this.tint.slice(),
               ball: b && { x: b.x, y: b.y, vx: b.vx, vy: b.vy, trail: b.trail.map(p => p.slice()) },
               debris: this.debris.map(d => ({ ...d })),
               phase: this.phase, shots: this.shots, level: this.level, score: this.score,
               destroyed: this.destroyed, initial: this.initial, target: this.target,
               aimA: this.aimA, power: this.power, charging: this.charging, chargeT: this.chargeT,
               collapseT: this.collapseT, idleT: this.idleT, waitRelease: this.waitRelease };
    }
    restore(s) {
      this.grid = s.grid.slice(); this.tint = s.tint.slice();
      this.ball = s.ball && { ...s.ball, trail: s.ball.trail.map(p => p.slice()) };
      this.debris = s.debris.map(d => ({ ...d }));
      Object.assign(this, { phase: s.phase, shots: s.shots, level: s.level, score: s.score,
        destroyed: s.destroyed, initial: s.initial, target: s.target, aimA: s.aimA,
        power: s.power, charging: s.charging, chargeT: s.chargeT, collapseT: s.collapseT, idleT: s.idleT, waitRelease: s.waitRelease });
    }

    /* ----------------------------------------------------------- render --- */
    cellColor(type, tint) {
      if (type === GLASS) return P.cyan;
      if (type === TNT) return P.amber;
      if (type === STEEL) return "#b8bcd8";
      return [P.violet, P.magenta, "#4d8dff"][tint];
    }
    render(ctx) {
      // ground
      NE.glowLine(ctx, P.magenta, 0, this.G, this.W, this.G, 2);
      ctx.save(); ctx.strokeStyle = "rgba(255,62,165,0.14)"; ctx.lineWidth = 1;
      for (let k = 1; k < 5; k++) { const y = this.G + k * k * 3; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.W, y); ctx.stroke(); }
      ctx.restore();

      // tower cells
      for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) {
        const i = cy * COLS + cx, type = this.grid[i];
        if (!type) continue;
        const x = this.gx + cx * CELL, y = this.gy + cy * CELL, c = this.cellColor(type, this.tint[i]);
        if (type === GLASS) {
          ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = c; ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2); ctx.restore();
          NE.glowRect(ctx, c, x + 1, y + 1, CELL - 2, CELL - 2, 2, 1.5);
        } else {
          NE.glowRect(ctx, c, x + 1, y + 1, CELL - 2, CELL - 2, 3);
          if (type === TNT) NE.text(ctx, "!", x + CELL / 2, y + 2, { size: 14, color: P.bg, align: "center", glow: false });
          if (type === STEEL) { ctx.save(); ctx.strokeStyle = P.bg; ctx.lineWidth = 2; ctx.strokeRect(x + 5, y + 5, CELL - 10, CELL - 10); ctx.restore(); }
        }
      }

      // debris
      for (const d of this.debris) {
        ctx.save(); ctx.globalAlpha = Math.min(1, d.life); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
        ctx.shadowColor = d.c; ctx.shadowBlur = 8; ctx.fillStyle = d.c; ctx.fillRect(-d.s / 2, -d.s / 2, d.s, d.s);
        ctx.restore();
      }

      // launcher + ECHO
      NE.glowRect(ctx, P.violet, this.lx - 18, this.ly + 10, 36, this.G - this.ly - 10, 4, 2);
      NE.drawEcho(ctx, this.lx - 50, this.G - 22, 16, P.cyan, 1, this.t);
      if (this.phase === "aim") {
        const len = 46 + this.power * 40;
        NE.glowLine(ctx, P.cyan, this.lx, this.ly, this.lx + Math.cos(this.aimA) * len, this.ly + Math.sin(this.aimA) * len, 3);
        // short trajectory preview
        const sp = 380 + Math.max(this.power, 0.35) * 820;
        let x = this.lx, y = this.ly, vx = Math.cos(this.aimA) * sp, vy = Math.sin(this.aimA) * sp;
        ctx.save(); ctx.fillStyle = "rgba(241,243,255,0.45)";
        for (let k = 0; k < 16; k++) { for (let j = 0; j < 3; j++) { vy += GRAV / 60; x += vx / 60; y += vy / 60; }
          ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); }
        ctx.restore();
        NE.glowCircle(ctx, P.white, this.lx, this.ly, BALL_R);
        if (this.charging) NE.bar(ctx, this.lx - 40, this.ly - 54, 80, 8, this.power, P.amber);
      }
      if (this.ball) {
        const b = this.ball;
        b.trail.forEach(([x, y], k) => { ctx.save(); ctx.globalAlpha = k / b.trail.length * 0.4;
          NE.glowCircle(ctx, P.cyan, x, y, BALL_R * (0.4 + k / b.trail.length * 0.5)); ctx.restore(); });
        NE.glowCircle(ctx, P.white, b.x, b.y, BALL_R);
      }

      // HUD
      NE.text(ctx, String(this.score), 20, 16, { size: 40 });
      NE.text(ctx, `LEVEL ${this.level}`, 22, 64, { size: 15, color: P.dim });
      for (let k = 0; k < this.shots; k++) NE.glowCircle(ctx, P.white, this.W - 28 - k * 26, 30, 8);
      const frac = this.destroyed / this.initial, bx = this.W / 2 - 130, by = 26;
      NE.bar(ctx, bx, by, 260, 12, frac, frac >= this.target ? P.lime : P.magenta, "DEMOLISHED");
      NE.glowLine(ctx, P.amber, bx + 260 * this.target, by - 4, bx + 260 * this.target, by + 16, 2);
      NE.text(ctx, `${Math.round(frac * 100)}% / ${Math.round(this.target * 100)}%`, bx + 270, by - 3, { size: 14, color: P.ink });
      if (this.phase === "aim" && this.shots && !this.charging)
        NE.text(ctx, "aim with mouse / ↑↓  ·  hold click or SPACE, release to fire",
                this.W / 2, this.H - 30, { size: 13, color: P.dim, align: "center" });
      if (this.phase === "clear")
        NE.banner(ctx, this.W, this.H, "LEVEL FLATTENED!", `+${this.shots * 150} for spare balls   -   click / SPACE next tower`);
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "STILL STANDING", `score ${this.score}   -   ENTER retry   ESC menu`);
    }
  }
  NE.register("wrecker",
    { title: "TOWER WRECKER", genre: "Destruction physics", color: P.magenta,
      desc: "Fling a wrecking ball at neon towers. Glass shatters, TNT chains. Then rewind and watch it rebuild." },
    Wrecker);
})();
