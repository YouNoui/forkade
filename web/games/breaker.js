/* GAME 4 - PULSE BREAKER : neon brick-breaker */
(function () {
  const NE = Forkade, P = NE.palette;

  class Breaker extends NE.GameBase {
    reset() {
      this.paddle = this.W / 2; this.pw = 110; this.lives = 3; this.score = 0;
      this.bricks = [];
      const cols = ["cyan", "lime", "amber", "magenta", "violet"];
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 10; col++)
          this.bricks.push({ x: 60 + col * 78, y: 90 + row * 34, c: P[cols[row]] });
      this.stuck = true; this.bx = this.paddle; this.by = this.H - 70;
      this.bvx = 0; this.bvy = 0; this.state = "play";
    }
    launch() {
      this.stuck = false;
      const a = NE.rand(-0.6, 0.6) - Math.PI / 2;
      this.bvx = Math.cos(a) * 420; this.bvy = Math.sin(a) * 420;
    }
    step(dt) {
      const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }
      const kb = (I.right() ? 1 : 0) - (I.left() ? 1 : 0);
      if (kb) this.paddle += kb * 520 * dt;
      else this.paddle += (I.mouse.x - this.paddle) * Math.min(1, dt * 14);
      this.paddle = Math.max(this.pw / 2, Math.min(this.W - this.pw / 2, this.paddle));
      if (I.pressed.Space && this.stuck) this.launch();
      if (this.stuck) { this.bx = this.paddle; this.by = this.H - 70; return; }

      this.bx += this.bvx * dt; this.by += this.bvy * dt;
      if (this.bx < 8 || this.bx > this.W - 8) { this.bvx *= -1; this.bx = Math.max(8, Math.min(this.W - 8, this.bx)); }
      if (this.by < 8) { this.bvy *= -1; this.by = 8; }
      if (this.by > this.H - 78 && this.by < this.H - 58 &&
          Math.abs(this.bx - this.paddle) < this.pw / 2 && this.bvy > 0) {
        const off = (this.bx - this.paddle) / (this.pw / 2);
        const a = -Math.PI / 2 + off * 1.0;
        const sp = Math.hypot(this.bvx, this.bvy) + 4;
        this.bvx = Math.cos(a) * sp; this.bvy = Math.sin(a) * sp;
        this.shake.add(2); NE.sfx.bounce(); this.particles.emit(this.bx, this.by, P.cyan, { n: 6, speed: 3 });
      }
      for (let i = 0; i < this.bricks.length; i++) {
        const br = this.bricks[i];
        if (Math.abs(this.bx - (br.x + 34)) < 38 && Math.abs(this.by - (br.y + 12)) < 18) {
          this.bvy *= -1; this.score += 15; this.shake.add(2); NE.sfx.pickup();
          this.particles.emit(this.bx, this.by, br.c, { n: 8, speed: 3 });
          this.bricks.splice(i, 1); break;
        }
      }
      if (this.by > this.H + 10) {
        this.lives -= 1; this.shake.add(10);
        if (this.lives <= 0) this.state = "over"; else this.stuck = true;
      }
      if (!this.bricks.length) this.state = "win";
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { paddle: this.paddle, lives: this.lives, score: this.score, stuck: this.stuck,
               bx: this.bx, by: this.by, bvx: this.bvx, bvy: this.bvy,
               bricks: this.bricks.map(b => ({ ...b })) };
    }
    restore(s) {
      this.paddle = s.paddle; this.lives = s.lives; this.score = s.score; this.stuck = s.stuck;
      this.bx = s.bx; this.by = s.by; this.bvx = s.bvx; this.bvy = s.bvy;
      this.bricks = s.bricks.map(b => ({ ...b }));
    }
    render(ctx) {
      for (const br of this.bricks) NE.glowRect(ctx, br.c, br.x, br.y, 68, 24, 5);
      NE.glowRect(ctx, P.cyan, this.paddle - this.pw / 2, this.H - 68, this.pw, 14, 7);
      NE.drawEcho(ctx, this.paddle, this.H - 86, 12, P.cyan, 1, this.t);
      NE.glowCircle(ctx, P.white, this.bx, this.by, 7);
      NE.text(ctx, String(this.score), 20, 16, { size: 40 });
      for (let i = 0; i < this.lives; i++) NE.glowCircle(ctx, P.cyan, this.W - 30 - i * 26, 28, 7);
      if (this.stuck && this.state === "play")
        NE.text(ctx, "SPACE to launch", this.W / 2, this.H - 110, { size: 16, color: P.dim, align: "center" });
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "GAME OVER", `score ${this.score}   -   ENTER retry   ESC menu`);
      else if (this.state === "win")
        NE.banner(ctx, this.W, this.H, "WALL CLEARED!", `score ${this.score}   -   ENTER again   ESC menu`);
    }
  }
  NE.register("breaker",
    { title: "PULSE BREAKER", genre: "Brick-breaker", color: P.amber,
      desc: "Bounce a pulse to shatter the wall. Lost the ball? Rewind the bounce." },
    Breaker);
})();
