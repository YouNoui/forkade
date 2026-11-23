/* GAME 12 - DEMOLITION CHAIN : plan-the-blast puzzle.
   Tap/click blocks to place charges (limited per level), then DETONATE.
   A charge blows a 3x3 hole; GAS cans blow 5x5 and set off anything nearby, so chains matter.
   STEEL survives one blast. The building collapses after the blast.
   Win: nothing left above the dashed line. Plan didn't work? Hold R and rewind it. */
(function () {
  const NE = Forkade, P = NE.palette;
  const CELL = 30, COLS = 14, ROWS = 12, EMPTY = 0, BLOCK = 1, STEEL = 2, GAS = 3, MAX_DEBRIS = 150;

  class Demo extends NE.GameBase {
    reset() {
      this.elapsed=0;this.fxSeed=4919;this.makeTiles();this.gx = 60; this.gy = this.H - 40 - ROWS * CELL;
      this.level = 1; this.score = 0; this.state = "play";
      this.btn = { x: this.W - 210, y: this.H - 110, w: 170, h: 54 };
      this.newLevel();
    }
    newLevel() {
      // build sites until one is PROVEN beatable with the charges given (fair puzzles, every level)
      this.debris = []; this.queue = []; this.charges = [];
      const L = this.level, base = Math.max(3, 6 - Math.floor(L / 2));
      let best = null;
      for (let attempt = 0; attempt < 30 && !best; attempt++) {
        this.build(L);
        for (let extra = 0; extra <= 2 && !best; extra++) {
          this.left = base + extra;
          if (this.solvable(this.left, 260)) best = { grid: this.grid.slice(), left: this.left };
        }
      }
      if (best) { this.grid = best.grid; this.left = best.left; } else { this.build(1); this.left = 6; }
      if(NE.assist(this.id))this.left++;
      this.line = 3; this.charges = []; this.phase = "plan";
      this.queue = []; this.boomT = 0; this.fallT = 0; this.idle = 0; this.debris = []; this.prevDown = false;
      this.destroyed=0;this.chainGoal=false;this.bestWave=0;this.bonus=0;this.initial = this.grid.reduce((n, v) => n + (v ? 1 : 0), 0);
    }
    fx(a,b){this.fxSeed=(Math.imul(this.fxSeed,1664525)+1013904223)>>>0;return a+(b-a)*this.fxSeed/4294967296;}
    makeTiles(){
      this.tiles=[null,...[P.violet,"#b8bcd8",P.amber].map((color,k)=>{
        const c=document.createElement('canvas');c.width=c.height=CELL;const x=c.getContext('2d');
        x.fillStyle='rgba(0,0,0,.45)';x.fillRect(3,4,27,26);
        const g=x.createLinearGradient(0,0,30,30);g.addColorStop(0,color);g.addColorStop(1,'#202237');x.fillStyle=g;
        x.beginPath();x.roundRect(1,1,27,27,k===2?7:3);x.fill();x.strokeStyle=color;x.stroke();
        x.fillStyle='#111629';if(k===0){for(let r=0;r<2;r++)for(let j=0;j<2;j++)x.fillRect(6+j*12,7+r*12,6,7);}
        if(k===1){x.strokeStyle='#fff';x.lineWidth=2;x.beginPath();x.moveTo(6,6);x.lineTo(23,23);x.moveTo(23,6);x.lineTo(6,23);x.stroke();}
        if(k===2){x.beginPath();x.moveTo(15,5);x.lineTo(25,23);x.lineTo(5,23);x.closePath();x.fill();x.fillStyle=color;x.fillRect(14,11,2,6);x.fillRect(14,19,2,2);}
        return c;
      })];
    }
    // try random plans quietly; true if any of them clears the site
    solvable(n, tries) {
      const keep = this.grid.slice(), cells = [], gas = [];
      for (let i = 0; i < COLS * ROWS; i++) if (this.grid[i]) { cells.push(i); if (this.grid[i] === GAS) gas.push(i); }
      const low = cells.filter(i => ((i / COLS) | 0) >= ROWS - 7);
      this.quiet = true; let ok = false;
      for (let t = 0; t < tries && !ok; t++) {
        const plan = new Set(); let guard = 0;
        while (plan.size < Math.min(n, cells.length) && guard++ < 100) {
          const pool = NE.rng() < 0.45 && gas.length ? gas : (low.length ? low : cells); plan.add(pool[(NE.rng() * pool.length) | 0]);
        }
        this.grid = keep.slice(); this.charges = []; this.queue = [...plan].map(i => ({ i, r: 1, at: 0 }));
        for (let w = 0; this.queue.length && w < 40; w++) {
          const now = this.queue.filter(q => q.at <= w); this.queue = this.queue.filter(q => q.at > w); now.forEach(q => this.blast(q.i, q.r, w));
        }
        for (let k = 0; k < 40 && this.collapse(); k++);
        ok = this.tallest() <= 3;
      }
      this.quiet = false; this.grid = keep; this.queue = []; this.charges = []; this.debris = []; this.score = this._score || this.score;
      return ok;
    }
    build(L) {
      this._score = this.score;
      const g = this.grid = new Int8Array(COLS * ROWS);
      // a few towers side by side, taller and tougher each level
      let x = 1;
      while (x < COLS - 1) {
        const w = 2 + ((NE.rng() * 3) | 0), h = Math.min(ROWS, 5 + ((NE.rng() * (2 + Math.min(5, L))) | 0));
        for (let cx = x; cx < Math.min(COLS, x + w); cx++) for (let r = 0; r < h; r++) {
          const i = (ROWS - 1 - r) * COLS + cx;
          g[i] = (L >= 2 && r % 4 === 0 && NE.rng() < 0.35 + L * 0.05) ? STEEL : BLOCK;
        }
        for (let k = 0; k < (NE.rng() < 0.7 ? 1 : 2); k++) {         // gas cans hidden in the towers
          const cx = x + ((NE.rng() * w) | 0), r = 1 + ((NE.rng() * (h - 2)) | 0);
          if (cx < COLS) g[(ROWS - 1 - r) * COLS + cx] = GAS;
        }
        x += w + 1;
      }
    }
    cellAt(mx, my) {
      const cx = Math.floor((mx - this.gx) / CELL), cy = Math.floor((my - this.gy) / CELL);
      return cx >= 0 && cx < COLS && cy >= 0 && cy < ROWS ? cy * COLS + cx : -1;
    }
    tallest() { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.grid[r * COLS + c]) return ROWS - r; return 0; }
    blast(i, radius, wave) {
      const cx = i % COLS, cy = (i / COLS) | 0, px = this.gx + cx * CELL + CELL / 2, py = this.gy + cy * CELL + CELL / 2;
      if (!this.quiet) { this.bestWave=Math.max(this.bestWave,wave+1);this.juice?.hit(px,py,wave?'CHAIN ×'+(wave+1):'BLAST',true);NE.sfx.explode(); this.shake.add(6 + radius * 3);
        this.particles.emit(px, py, radius > 1 ? P.amber : P.magenta, { n: 18 + radius * 10, speed: 5 + radius * 2, life: 0.6, size: 4 }); }
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx, y = cy + dy; if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
        const j = y * COLS + x, t = this.grid[j]; if (!t) continue;
        if (t === STEEL && radius < 2) { this.grid[j] = BLOCK; continue; }      // steel: survives a small blast once
        if (t === GAS) { this.grid[j] = EMPTY; this.queue.push({ i: j, r: 2, at: wave + 1 }); continue; }
        this.grid[j] = EMPTY; if (this.quiet) continue; this.score += 10;this.destroyed++;if(this.destroyed>=12&&!this.chainGoal){this.chainGoal=true;this.score+=150;this.juice?.hit(this.W/2,100,'12 BLOCKS +150',true);}
        const ci = this.charges.indexOf(j); if (ci >= 0) { this.charges.splice(ci, 1); this.queue.push({ i: j, r: 1, at: wave + 1 }); }
        for (let k = 0; k < 2; k++) this.debris.push({ x: this.gx + x * CELL + CELL / 2, y: this.gy + y * CELL + CELL / 2,
          vx: dx * 160 + this.fx(-120, 120), vy: dy * 120 - this.fx(120, 380), rot: this.fx(0, NE.TAU), vr: this.fx(-9, 9),
          s: this.fx(5, 10), c: t === STEEL ? "#b8bcd8" : P.violet, life: this.fx(0.9, 1.7) });
      }
      if (this.debris.length > MAX_DEBRIS) this.debris.splice(0, this.debris.length - MAX_DEBRIS);
    }
    collapse() {
      let moved = false;
      for (let r = ROWS - 2; r >= 0; r--) for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c, j = i + COLS;
        if (this.grid[i] && !this.grid[j]) { this.grid[j] = this.grid[i]; this.grid[i] = EMPTY; moved = true;
          const ci = this.charges.indexOf(i); if (ci >= 0) this.charges[ci] = j; }
      }
      return moved;
    }
    step(dt) {
      this.elapsed+=dt;const I = this.input, M = I.mouse, click = I.tapped; this.prevDown = M.down;   // tapped = every press, however quick
      if (this.state !== "play") return;
      for (const d of this.debris) { d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; d.life -= dt; }
      let alive=0;for(const d of this.debris)if(d.life>0&&d.y<this.H+40)this.debris[alive++]=d;this.debris.length=alive;
      const b = this.btn, onBtn = M.x > b.x && M.x < b.x + b.w && M.y > b.y && M.y < b.y + b.h;

      if (this.phase === "plan") {
        if (click && onBtn || I.pressed.Space || I.pressed.Enter) {
          if (!this.charges.length) return;
          this.phase = "boom"; this.boomT = 0; this.wave = 0;
          this.queue = this.charges.map(i => ({ i, r: 1, at: 0 })); this.charges = []; return;
        }
        if (click) {
          const i = this.cellAt(M.x, M.y); if (i < 0 || !this.grid[i]) return;
          const ci = this.charges.indexOf(i);
          if (ci >= 0) { this.charges.splice(ci, 1); this.left++; NE.sfx.ui(); }
          else if (this.left > 0) { this.charges.push(i); this.left--; NE.sfx.pickup(); }
        }
      } else if (this.phase === "boom") {
        this.boomT -= dt;
        if (this.boomT <= 0) {
          const now = this.queue.filter(q => q.at <= this.wave); this.queue = this.queue.filter(q => q.at > this.wave);
          now.forEach(q => this.blast(q.i, q.r, this.wave));
          this.wave++; this.boomT = 0.16;
          if (!this.queue.length) { this.phase = "fall"; this.fallT = 0; this.idle = 0; }
        }
      } else if (this.phase === "fall") {
        this.fallT += dt;
        if (this.fallT > 0.05) { this.fallT = 0; if (this.collapse()) this.idle = 0; else this.idle += 0.05; }
        if (this.idle > 0.4) {
          if (this.tallest() <= this.line) {
            this.phase = "clear"; const bonus = this.left * 150 + this.level * 100; this.score += bonus; this.bonus = bonus;
            NE.sfx.win(); this.reward(6 + 4 * this.level, `site ${this.level} cleared`, "site" + this.level);
          } else this.phase = this.left > 0 ? "plan" : "fail";
        }
      } else if (this.phase === "clear") {
        if (click || I.pressed.Space || I.pressed.Enter) { this.level++; this.newLevel(); }
      } else if (this.phase === "fail") {
        if (click || I.pressed.Enter) this.state = "over";      // give up; or hold R to rewind and try again
      }
    }
    snapshot() {
      // don't record the result screens: then holding R from "still standing" always reaches your plan
      if (this.state !== "play" || this.phase === "fail" || this.phase === "clear") return null;
      return { grid: this.grid.slice(), charges: this.charges.slice(), left: this.left, phase: this.phase,
               queue: this.queue.map(q => ({ ...q })), boomT: this.boomT, wave: this.wave, fallT: this.fallT, idle: this.idle,
               level: this.level, score: this.score, bonus: this.bonus, initial: this.initial,elapsed:this.elapsed,fxSeed:this.fxSeed,destroyed:this.destroyed,chainGoal:this.chainGoal,bestWave:this.bestWave,
               debris: this.debris.map(d => ({ ...d })) };
    }
    restore(s) {
      this.grid = s.grid.slice(); this.charges = s.charges.slice(); this.queue = s.queue.map(q => ({ ...q }));
      this.debris = s.debris.map(d => ({ ...d }));
      Object.assign(this, { left: s.left, phase: s.phase, boomT: s.boomT, wave: s.wave, fallT: s.fallT, idle: s.idle,
        level: s.level, score: s.score, bonus: s.bonus, initial: s.initial,elapsed:s.elapsed,fxSeed:s.fxSeed,destroyed:s.destroyed,chainGoal:s.chainGoal,bestWave:s.bestWave });
      this.prevDown = true;   // releasing R shouldn't count as a click
    }
    render(ctx) {
      const gx = this.gx, gy = this.gy, lineY = gy + (ROWS - this.line) * CELL;
      NE.glowLine(ctx, P.magenta, 0, gy + ROWS * CELL, this.W, gy + ROWS * CELL, 2);
      ctx.save(); ctx.setLineDash([8, 8]); ctx.strokeStyle = P.lime; ctx.globalAlpha = 0.7; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gx - 20, lineY); ctx.lineTo(gx + COLS * CELL + 20, lineY); ctx.stroke(); ctx.restore();
      NE.text(ctx, "clear above this line", gx + COLS * CELL + 26, lineY - 9, { size: 12, color: P.lime, glow: false });
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const t = this.grid[r * COLS + c]; if (!t) continue;
        const x = gx + c * CELL, y = gy + r * CELL;
        ctx.drawImage(this.tiles[t],x,y);
      }
      for (const i of this.charges) {
        const x = gx + (i % COLS) * CELL + CELL / 2, y = gy + ((i / COLS) | 0) * CELL + CELL / 2;
        NE.glowCircle(ctx, P.red, x, y, 8 + Math.sin(this.t * 10) * 1.5);
      }
      for (const d of this.debris) {
        ctx.save(); ctx.globalAlpha = Math.min(1, d.life); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
        ctx.shadowColor = d.c; ctx.shadowBlur = 8; ctx.fillStyle = d.c; ctx.fillRect(-d.s / 2, -d.s / 2, d.s, d.s); ctx.restore();
      }
      // side panel
      const hx = this.W - 230;
      NE.text(ctx, String(this.score), hx, 20, { size: 36 });
      NE.text(ctx, `SITE ${this.level}`, hx, 64, { size: 15, color: P.dim });
      NE.text(ctx, "CHARGES", hx, 104, { size: 14, color: P.dim });
      for (let k = 0; k < this.left; k++) NE.glowCircle(ctx, P.red, hx + 12 + k * 26, 140, 8);
      NE.text(ctx, "tap blocks to place / remove", hx, 176, { size: 12, color: P.dim, glow: false });
      NE.text(ctx, "△ = gas: big chain blast", hx, 196, { size: 12, color: P.amber, glow: false });
      NE.text(ctx, "grey = steel: needs 2 hits", hx, 216, { size: 12, color: "#b8bcd8", glow: false });
      NE.text(ctx,this.chainGoal?'12 BLOCKS ✓':`BLOCK GOAL ${this.destroyed}/12`,hx,246,{size:14,color:P.lime});NE.drawEcho(ctx, hx + 60, 290, 18, NE.palette.cyan, -1, this.t);
      const b = this.btn, ready = this.phase === "plan" && this.charges.length > 0;
      NE.glowRect(ctx, ready ? P.red : P.dim, b.x, b.y, b.w, b.h, 12, ready ? 0 : 2);
      NE.text(ctx, "DETONATE", b.x + b.w / 2, b.y + 15, { size: 20, color: ready ? P.bg : P.dim, align: "center", glow: false });
      if (this.phase === "clear")
        NE.banner(ctx, this.W, this.H, `SITE ${this.level} CLEARED!`, `+${this.bonus} bonus   -   click / SPACE for the next site`);
      if (this.phase === "fail")
        NE.banner(ctx, this.W, this.H, "STILL STANDING", "hold R to rewind and try another plan   ·   tap to give up");
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "DEMOLITION CALLED OFF", `score ${this.score} · site ${this.level} · best wave ${this.bestWave} · tap to retry`);
    }
  }
  Demo.prototype.rewindSeconds = 6;   // long enough to rewind a whole blast + collapse
  NE.register("demo",
    { polished:true,world:["#171528","#30243e","#e8a55c"],scene:"forge",music:{root:146.83,tempo:96,wave:"triangle"},hint:"TAP CHARGES · THEN DETONATE",touch: "tap", title: "DEMOLITION CHAIN", genre: "Blast puzzle", color: P.amber,
      desc: "Place a few charges, hit DETONATE and chain gas cans to bring the building below the line. Bad plan? Rewind it." },
    Demo);
})();
