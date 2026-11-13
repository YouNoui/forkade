/* GAME 6 - DRIFTSTORM : neon asteroids */
(function () {
  const NE = Forkade, P = NE.palette, TAU = NE.TAU;

  class Drift extends NE.GameBase {
    reset() {
      this.px = this.W / 2; this.py = this.H / 2; this.vx = 0; this.vy = 0;
      this.ang = -Math.PI / 2; this.hp = 3; this.score = 0;
      this.bullets = []; this.rocks = []; this.cool = 0; this.inv = 0; this.state = "play"; this.wave = 1;
      for (let i = 0; i < 4; i++) this.spawnRock();
    }
    spawnRock(x, y, size = 3) {
      if (x == null) {
        if (Math.random() < 0.5) { x = Math.random() < 0.5 ? 0 : this.W; y = NE.rand(0, this.H); }
        else { x = NE.rand(0, this.W); y = Math.random() < 0.5 ? 0 : this.H; }
      }
      const a = NE.rand(0, TAU), sp = NE.rand(30, 80) / size;
      this.rocks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size, spin: NE.rand(0, TAU) });
    }
    step(dt) {
      const I = this.input;
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
        this.cool = 0.22; NE.sfx.shoot();
        this.bullets.push({ x: this.px, y: this.py,
          vx: Math.cos(this.ang) * 520 + this.vx, vy: Math.sin(this.ang) * 520 + this.vy, life: 1.2 });
        this.shake.add(1.5);
      }
      for (const b of this.bullets) {
        b.x = (b.x + b.vx * dt + this.W) % this.W; b.y = (b.y + b.vy * dt + this.H) % this.H; b.life -= dt;
      }
      this.bullets = this.bullets.filter(b => b.life > 0);
      for (const r of this.rocks) {
        r.x = (r.x + r.vx * dt + this.W) % this.W; r.y = (r.y + r.vy * dt + this.H) % this.H; r.spin += dt;
      }
      const keep = [];
      for (const r of this.rocks) {
        const rad = r.size * 12; let hit = false;
        for (const b of this.bullets)
          if ((b.x - r.x) ** 2 + (b.y - r.y) ** 2 < rad * rad) { hit = true; b.life = 0; break; }
        if (hit) {
          this.score += 15; this.shake.add(3); NE.sfx.explode(); this.particles.emit(r.x, r.y, P.cyan, { n: 12, speed: 4 });
          if (r.size > 1) for (let i = 0; i < 2; i++) this.spawnRock(r.x, r.y, r.size - 1);
        } else keep.push(r);
      }
      this.rocks = keep;
      if (this.inv <= 0)
        for (const r of this.rocks) {
          const rad = r.size * 12 + 10;
          if ((this.px - r.x) ** 2 + (this.py - r.y) ** 2 < rad * rad) {
            this.hp -= 1; this.inv = 1.5; this.shake.add(12); NE.sfx.hit();
            this.particles.emit(this.px, this.py, P.red, { n: 20, speed: 5 });
            if (this.hp <= 0) this.state = "over";
            break;
          }
        }
      if (!this.rocks.length) {   // next wave: more rocks, +1 hull every 3 waves
        this.wave++; this.score += 100 * this.wave;
        if (this.wave % 3 === 0) this.hp = Math.min(5, this.hp + 1);
        for (let i = 0; i < Math.min(10, 3 + this.wave); i++) this.spawnRock();
        NE.sfx.win();
      }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { px: this.px, py: this.py, vx: this.vx, vy: this.vy, ang: this.ang,
               hp: this.hp, score: this.score, inv: this.inv, wave: this.wave,
               b: this.bullets.map(o => ({ ...o })), r: this.rocks.map(o => ({ ...o })) };
    }
    restore(s) {
      this.px = s.px; this.py = s.py; this.vx = s.vx; this.vy = s.vy; this.ang = s.ang;
      this.hp = s.hp; this.score = s.score; this.inv = s.inv; this.wave = s.wave;
      this.bullets = s.b.map(o => ({ ...o })); this.rocks = s.r.map(o => ({ ...o }));
    }
    render(ctx) {
      for (const r of this.rocks) {
        const rad = r.size * 12, pts = [];
        for (let k = 0; k < 8; k++) {
          const aa = r.spin + k / 8 * TAU, rr = rad * (0.75 + 0.25 * Math.sin(k * 2 + r.spin));
          pts.push([r.x + Math.cos(aa) * rr, r.y + Math.sin(aa) * rr]);
        }
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], b = pts[(i + 1) % pts.length];
          NE.glowLine(ctx, P.violet, a[0], a[1], b[0], b[1], 2);
        }
      }
      for (const b of this.bullets) NE.glowCircle(ctx, P.cyan, b.x, b.y, 3);
      if (this.inv <= 0 || ((this.t * 20) | 0) % 2 === 0) {
        const x = this.px, y = this.py, a = this.ang;
        const nose = [x + Math.cos(a) * 18, y + Math.sin(a) * 18];
        const l = [x + Math.cos(a + 2.5) * 14, y + Math.sin(a + 2.5) * 14];
        const rr = [x + Math.cos(a - 2.5) * 14, y + Math.sin(a - 2.5) * 14];
        NE.glowLine(ctx, P.cyan, nose[0], nose[1], l[0], l[1], 3);
        NE.glowLine(ctx, P.cyan, nose[0], nose[1], rr[0], rr[1], 3);
        NE.glowLine(ctx, P.cyan, l[0], l[1], rr[0], rr[1], 3);
        NE.drawEcho(ctx, x, y, 9, P.cyan, 1, this.t);
      }
      NE.text(ctx, String(this.score), 20, 16, { size: 40 });
      NE.text(ctx, `WAVE ${this.wave}`, 22, 60, { size: 15, color: P.dim });
      for (let i = 0; i < this.hp; i++) NE.glowCircle(ctx, P.cyan, this.W - 30 - i * 26, 28, 7);
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "LOST IN THE STORM", `score ${this.score}   -   ENTER retry   ESC menu`);
    }
  }
  NE.register("drift",
    { title: "DRIFTSTORM", genre: "Space rocks", color: P.red,
      desc: "Spin, thrust and blast neon rocks to dust. Clipped one? Rewind the drift." },
    Drift);
})();
