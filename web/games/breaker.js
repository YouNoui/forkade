/* GAME 4 - PULSE BREAKER : neon brick-breaker with endless levels */
(function () {
  const NE = Forkade, P = NE.palette;

  class Breaker extends NE.GameBase {
    reset() {
      this.paddle = this.W / 2; this.pw = 110; this.lives = 3; this.score = 0;
      this.level = 1; this.state = "play";
      this.buildWall();
    }
    // every level is a new wall shape; tougher bricks take 2-3 hits
    buildWall() {
      const L = this.level, cols = ["cyan", "lime", "amber", "magenta", "violet"];
      const rows = Math.min(8, 4 + Math.ceil(L / 2)), shape = (L - 1) % 5;
      this.bricks = [];
      for (let row = 0; row < rows; row++) for (let col = 0; col < 10; col++) {
        const mid = Math.abs(col - 4.5);
        if (shape === 1 && mid > rows - row) continue;                       // pyramid
        if (shape === 2 && (row + col) % 2) continue;                        // checker
        if (shape === 3 && Math.abs(mid - 2.5) + Math.abs(row - rows / 2) > rows / 2 + 1) continue; // twin diamonds
        if (shape === 4 && row % 3 === 2 && col % 3 !== 0) continue;         // ladders
        const hp = Math.min(3, 1 + (row < Math.floor((L - 1) / 2) ? 1 : 0) + (L >= 6 && row === 0 ? 1 : 0));
        this.bricks.push({ x: 60 + col * 78, y: 80 + row * 32, c: P[cols[row % 5]], hp });
      }
      this.speed = 420 + Math.min(260, (L - 1) * 35);
      this.stuck = true; this.bx = this.paddle; this.by = this.H - 70;
      this.bvx = 0; this.bvy = 0; this.phase = "play";
    }
    launch() {
      this.stuck = false;
      const a = NE.rand(-0.6, 0.6) - Math.PI / 2;
      this.bvx = Math.cos(a) * this.speed; this.bvy = Math.sin(a) * this.speed;
    }
    step(dt) {
      const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }
      const click = I.mouse.down && !this.prevDown; this.prevDown = I.mouse.down;
      if (this.phase === "clear") {
        if (I.pressed.Space || I.pressed.Enter || click) { this.level++; this.buildWall(); NE.sfx.ui(); }
        return;
      }
      const kb = (I.right() ? 1 : 0) - (I.left() ? 1 : 0);
      if (kb) this.paddle += kb * 520 * dt;
      else this.paddle += (I.mouse.x - this.paddle) * Math.min(1, dt * 14);
      this.paddle = Math.max(this.pw / 2, Math.min(this.W - this.pw / 2, this.paddle));
      if ((I.pressed.Space || click) && this.stuck) this.launch();
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
          this.bvy *= -1; this.shake.add(2);
          this.particles.emit(this.bx, this.by, br.c, { n: 8, speed: 3 });
          if (--br.hp <= 0) { this.score += 15 * this.level; NE.sfx.pickup(); this.bricks.splice(i, 1); }
          else { this.score += 5; NE.sfx.hit(); }
          break;
        }
      }
      if (this.by > this.H + 10) {
        this.lives -= 1; this.shake.add(10);
        if (this.lives <= 0) this.state = "over"; else this.stuck = true;
      }
      if (!this.bricks.length) {
        this.bonus = 250 * this.level; this.score += this.bonus;
        this.lives = Math.min(5, this.lives + 1); this.phase = "clear"; NE.sfx.win();
        this.reward(5 + 5 * this.level, `wall ${this.level} cleared`, "wall" + this.level);
      }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { paddle: this.paddle, lives: this.lives, score: this.score, stuck: this.stuck,
               bx: this.bx, by: this.by, bvx: this.bvx, bvy: this.bvy,
               bricks: this.bricks.map(b => ({ ...b })),
               level: this.level, speed: this.speed, phase: this.phase, bonus: this.bonus };
    }
    restore(s) {
      this.paddle = s.paddle; this.lives = s.lives; this.score = s.score; this.stuck = s.stuck;
      this.bx = s.bx; this.by = s.by; this.bvx = s.bvx; this.bvy = s.bvy;
      this.bricks = s.bricks.map(b => ({ ...b }));
      this.level = s.level; this.speed = s.speed; this.phase = s.phase; this.bonus = s.bonus;
    }
    render(ctx) {
      for (const br of this.bricks) {
        if (br.hp >= 3) { NE.glowRect(ctx, "#b8bcd8", br.x, br.y, 68, 24, 5); }
        else NE.glowRect(ctx, br.c, br.x, br.y, 68, 24, 5);
        if (br.hp === 2) NE.glowRect(ctx, P.white, br.x + 4, br.y + 4, 60, 16, 4, 2);
      }
      NE.glowRect(ctx, P.cyan, this.paddle - this.pw / 2, this.H - 68, this.pw, 14, 7);
      NE.drawEcho(ctx, this.paddle, this.H - 86, 12, P.cyan, 1, this.t);
      NE.glowCircle(ctx, P.white, this.bx, this.by, 7);
      NE.text(ctx, String(this.score), 20, 16, { size: 40 });
      for (let i = 0; i < this.lives; i++) NE.glowCircle(ctx, P.cyan, this.W - 30 - i * 26, 28, 7);
      NE.text(ctx, `LEVEL ${this.level}`, 22, 60, { size: 15, color: P.dim });
      if (this.stuck && this.state === "play")
        NE.text(ctx, "SPACE or click to launch", this.W / 2, this.H - 110, { size: 16, color: P.dim, align: "center" });
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "GAME OVER", `score ${this.score}   -   ENTER / tap to retry   ESC menu`);
      if (this.phase === "clear" && this.state === "play")
        NE.banner(ctx, this.W, this.H, `WALL ${this.level} CLEARED!`, `+${this.bonus} and +1 life   -   SPACE / click for wall ${this.level + 1}`);
    }
  }
  NE.register("breaker",
    { touch: "lr", title: "PULSE BREAKER", genre: "Brick-breaker", color: P.amber,
      desc: "Bounce a pulse through wall after wall - tougher bricks, faster ball. Lost it? Rewind the bounce." },
    Breaker);
})();
