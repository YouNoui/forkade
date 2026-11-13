/* GAME 5 - ECHO TRAIL : neon snake */
(function () {
  const NE = Forkade, P = NE.palette, CELL = 24;

  class Trail extends NE.GameBase {
    reset() {
      this.cols = (this.W / CELL) | 0;
      this.oy = 60; this.rows = ((this.H - this.oy) / CELL) | 0;
      const cx = this.cols >> 1, cy = this.rows >> 1;
      this.snake = [[cx, cy], [cx - 1, cy], [cx - 2, cy]];
      this.dir = [1, 0]; this.pending = [1, 0];
      this.food = this.newFood(); this.score = 0;
      this.moveT = 0; this.speed = 0.12; this.state = "play";
    }
    newFood() {
      while (true) {
        const f = [(Math.random() * this.cols) | 0, (Math.random() * this.rows) | 0];
        if (!this.snake.some(s => s[0] === f[0] && s[1] === f[1])) return f;
      }
    }
    step(dt) {
      const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }
      let nd = null;
      if (I.pressed.KeyW || I.pressed.ArrowUp) nd = [0, -1];
      else if (I.pressed.KeyS || I.pressed.ArrowDown) nd = [0, 1];
      else if (I.pressed.KeyA || I.pressed.ArrowLeft) nd = [-1, 0];
      else if (I.pressed.KeyD || I.pressed.ArrowRight) nd = [1, 0];
      if (nd && (nd[0] !== -this.dir[0] || nd[1] !== -this.dir[1])) this.pending = nd;

      this.moveT += dt;
      if (this.moveT < this.speed) return;
      this.moveT = 0; this.dir = this.pending;
      let nx = (this.snake[0][0] + this.dir[0] + this.cols) % this.cols;
      let ny = (this.snake[0][1] + this.dir[1] + this.rows) % this.rows;
      if (this.snake.slice(0, -1).some(s => s[0] === nx && s[1] === ny)) {
        this.state = "over"; this.shake.add(14); return;
      }
      this.snake.unshift([nx, ny]);
      if (nx === this.food[0] && ny === this.food[1]) {
        this.score += 10; this.food = this.newFood(); NE.sfx.pickup();
        this.speed = Math.max(0.05, this.speed - 0.004); this.shake.add(2);
      } else this.snake.pop();
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { snake: this.snake.map(s => s.slice()), dir: this.dir.slice(),
               pending: this.pending.slice(), food: this.food.slice(),
               score: this.score, speed: this.speed, moveT: this.moveT };
    }
    restore(s) {
      this.snake = s.snake.map(x => x.slice()); this.dir = s.dir.slice();
      this.pending = s.pending.slice(); this.food = s.food.slice();
      this.score = s.score; this.speed = s.speed; this.moveT = s.moveT;
    }
    px(cx, cy) { return [cx * CELL + CELL / 2, cy * CELL + CELL / 2 + this.oy]; }
    render(ctx) {
      const [fx, fy] = this.px(this.food[0], this.food[1]);
      NE.glowCircle(ctx, P.amber, fx, fy, 8);
      for (let i = 1; i < this.snake.length; i++) {
        const [x, y] = this.px(this.snake[i][0], this.snake[i][1]);
        NE.glowRect(ctx, i % 2 ? P.violet : P.magenta, x - 9, y - 9, 18, 18, 5);
      }
      const [hx, hy] = this.px(this.snake[0][0], this.snake[0][1]);
      NE.drawEcho(ctx, hx, hy, 12, P.cyan, this.dir[0] >= 0 ? 1 : -1, this.t);
      NE.text(ctx, String(this.score), 20, 14, { size: 40 });
      NE.text(ctx, "LEN " + this.snake.length, this.W - 110, 20, { size: 16, color: P.dim });
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "CRASHED", `score ${this.score}   -   ENTER / tap to retry   ESC menu`);
    }
  }
  NE.register("trail",
    { title: "ECHO TRAIL", genre: "Neon snake", color: P.violet,
      desc: "Grow a glowing trail of data orbs. About to crash? Rewind a few moves." },
    Trail);
})();
