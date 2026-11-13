/* GAME 7 - NEON STACKS : falling-blocks stacker (Tetris-style) */
(function () {
  const NE = Forkade, P = NE.palette, CELL = 24, COLS = 10, ROWS = 20;

  // each piece: base cells around a pivot, plus a colour. O never rotates.
  const PIECES = {
    I: { c: P.cyan,    cells: [[-1,0],[0,0],[1,0],[2,0]], spin: true },
    O: { c: P.amber,   cells: [[0,0],[1,0],[0,1],[1,1]],   spin: false },
    T: { c: P.violet,  cells: [[-1,0],[0,0],[1,0],[0,1]],  spin: true },
    S: { c: P.lime,    cells: [[0,0],[1,0],[-1,1],[0,1]],  spin: true },
    Z: { c: P.red,     cells: [[-1,0],[0,0],[0,1],[1,1]],  spin: true },
    J: { c: P.magenta, cells: [[-1,0],[0,0],[1,0],[1,1]],  spin: true },
    L: { c: "#5aa0ff", cells: [[-1,0],[0,0],[1,0],[-1,1]], spin: true },
  };
  const TYPES = Object.keys(PIECES);

  class Stacks extends NE.GameBase {
    reset() {
      this.ox = (this.W - COLS * CELL) / 2;
      this.oy = 40;
      this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      this.bag = []; this.next = this.pull();
      this.spawn();
      this.score = 0; this.lines = 0; this.level = 1;
      this.dropT = 0; this.state = "play";
    }
    pull() {
      if (!this.bag.length) { this.bag = TYPES.slice(); for (let i = this.bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]; } }
      return this.bag.pop();
    }
    spawn() {
      this.type = this.next; this.next = this.pull();
      this.cells = PIECES[this.type].cells.map(c => c.slice());
      this.pxi = 4; this.pyi = 0;
      if (this.collides(this.cells, this.pxi, this.pyi)) this.state = "over";
    }
    collides(cells, px, py) {
      for (const [cx, cy] of cells) {
        const x = px + cx, y = py + cy;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && this.grid[y][x]) return true;
      }
      return false;
    }
    rotate() {
      if (!PIECES[this.type].spin) return;
      const r = this.cells.map(([x, y]) => [y, -x]);
      for (const kick of [0, -1, 1, -2, 2]) {
        if (!this.collides(r, this.pxi + kick, this.pyi)) { this.cells = r; this.pxi += kick; return; }
      }
    }
    lock() {
      for (const [cx, cy] of this.cells) {
        const x = this.pxi + cx, y = this.pyi + cy;
        if (y >= 0) this.grid[y][x] = PIECES[this.type].c;
      }
      // clear full lines
      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (this.grid[y].every(v => v)) {
          this.grid.splice(y, 1); this.grid.unshift(Array(COLS).fill(null));
          cleared++; y++;
        }
      }
      if (cleared) {
        this.score += [0, 100, 300, 500, 800][cleared] * this.level;
        this.lines += cleared; this.level = 1 + ((this.lines / 10) | 0);
        this.shake.add(2 + cleared * 2);
        NE.sfx.pickup(); if (cleared >= 3) NE.sfx.explode();
      } else NE.sfx.bounce();
      this.spawn();
    }
    step(dt) {
      const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }
      if (I.pressed.ArrowLeft || I.pressed.KeyA) { if (!this.collides(this.cells, this.pxi - 1, this.pyi)) this.pxi--; }
      if (I.pressed.ArrowRight || I.pressed.KeyD) { if (!this.collides(this.cells, this.pxi + 1, this.pyi)) this.pxi++; }
      if (I.pressed.ArrowUp || I.pressed.KeyW) { this.rotate(); NE.sfx.ui(); }
      if (I.pressed.Space) { // hard drop
        while (!this.collides(this.cells, this.pxi, this.pyi + 1)) { this.pyi++; this.score += 2; }
        this.lock(); return;
      }
      const soft = I.down();
      const interval = Math.max(0.05, (0.8 - (this.level - 1) * 0.06)) * (soft ? 0.12 : 1);
      this.dropT += dt;
      if (this.dropT >= interval) {
        this.dropT = 0;
        if (!this.collides(this.cells, this.pxi, this.pyi + 1)) { this.pyi++; if (soft) this.score += 1; }
        else this.lock();
      }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { grid: this.grid.map(r => r.slice()), type: this.type, next: this.next,
               cells: this.cells.map(c => c.slice()), pxi: this.pxi, pyi: this.pyi,
               score: this.score, lines: this.lines, level: this.level, dropT: this.dropT,
               bag: this.bag.slice() };
    }
    restore(s) {
      this.grid = s.grid.map(r => r.slice()); this.type = s.type; this.next = s.next;
      this.cells = s.cells.map(c => c.slice()); this.pxi = s.pxi; this.pyi = s.pyi;
      this.score = s.score; this.lines = s.lines; this.level = s.level; this.dropT = s.dropT;
      this.bag = s.bag.slice();
    }
    cell(ctx, x, y, color) {
      NE.glowRect(ctx, color, this.ox + x * CELL + 1, this.oy + y * CELL + 1, CELL - 2, CELL - 2, 4);
    }
    render(ctx) {
      // well
      ctx.save(); ctx.strokeStyle = P.dim; ctx.lineWidth = 2;
      ctx.strokeRect(this.ox - 2, this.oy - 2, COLS * CELL + 4, ROWS * CELL + 4); ctx.restore();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
        if (this.grid[y][x]) this.cell(ctx, x, y, this.grid[y][x]);
      // ghost
      let gy = this.pyi; while (!this.collides(this.cells, this.pxi, gy + 1)) gy++;
      for (const [cx, cy] of this.cells) {
        const x = this.pxi + cx, y = gy + cy;
        if (y >= 0) { ctx.save(); ctx.globalAlpha = 0.18;
          this.cell(ctx, x, y, PIECES[this.type].c); ctx.restore(); }
      }
      // active piece
      for (const [cx, cy] of this.cells) { const y = this.pyi + cy; if (y >= 0) this.cell(ctx, this.pxi + cx, y, PIECES[this.type].c); }
      // HUD (right)
      const hx = this.ox + COLS * CELL + 30;
      NE.text(ctx, "SCORE", hx, 50, { size: 14, color: P.dim });
      NE.text(ctx, String(this.score), hx, 68, { size: 30 });
      NE.text(ctx, "LINES", hx, 120, { size: 14, color: P.dim });
      NE.text(ctx, String(this.lines), hx, 138, { size: 24 });
      NE.text(ctx, "LEVEL", hx, 185, { size: 14, color: P.dim });
      NE.text(ctx, String(this.level), hx, 203, { size: 24 });
      NE.text(ctx, "NEXT", hx, 250, { size: 14, color: P.dim });
      for (const [cx, cy] of PIECES[this.next].cells)
        NE.glowRect(ctx, PIECES[this.next].c, hx + (cx + 1) * 20, 275 + (cy) * 20, 18, 18, 4);
      NE.drawEcho(ctx, hx + 40, 360, 16, P.cyan, 1, this.t);
      // left hint
      NE.text(ctx, "←→ move  ↑ rotate  ↓ soft  SPACE drop",
              this.W / 2, this.H - 22, { size: 13, color: P.dim, align: "center" });
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "STACK TOPPED", `score ${this.score}   -   ENTER retry   ESC menu`);
    }
  }
  NE.register("stacks",
    { title: "NEON STACKS", genre: "Block stacker", color: P.lime,
      desc: "Stack falling neon blocks and clear lines. Bad drop? Rewind and place it right." },
    Stacks);
})();
