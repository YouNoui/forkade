/* GAME 1 - SKY HOP : bouncy platformer climb */
(function () {
  const NE = Forkade, P = NE.palette;

  class SkyHop extends NE.GameBase {
    reset() {
      this.px = this.W / 2; this.py = this.H - 80;
      this.vx = 0; this.vy = 0; this.onGround = false;
      this.cam = 0; this.best = 0; this.score = 0; this.orbPts = 0;
      this.plats = [{ x: 0, y: this.H - 40, w: this.W, h: 40 }];
      this.orbs = []; this.lastX = this.W / 2; this.coyote = 0; this.buffer = 0;
      let y = this.H - 130;
      for (let i = 0; i < 40; i++) { this.addPlat(y); y -= this.gap(); }
      this.state = "play";
    }
    // jump reaches ~150px high; gaps stay well under that, and grow a little with height
    gap() { return NE.rand(70, 95) + Math.min(15, this.best / 400); }
    addPlat(y) {
      const w = Math.max(70, NE.rand(100, 170) - Math.min(50, this.best / 250));
      // keep each platform within a reachable sideways distance of the one below
      const cx = Math.max(20 + w / 2, Math.min(this.W - 20 - w / 2, this.lastX + NE.rand(-240, 240)));
      const x = cx - w / 2; this.lastX = cx;
      this.plats.push({ x, y, w, h: 18 });
      if (Math.random() < 0.5) this.orbs.push({ x: x + w / 2, y: y - 26, on: true });
    }
    step(dt) {
      const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter || I.pressed.NumpadEnter) this.reset(); return; }
      const ax = (I.right() ? 1 : 0) - (I.left() ? 1 : 0);
      this.vx = ax * 320;
      // forgiving jump: press slightly early (buffer) or just after leaving a ledge (coyote)
      if (I.pressed.Space || I.pressed.KeyW || I.pressed.ArrowUp) this.buffer = 0.12;
      else this.buffer = Math.max(0, this.buffer - dt);
      this.coyote = this.onGround ? 0.09 : Math.max(0, this.coyote - dt);
      if (this.buffer > 0 && this.coyote > 0) {
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
          if (fx > p.x - 12 && fx < p.x + p.w + 12 &&
              fb >= sy && fb - this.vy * dt <= sy + 14) {
            this.py = sy - 16; this.vy = 0; this.onGround = true;
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
      this.plats = this.plats.filter(p => p.y + this.cam < this.H + 60);

      for (const o of this.orbs)
        if (o.on && Math.abs(o.x - this.px) < 22 && Math.abs(o.y + this.cam - this.py) < 22) {
          o.on = false; this.orbPts += 25; this.shake.add(3); NE.sfx.pickup();
          this.particles.emit(o.x, o.y + this.cam, P.amber, { n: 16, speed: 4 });
        }
      this.orbs = this.orbs.filter(o => o.y + this.cam < this.H + 40);
      this.score = ((this.best / 10) | 0) + this.orbPts;

      if (this.py > this.H + 40) { this.state = "over"; this.shake.add(16); }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { v: [this.px, this.py, this.vx, this.vy, this.cam, this.best, this.score, this.onGround, this.lastX, this.coyote, this.buffer, this.orbPts],
               plats: this.plats.map(p => ({ ...p })), orbs: this.orbs.map(o => ({ ...o })) };
    }
    restore(s) {
      [this.px, this.py, this.vx, this.vy, this.cam, this.best, this.score, this.onGround, this.lastX, this.coyote, this.buffer, this.orbPts] = s.v;
      this.plats = s.plats.map(p => ({ ...p })); this.orbs = s.orbs.map(o => ({ ...o }));
    }
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
        NE.banner(ctx, this.W, this.H, "YOU FELL", `score ${this.score}   -   ENTER / tap to retry   ESC menu`);
    }
  }
  NE.register("skyhop",
    { touch: "lr", title: "SKY HOP", genre: "Platformer", color: P.cyan,
      desc: "Bounce ECHO up an endless neon tower. Miss a jump? Rewind and retry." },
    SkyHop);
})();
