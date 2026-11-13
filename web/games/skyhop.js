/* GAME 1 - SKY HOP : bouncy platformer climb */
(function () {
  const NE = Forkade, P = NE.palette;

  class SkyHop extends NE.GameBase {
    reset() {
      this.px = this.W / 2; this.py = this.H - 80;
      this.vx = 0; this.vy = 0; this.onGround = false;
      this.cam = 0; this.best = 0; this.score = 0;
      this.plats = [{ x: 0, y: this.H - 40, w: this.W, h: 40 }];
      this.orbs = [];
      let y = this.H - 140;
      for (let i = 0; i < 40; i++) { this.addPlat(y); y -= NE.rand(80, 120); }
      this.state = "play";
    }
    addPlat(y) {
      const w = NE.rand(90, 160), x = NE.rand(20, this.W - w - 20);
      this.plats.push({ x, y, w, h: 18 });
      if (Math.random() < 0.5) this.orbs.push({ x: x + w / 2, y: y - 26, on: true });
    }
    step(dt) {
      const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter || I.pressed.NumpadEnter) this.reset(); return; }
      const ax = (I.right() ? 1 : 0) - (I.left() ? 1 : 0);
      this.vx = ax * 320;
      if ((I.pressed.Space || I.pressed.KeyW || I.pressed.ArrowUp) && this.onGround) {
        this.vy = -560; this.onGround = false; NE.sfx.jump();
        this.particles.emit(this.px, this.py + 16, P.cyan, { n: 10, angle: Math.PI / 2, spread: 1.2, speed: 3 });
      }
      this.vy += 1500 * dt;
      this.px = Math.max(16, Math.min(this.W - 16, this.px + this.vx * dt));
      this.py += this.vy * dt;

      this.onGround = false;
      if (this.vy >= 0) {
        const fx = this.px, fb = this.py + 16;
        for (const p of this.plats) {
          const sy = p.y + this.cam;
          if (fx > p.x - 12 && fx < p.x + p.w + 12 &&
              fb >= sy && fb - this.vy * dt <= sy + 14) {
            this.py = sy - 16; this.vy = 0; this.onGround = true;
          }
        }
      }
      const screenY = this.py + this.cam;
      if (screenY < this.H * 0.42) {
        const d = this.H * 0.42 - screenY;
        this.cam += d; this.best += d; this.score = (this.best / 10) | 0;
      }
      let top = Infinity; for (const p of this.plats) top = Math.min(top, p.y);
      if (top + this.cam > -40) this.addPlat(top - NE.rand(80, 120));
      this.plats = this.plats.filter(p => p.y + this.cam < this.H + 60);

      for (const o of this.orbs)
        if (o.on && Math.abs(o.x - this.px) < 22 && Math.abs(o.y + this.cam - this.py) < 22) {
          o.on = false; this.score += 25; this.shake.add(3); NE.sfx.pickup();
          this.particles.emit(o.x, o.y + this.cam, P.amber, { n: 16, speed: 4 });
        }
      this.orbs = this.orbs.filter(o => o.y + this.cam < this.H + 40);

      if (this.py > this.H + 40) { this.state = "over"; this.shake.add(16); }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return [this.px, this.py, this.vx, this.vy, this.cam, this.best, this.score, this.onGround];
    }
    restore(s) { [this.px, this.py, this.vx, this.vy, this.cam, this.best, this.score, this.onGround] = s; }
    render(ctx) {
      for (const p of this.plats) {
        const sy = p.y + this.cam;
        if (sy > -30 && sy < this.H + 30)
          NE.glowRect(ctx, p.h > 30 ? P.magenta : P.cyan, p.x, sy, p.w, p.h, 6);
      }
      for (const o of this.orbs)
        if (o.on) { const r = 7 + Math.sin(this.t * 6 + o.x) * 2;
          NE.glowCircle(ctx, P.amber, o.x, o.y + this.cam, r); }
      NE.drawEcho(ctx, this.px, this.py, 16, P.cyan, this.vx >= 0 ? 1 : -1, this.t);
      NE.text(ctx, String(this.score), 20, 16, { size: 40 });
      NE.text(ctx, "HEIGHT", 20, 60, { size: 16, color: P.dim });
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "YOU FELL", `score ${this.score}   -   ENTER retry   ESC menu`);
    }
  }
  NE.register("skyhop",
    { title: "SKY HOP", genre: "Platformer", color: P.cyan,
      desc: "Bounce ECHO up an endless neon tower. Miss a jump? Rewind and retry." },
    SkyHop);
})();
