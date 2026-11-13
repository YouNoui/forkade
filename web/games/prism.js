/* GAME 7 - PRISM STACKS : colour-burst stacker (Forkade original)
   Small 2-4 cell shards fall into a 12x16 well. Clear a row by filling it,
   OR burst any group of 4+ touching cells of the same colour. After a burst,
   loose cells fall on their own and can chain into more bursts. */
(function () {
  const NE = Forkade, P = NE.palette, CELL = 30, COLS = 12, ROWS = 16;
  const COLORS = [P.cyan, P.magenta, P.lime, P.amber];

  // shards: 2-4 cells. Deliberately not the classic 7 four-block set.
  const SHAPES = [
    [[0,0],[1,0]],                    // duo
    [[0,0],[1,0],[2,0]],              // bar3
    [[0,0],[1,0],[0,1]],              // corner
    [[0,0],[1,1]],                    // diagonal pair (falls as a pair)
    [[0,0],[1,0],[2,0],[1,-1]],       // arrow
    [[0,0],[0,1],[1,1],[2,1],[2,0]],  // cup (5)
  ];

  class Prism extends NE.GameBase {
    reset() {
      this.ox = (this.W - COLS * CELL) / 2 - 90;
      this.oy = (this.H - ROWS * CELL) / 2;
      this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); // 0 empty, 1..4 colour
      this.next = this.makePiece();
      this.spawn();
      this.score = 0; this.cleared = 0; this.level = 1; this.chain = 0;
      this.dropT = 0; this.settleT = 0; this.settling = false; this.state = "play";
    }
    makePiece() {
      const shape = SHAPES[(Math.random() * SHAPES.length) | 0];
      // each cell gets its own colour - two colours max per shard keeps it readable
      const a = 1 + ((Math.random() * 4) | 0), b = 1 + ((Math.random() * 4) | 0);
      return shape.map(([x, y], i) => [x, y, i % 2 ? b : a]);
    }
    spawn() {
      this.cells = this.next.map(c => c.slice()); this.next = this.makePiece();
      this.pxi = 5; this.pyi = 1;
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
      const r = this.cells.map(([x, y, c]) => [-y, x, c]);
      for (const kick of [0, -1, 1, -2, 2])
        if (!this.collides(r, this.pxi + kick, this.pyi)) { this.cells = r; this.pxi += kick; return; }
    }
    lock() {
      for (const [cx, cy, c] of this.cells) {
        const x = this.pxi + cx, y = this.pyi + cy;
        if (y >= 0) this.grid[y][x] = c;
      }
      NE.sfx.bounce(); this.chain = 0;
      this.settling = true; this.settleT = 0;   // resolve gravity / bursts step by step
    }
    // one resolve tick: drop loose cells one row; if nothing moved, clear rows + bursts
    resolve() {
      let moved = false;
      for (let y = ROWS - 2; y >= 0; y--) for (let x = 0; x < COLS; x++)
        if (this.grid[y][x] && !this.grid[y + 1][x]) { this.grid[y + 1][x] = this.grid[y][x]; this.grid[y][x] = 0; moved = true; }
      if (moved) return true;

      const kill = new Set();
      for (let y = 0; y < ROWS; y++) if (this.grid[y].every(v => v)) for (let x = 0; x < COLS; x++) kill.add(y * COLS + x);
      const seen = new Set();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const c = this.grid[y][x], k = y * COLS + x;
        if (!c || seen.has(k)) continue;
        const group = [k], stack = [[x, y]]; seen.add(k);
        while (stack.length) {
          const [a, b] = stack.pop();
          for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
            const nx = a + dx, ny = b + dy, nk = ny * COLS + nx;
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || seen.has(nk) || this.grid[ny][nx] !== c) continue;
            seen.add(nk); group.push(nk); stack.push([nx, ny]);
          }
        }
        if (group.length >= 4) group.forEach(g => kill.add(g));
      }
      if (!kill.size) return false;
      this.chain++;
      for (const k of kill) {
        const x = k % COLS, y = (k / COLS) | 0;
        this.particles.emit(this.ox + x * CELL + CELL / 2, this.oy + y * CELL + CELL / 2,
                            COLORS[this.grid[y][x] - 1], { n: 4, speed: 3, life: 0.5 });
        this.grid[y][x] = 0;
      }
      this.score += kill.size * 10 * this.chain * this.level;
      this.cleared += kill.size; this.level = 1 + ((this.cleared / 60) | 0);
      this.shake.add(2 + this.chain * 2);
      if (this.chain > 1) NE.sfx.explode(); else NE.sfx.pickup();
      return true;
    }
    step(dt) {
      const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }
      if (this.settling) {
        this.settleT += dt;
        if (this.settleT >= 0.06) { this.settleT = 0; if (!this.resolve()) { this.settling = false; this.spawn(); } }
        return;
      }
      if (I.pressed.ArrowLeft || I.pressed.KeyA) { if (!this.collides(this.cells, this.pxi - 1, this.pyi)) this.pxi--; }
      if (I.pressed.ArrowRight || I.pressed.KeyD) { if (!this.collides(this.cells, this.pxi + 1, this.pyi)) this.pxi++; }
      if (I.pressed.ArrowUp || I.pressed.KeyW) { this.rotate(); NE.sfx.ui(); }
      if (I.pressed.Space) {
        while (!this.collides(this.cells, this.pxi, this.pyi + 1)) { this.pyi++; this.score += 1; }
        this.lock(); return;
      }
      const soft = I.down();
      const interval = Math.max(0.08, 0.75 - (this.level - 1) * 0.06) * (soft ? 0.12 : 1);
      this.dropT += dt;
      if (this.dropT >= interval) {
        this.dropT = 0;
        if (!this.collides(this.cells, this.pxi, this.pyi + 1)) this.pyi++;
        else this.lock();
      }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { grid: this.grid.map(r => r.slice()), cells: this.cells.map(c => c.slice()),
               next: this.next.map(c => c.slice()), pxi: this.pxi, pyi: this.pyi,
               score: this.score, cleared: this.cleared, level: this.level, chain: this.chain,
               dropT: this.dropT, settleT: this.settleT, settling: this.settling };
    }
    restore(s) {
      this.grid = s.grid.map(r => r.slice()); this.cells = s.cells.map(c => c.slice());
      this.next = s.next.map(c => c.slice()); this.pxi = s.pxi; this.pyi = s.pyi;
      this.score = s.score; this.cleared = s.cleared; this.level = s.level; this.chain = s.chain;
      this.dropT = s.dropT; this.settleT = s.settleT; this.settling = s.settling;
    }
    // round "orb" cells - a different look from square blocks
    orb(ctx, px, py, color, r = CELL * 0.42) {
      NE.glowCircle(ctx, color, px, py, r);
      ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(px - r * 0.3, py - r * 0.3, r * 0.28, 0, NE.TAU); ctx.fill(); ctx.restore();
    }
    render(ctx) {
      const gx = this.ox, gy = this.oy;
      ctx.save(); ctx.fillStyle = "rgba(10,8,30,0.6)"; ctx.fillRect(gx, gy, COLS * CELL, ROWS * CELL);
      ctx.strokeStyle = "rgba(160,123,255,0.12)"; ctx.lineWidth = 1;
      for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(gx + x * CELL, gy); ctx.lineTo(gx + x * CELL, gy + ROWS * CELL); ctx.stroke(); }
      ctx.restore();
      NE.glowRect(ctx, P.violet, gx - 3, gy - 3, COLS * CELL + 6, ROWS * CELL + 6, 8, 2);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const c = this.grid[y][x];
        if (c) this.orb(ctx, gx + x * CELL + CELL / 2, gy + y * CELL + CELL / 2, COLORS[c - 1]);
      }
      if (!this.settling && this.state === "play") {
        let g = this.pyi; while (!this.collides(this.cells, this.pxi, g + 1)) g++;
        ctx.save(); ctx.globalAlpha = 0.2;
        for (const [cx, cy, c] of this.cells) if (g + cy >= 0)
          this.orb(ctx, gx + (this.pxi + cx) * CELL + CELL / 2, gy + (g + cy) * CELL + CELL / 2, COLORS[c - 1]);
        ctx.restore();
        for (const [cx, cy, c] of this.cells) if (this.pyi + cy >= 0)
          this.orb(ctx, gx + (this.pxi + cx) * CELL + CELL / 2, gy + (this.pyi + cy) * CELL + CELL / 2, COLORS[c - 1]);
      }
      const hx = gx + COLS * CELL + 36;
      NE.text(ctx, "SCORE", hx, gy + 4, { size: 14, color: P.dim });
      NE.text(ctx, String(this.score), hx, gy + 22, { size: 30 });
      NE.text(ctx, "BURST", hx, gy + 76, { size: 14, color: P.dim });
      NE.text(ctx, String(this.cleared), hx, gy + 94, { size: 22 });
      NE.text(ctx, "LEVEL", hx, gy + 132, { size: 14, color: P.dim });
      NE.text(ctx, String(this.level), hx, gy + 150, { size: 22 });
      if (this.chain > 1) NE.text(ctx, `CHAIN x${this.chain}`, hx, gy + 190, { size: 20, color: P.amber });
      NE.text(ctx, "NEXT", hx, gy + 232, { size: 14, color: P.dim });
      for (const [cx, cy, c] of this.next) this.orb(ctx, hx + 20 + cx * 24, gy + 282 + cy * 24, COLORS[c - 1], 10);
      NE.drawEcho(ctx, hx + 50, gy + 380, 16, P.cyan, 1, this.t);
      NE.text(ctx, "fill a row  or  touch 4+ of one colour", hx, gy + 420, { size: 12, color: P.dim });
      NE.text(ctx, "←→ move  ↑ turn  ↓ soft  SPACE drop", this.W / 2, this.H - 22, { size: 13, color: P.dim, align: "center" });
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "WELL OVERFLOWED", `score ${this.score}   -   ENTER / tap to retry   ESC menu`);
    }
  }
  NE.register("prism",
    { title: "PRISM STACKS", genre: "Colour-burst stacker", color: P.lime,
      desc: "Drop shards, fill a row or touch 4 of a colour to burst. Loose orbs fall and chain. Bad drop? Rewind." },
    Prism);
})();
