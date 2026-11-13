/* GAME 8 - CORE MATCH : swap-and-match-3 with endless levels */
(function () {
  const NE = Forkade, P = NE.palette, N = 8, CELL = 52;
  const GC = [P.cyan, P.magenta, P.lime, P.amber, P.violet, P.red];

  class Match extends NE.GameBase {
    reset() {
      this.ox = (this.W - N * CELL) / 2 - 60;
      this.oy = (this.H - N * CELL) / 2 + 10;
      this.prevDown = false;
      this.score = 0; this.level = 1; this.state = "play";
      this.startLevel();
    }
    // each level: fresh board, refilled moves, a bigger goal. Score carries over.
    startLevel() {
      const L = this.level;
      this.colors = L <= 2 ? 5 : 6;
      this.g = Array.from({ length: N }, () => Array.from({ length: N }, () => (Math.random() * this.colors) | 0));
      this.removeInitial();
      // tuned so an average level takes ~15-25 moves and the squeeze tightens each level
      this.need = 1500 + (L - 1) * 300;  // points needed THIS level
      this.got = 0; this.moves = Math.min(34, 20 + 2 * (L - 1)); this.phase = "play"; this.sel = null;
    }
    removeInitial() {
      // re-roll any cell that forms a line, until the board is clean
      for (let pass = 0; pass < 40; pass++) {
        let changed = false;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (c >= 2 && this.g[r][c] === this.g[r][c-1] && this.g[r][c] === this.g[r][c-2]) { this.g[r][c] = (this.g[r][c] + 1) % this.colors; changed = true; }
          if (r >= 2 && this.g[r][c] === this.g[r-1][c] && this.g[r][c] === this.g[r-2][c]) { this.g[r][c] = (this.g[r][c] + 1) % this.colors; changed = true; }
        }
        if (!changed) break;
      }
    }
    findMatched() {
      const m = Array.from({ length: N }, () => Array(N).fill(false));
      for (let r = 0; r < N; r++) for (let c = 0; c < N - 2; c++) {
        const v = this.g[r][c];
        if (v >= 0 && v === this.g[r][c+1] && v === this.g[r][c+2]) m[r][c] = m[r][c+1] = m[r][c+2] = true;
      }
      for (let c = 0; c < N; c++) for (let r = 0; r < N - 2; r++) {
        const v = this.g[r][c];
        if (v >= 0 && v === this.g[r+1][c] && v === this.g[r+2][c]) m[r][c] = m[r+1][c] = m[r+2][c] = true;
      }
      return m;
    }
    resolve(score) {
      let chain = 0, total = 0;
      while (true) {
        const m = this.findMatched();
        let count = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (m[r][c]) {
          count++;
          if (score) this.particles.emit(this.ox + c * CELL + CELL/2, this.oy + r * CELL + CELL/2, GC[this.g[r][c]], { n: 6, speed: 3 });
          this.g[r][c] = -1;
        }
        if (!count) break;
        chain++;
        if (score) { total += count * 20 * chain; this.shake.add(2 + chain); NE.sfx.pickup(); if (chain > 1) NE.sfx.explode(); }
        // collapse + refill
        for (let c = 0; c < N; c++) {
          let col = [];
          for (let r = N - 1; r >= 0; r--) if (this.g[r][c] >= 0) col.push(this.g[r][c]);
          for (let r = N - 1; r >= 0; r--) this.g[r][c] = col.length ? col.shift() : ((Math.random() * this.colors) | 0);
        }
      }
      if (score) { this.score += total; this.got += total; }
      return chain > 0;
    }
    cellAt(mx, my) {
      const c = Math.floor((mx - this.ox) / CELL), r = Math.floor((my - this.oy) / CELL);
      return (r >= 0 && r < N && c >= 0 && c < N) ? { r, c } : null;
    }
    step(dt) {
      const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }
      const down = I.mouse.down;
      if (this.phase === "clear") {
        if ((down && !this.prevDown) || I.pressed.Enter || I.pressed.Space) { this.level++; this.startLevel(); NE.sfx.ui(); }
        this.prevDown = down; return;
      }
      if (down && !this.prevDown) {
        const hit = this.cellAt(I.mouse.x, I.mouse.y);
        if (hit) {
          if (!this.sel) { this.sel = hit; NE.sfx.ui(); }
          else if (this.sel.r === hit.r && this.sel.c === hit.c) this.sel = null;
          else if (Math.abs(this.sel.r - hit.r) + Math.abs(this.sel.c - hit.c) === 1) {
            this.trySwap(this.sel, hit); this.sel = null;
          } else { this.sel = hit; NE.sfx.ui(); }
        }
      }
      this.prevDown = down;
      if (this.moves <= 0 && this.got < this.need) this.state = "over";
    }
    trySwap(a, b) {
      const t = this.g[a.r][a.c]; this.g[a.r][a.c] = this.g[b.r][b.c]; this.g[b.r][b.c] = t;
      if (this.resolve(true)) { this.moves--; }
      else { // no match: swap back
        const u = this.g[a.r][a.c]; this.g[a.r][a.c] = this.g[b.r][b.c]; this.g[b.r][b.c] = u;
        NE.sfx.bounce();
      }
      if (this.got >= this.need) {
        this.bonus = this.moves * 40 * this.level; this.score += this.bonus;
        this.phase = "clear"; NE.sfx.win(); this.shake.add(6);
      }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { g: this.g.map(r => r.slice()), sel: this.sel, score: this.score, moves: this.moves,
               level: this.level, need: this.need, got: this.got, phase: this.phase, colors: this.colors, bonus: this.bonus };
    }
    restore(s) {
      this.g = s.g.map(r => r.slice()); this.sel = s.sel; this.score = s.score; this.moves = s.moves;
      Object.assign(this, { level: s.level, need: s.need, got: s.got, phase: s.phase, colors: s.colors, bonus: s.bonus });
    }
    render(ctx) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = this.g[r][c]; if (v < 0) continue;
        const x = this.ox + c * CELL, y = this.oy + r * CELL;
        NE.glowRect(ctx, GC[v], x + 5, y + 5, CELL - 10, CELL - 10, 9);
      }
      if (this.sel) {
        const x = this.ox + this.sel.c * CELL, y = this.oy + this.sel.r * CELL;
        ctx.save(); ctx.strokeStyle = P.white; ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4); ctx.restore();
      }
      // HUD right
      const hx = this.ox + N * CELL + 28;
      NE.text(ctx, "SCORE", hx, 70, { size: 14, color: P.dim });
      NE.text(ctx, String(this.score), hx, 88, { size: 30 });
      NE.text(ctx, `LEVEL ${this.level}  GOAL`, hx, 140, { size: 14, color: P.dim });
      NE.text(ctx, `${Math.min(this.got, this.need)} / ${this.need}`, hx, 158, { size: 20, color: P.lime });
      NE.text(ctx, "MOVES", hx, 205, { size: 14, color: P.dim });
      NE.text(ctx, String(this.moves), hx, 223, { size: 30, color: this.moves <= 5 ? P.red : P.ink });
      NE.bar(ctx, hx, 270, 130, 12, this.got / this.need, this.got >= this.need ? P.lime : P.amber);
      NE.drawEcho(ctx, hx + 50, 330, 16, P.cyan, 1, this.t);
      NE.text(ctx, "click a core, then a neighbour to swap", this.W / 2, this.H - 20, { size: 13, color: P.dim, align: "center" });
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "OUT OF MOVES", `score ${this.score}   -   ENTER retry   ESC menu`);
      if (this.phase === "clear" && this.state === "play")
        NE.banner(ctx, this.W, this.H, `LEVEL ${this.level} CLEARED!`, `+${this.bonus} for spare moves   -   click / SPACE for level ${this.level + 1}`);
    }
  }
  NE.register("match",
    { title: "CORE MATCH", genre: "Match-3 puzzle", color: P.magenta,
      desc: "Swap neon cores to line up 3+, chain cascades, climb endless levels. Misfire? Rewind the move." },
    Match);
})();
