/* GAME 3 - SKY STRIKER : vertical airplane shmup */
(function () {
  const NE = Forkade, P = NE.palette;

  class Striker extends NE.GameBase {
    reset() {
      this.px = this.W / 2; this.py = this.H - 90;
      this.hp = 3; this.score = 0;
      this.bullets = []; this.ebullets = []; this.foes = [];
      this.cool = 0; this.spawn = 0; this.state = "play";
    }
    step(dt) {
      const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }
      const dx = (I.right() ? 1 : 0) - (I.left() ? 1 : 0);
      const dy = (I.down() ? 1 : 0) - (I.up() ? 1 : 0);
      this.px = Math.max(16, Math.min(this.W - 16, this.px + dx * 360 * dt));
      this.py = Math.max(60, Math.min(this.H - 20, this.py + dy * 360 * dt));
      this.cool -= dt;
      if ((I.keys.Space || I.mouse.down) && this.cool <= 0) {
        this.cool = 0.14; NE.sfx.shoot(); this.bullets.push({ x: this.px, y: this.py - 18 });
        this.particles.emit(this.px, this.py - 18, P.cyan, { n: 3, angle: -Math.PI / 2, spread: 0.3, speed: 3 });
      }
      for (const b of this.bullets) b.y -= 680 * dt;
      this.bullets = this.bullets.filter(b => b.y > -20);
      for (const b of this.ebullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
      this.ebullets = this.ebullets.filter(b => b.y > -20 && b.y < this.H + 20);
      this.spawn -= dt;
      if (this.spawn <= 0) {
        this.spawn = Math.max(0.4, 1.3 - this.score / 2000);
        this.foes.push({ x: NE.rand(40, this.W - 40), y: -20, hp: 40, sp: NE.rand(70, 130),
                         sway: NE.rand(1, 2.2), fire: 0 });
      }
      for (const f of this.foes) {
        f.y += f.sp * dt; f.x += Math.sin(this.t * f.sway) * 60 * dt; f.fire -= dt;
        if (f.fire <= 0 && f.y < this.H - 100) {
          f.fire = NE.rand(1.2, 2.5);
          const a = Math.atan2(this.py - f.y, this.px - f.x);
          this.ebullets.push({ x: f.x, y: f.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240 });
        }
      }
      for (const b of this.bullets) for (const f of this.foes)
        if (Math.abs(b.x - f.x) < 20 && Math.abs(b.y - f.y) < 20) {
          f.hp -= 20; b.y = -99; this.particles.emit(f.x, f.y, P.amber, { n: 5, speed: 3 });
        }
      for (const f of this.foes) if (f.hp <= 0) {
        this.score += 20; this.shake.add(3); NE.sfx.explode(); this.particles.emit(f.x, f.y, P.magenta, { n: 16, speed: 4 });
      }
      this.foes = this.foes.filter(f => f.hp > 0 && f.y < this.H + 30);
      let hit = false;
      for (const b of this.ebullets)
        if (Math.abs(b.x - this.px) < 14 && Math.abs(b.y - this.py) < 14) { hit = true; b.y = 9999; break; }
      if (!hit) for (const f of this.foes)
        if (Math.abs(f.x - this.px) < 22 && Math.abs(f.y - this.py) < 22) { hit = true; f.hp = 0; break; }
      if (hit) {
        this.hp -= 1; this.shake.add(10); NE.sfx.hit(); this.particles.emit(this.px, this.py, P.red, { n: 20, speed: 5 });
        if (this.hp <= 0) this.state = "over";
      }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { px: this.px, py: this.py, hp: this.hp, score: this.score,
               b: this.bullets.map(o => ({ ...o })), eb: this.ebullets.map(o => ({ ...o })),
               f: this.foes.map(o => ({ ...o })) };
    }
    restore(s) {
      this.px = s.px; this.py = s.py; this.hp = s.hp; this.score = s.score;
      this.bullets = s.b.map(o => ({ ...o })); this.ebullets = s.eb.map(o => ({ ...o }));
      this.foes = s.f.map(o => ({ ...o }));
    }
    render(ctx) {
      for (const f of this.foes) {
        NE.glowRect(ctx, P.magenta, f.x - 14, f.y - 10, 28, 20, 5);
        ctx.fillStyle = P.bg; ctx.beginPath();
        ctx.moveTo(f.x, f.y + 8); ctx.lineTo(f.x - 8, f.y - 6); ctx.lineTo(f.x + 8, f.y - 6);
        ctx.closePath(); ctx.fill();
      }
      for (const b of this.bullets) NE.glowCircle(ctx, P.cyan, b.x, b.y, 4);
      for (const b of this.ebullets) NE.glowCircle(ctx, P.red, b.x, b.y, 4);
      const x = this.px, y = this.py;
      NE.glowLine(ctx, P.cyan, x, y - 20, x - 16, y + 14, 3);
      NE.glowLine(ctx, P.cyan, x, y - 20, x + 16, y + 14, 3);
      NE.glowLine(ctx, P.cyan, x - 16, y + 14, x, y + 6, 3);
      NE.glowLine(ctx, P.cyan, x + 16, y + 14, x, y + 6, 3);
      NE.drawEcho(ctx, x, y, 11, P.cyan, 1, this.t);
      this.particles.emit(x, y + 14, P.amber, { n: 1, angle: Math.PI / 2, spread: 0.5, speed: 2, life: 0.3 });
      NE.text(ctx, String(this.score), 20, 16, { size: 40 });
      for (let i = 0; i < this.hp; i++) NE.glowCircle(ctx, P.red, this.W - 30 - i * 26, 28, 8);
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "SHOT DOWN", `score ${this.score}   -   ENTER / tap to retry   ESC menu`);
    }
  }
  NE.register("striker",
    { title: "SKY STRIKER", genre: "Airplane shmup", color: P.lime,
      desc: "Fly a neon fighter, dodge and shoot. Took a bad hit? Fly it clean again." },
    Striker);
})();
