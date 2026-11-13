/* GAME 2 - NEON SWARM : top-down survival shooter */
(function () {
  const NE = Forkade, P = NE.palette;

  class Swarm extends NE.GameBase {
    reset() {
      this.px = this.W / 2; this.py = this.H / 2;
      this.hp = 100; this.score = 0; this.wave = 1;
      this.enemies = []; this.bullets = []; this.cool = 0; this.spawnT = 0;
      this.state = "play"; this.spawnWave();
    }
    spawnWave() { const n = 4 + this.wave * 2; for (let i = 0; i < n; i++) this.spawnEnemy(); }
    spawnEnemy() {
      const s = (Math.random() * 4) | 0; let x, y;
      if (s === 0) { x = NE.rand(0, this.W); y = -20; }
      else if (s === 1) { x = NE.rand(0, this.W); y = this.H + 20; }
      else if (s === 2) { x = -20; y = NE.rand(0, this.H); }
      else { x = this.W + 20; y = NE.rand(0, this.H); }
      this.enemies.push({ x, y, hp: 30 + this.wave * 6, sp: 55 + this.wave * 3 });
    }
    step(dt) {
      const I = this.input, M = I.mouse;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }
      const dx = (I.right() ? 1 : 0) - (I.left() ? 1 : 0);
      const dy = (I.down() ? 1 : 0) - (I.up() ? 1 : 0);
      this.px = Math.max(16, Math.min(this.W - 16, this.px + dx * 240 * dt));
      this.py = Math.max(16, Math.min(this.H - 16, this.py + dy * 240 * dt));
      const aim = Math.atan2(M.y - this.py, M.x - this.px);
      this.cool -= dt;
      if ((M.down || I.keys.Space) && this.cool <= 0) {
        this.cool = 0.12; NE.sfx.shoot();
        this.bullets.push({ x: this.px, y: this.py, vx: Math.cos(aim) * 620, vy: Math.sin(aim) * 620, life: 1.2 });
        this.particles.emit(this.px + Math.cos(aim) * 18, this.py + Math.sin(aim) * 18, P.cyan,
          { n: 4, angle: aim, spread: 0.4, speed: 4 });
        this.shake.add(1.5);
      }
      for (const b of this.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
      this.bullets = this.bullets.filter(b => b.life > 0);
      for (const e of this.enemies) {
        const a = Math.atan2(this.py - e.y, this.px - e.x);
        e.x += Math.cos(a) * e.sp * dt; e.y += Math.sin(a) * e.sp * dt;
        if (Math.abs(e.x - this.px) < 20 && Math.abs(e.y - this.py) < 20) { this.hp -= 32 * dt; this.shake.add(2); }
      }
      for (const b of this.bullets) for (const e of this.enemies)
        if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) {
          e.hp -= 20; b.life = 0; this.particles.emit(e.x, e.y, P.magenta, { n: 6, speed: 3 });
        }
      for (const e of this.enemies) if (e.hp <= 0) {
        this.score += 10; this.shake.add(3); NE.sfx.explode();
        this.particles.emit(e.x, e.y, P.lime, { n: 14, speed: 4 });
      }
      this.enemies = this.enemies.filter(e => e.hp > 0);
      if (!this.enemies.length) { this.wave++; this.spawnWave(); this.reward(2 + 2 * this.wave, `wave ${this.wave}`, "wave" + this.wave); }
      this.spawnT -= dt;
      if (this.spawnT <= 0) { this.spawnT = Math.max(0.6, 2.2 - this.wave * 0.1); this.spawnEnemy(); }
      if (this.hp <= 0) { this.state = "over"; this.shake.add(18); }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { px: this.px, py: this.py, hp: this.hp, score: this.score, wave: this.wave,
               en: this.enemies.map(e => ({ ...e })), bu: this.bullets.map(b => ({ ...b })) };
    }
    restore(s) {
      this.px = s.px; this.py = s.py; this.hp = s.hp; this.score = s.score; this.wave = s.wave;
      this.enemies = s.en.map(e => ({ ...e })); this.bullets = s.bu.map(b => ({ ...b }));
    }
    render(ctx) {
      for (const e of this.enemies) {
        NE.glowCircle(ctx, P.magenta, e.x, e.y, 13);
        ctx.fillStyle = P.bg; ctx.beginPath(); ctx.arc(e.x, e.y, 5, 0, NE.TAU); ctx.fill();
      }
      for (const b of this.bullets) NE.glowCircle(ctx, P.cyan, b.x, b.y, 4);
      const M = this.input.mouse;
      NE.drawEcho(ctx, this.px, this.py, 16, P.cyan, M.x >= this.px ? 1 : -1, this.t);
      NE.glowCircle(ctx, P.dim, M.x, M.y, 10, 2);
      NE.bar(ctx, 16, 16, 200, 16, this.hp / 100, P.red, "HULL");
      NE.text(ctx, String(this.score), this.W - 120, 16, { size: 40 });
      NE.text(ctx, "WAVE " + this.wave, this.W - 120, 60, { size: 16, color: P.dim });
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "OVERRUN", `score ${this.score}   -   ENTER / tap to retry   ESC menu`);
    }
  }
  NE.register("swarm",
    { title: "NEON SWARM", genre: "Survival shooter", color: P.magenta,
      desc: "Top-down blasting against waves of neon husks. Overrun? Rewind the swarm." },
    Swarm);
})();
