/* GAME 8 - CORE MATCH : swap-and-match-3 with endless levels */
(function () {
  const NE = Forkade, P = NE.palette, N = 8, CELL = 52;
  const GC = [P.cyan, P.magenta, P.lime, P.amber, P.violet, P.red];

  class Match extends NE.GameBase {
    reset() {
      this.cell=this.H>this.W?64:52;this.elapsed=0;this.swaps=0;this.bestCascade=0;this.bonus=0;this.makeTiles();
      this.ox = (this.W - N * this.cell) / 2 - (this.H>this.W?0:60);
      this.oy = this.H>this.W?155:(this.H - N * this.cell) / 2 + 10;
      this.prevDown = false;
      this.score = 0; this.level = 1; this.state = "play";
      this.startLevel();
    }
    makeTiles(){this.tiles=GC.map((_,v)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=this.cell;const ctx=canvas.getContext('2d');        const cx=this.cell/2,cy=this.cell/2,rad=this.cell*.34;ctx.save();ctx.fillStyle=GC[v];ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;ctx.shadowColor=GC[v];ctx.shadowBlur=NE.settings.reduceMotion?0:9;ctx.beginPath();
        if(v===0)ctx.arc(cx,cy,rad,0,NE.TAU);else{const points=v===2?3:v===4?10:4;for(let k=0;k<points;k++){const a=k*NE.TAU/points-Math.PI/2,r=v===4&&k%2?rad*.5:rad;ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}ctx.closePath();}ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.3)';ctx.beginPath();ctx.ellipse(cx-5,cy-7,rad*.3,rad*.15,-.5,0,NE.TAU);ctx.fill();ctx.restore();return canvas;});}
    // each level: fresh board, refilled moves, a bigger goal. Score carries over.
    startLevel() {
      const L = this.level;
      this.colors = L <= 2 ? 5 : 6;this.charge=0;this.cascadeGoal=false;this.pulse=0;
      this.g = Array.from({ length: N }, () => Array.from({ length: N }, () => (NE.rng() * this.colors) | 0));
      this.removeInitial();
      // tuned so an average level takes ~15-25 moves and the squeeze tightens each level
      this.need = 1500 + (L - 1) * 300;  // points needed THIS level
      this.got = 0; this.moves = Math.min(34, 20 + 2 * (L - 1)); this.phase = "play"; this.sel = null; if(NE.assist(this.id))this.moves+=5;
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
          if (score) this.particles.emit(this.ox + c * this.cell + this.cell/2, this.oy + r * this.cell + this.cell/2, GC[this.g[r][c]], { n: 6, speed: 3 });
          this.g[r][c] = -1;
        }
        if (!count) break;
        chain++;this.bestCascade=Math.max(this.bestCascade,chain);
        if (score) { this.juice?.hit(this.ox+N*this.cell/2,this.oy+N*this.cell/2,'CASCADE ×'+chain,chain>1);total += count * 20 * chain; this.shake.add(2 + chain); NE.sfx.pickup(); if (chain > 1) NE.sfx.explode(); }
        // collapse + refill
        for (let c = 0; c < N; c++) {
          let col = [];
          for (let r = N - 1; r >= 0; r--) if (this.g[r][c] >= 0) col.push(this.g[r][c]);
          for (let r = N - 1; r >= 0; r--) this.g[r][c] = col.length ? col.shift() : ((NE.rng() * this.colors) | 0);
        }
      }
      if(score&&chain>=2&&!this.cascadeGoal){this.cascadeGoal=true;total+=120;this.juice?.hit(this.W/2,this.oy-30,'DOUBLE CASCADE +120',true);}
      if (score) { this.score += total; this.got += total; }
      return chain > 0;
    }
    cellAt(mx, my) {
      const c = Math.floor((mx - this.ox) / this.cell), r = Math.floor((my - this.oy) / this.cell);
      return (r >= 0 && r < N && c >= 0 && c < N) ? { r, c } : null;
    }
    step(dt) {
      this.elapsed+=dt;this.pulse=Math.max(0,this.pulse-dt);const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }
      const down = I.mouse.down;
      if (this.phase === "clear") {
        if ((down && !this.prevDown) || I.pressed.Enter || I.pressed.Space) { this.level++; this.startLevel(); NE.sfx.ui(); }
        this.prevDown = down; return;
      }
      if (I.tapped || down && !this.prevDown) {
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
      if (this.resolve(true)) { this.moves--;this.swaps++;if(++this.charge===4){this.charge=0;this.moves+=2;this.score+=100;this.got+=100;this.pulse=1;this.juice?.hit(this.W/2,this.oy-30,'ECHO PULSE +2 MOVES · +100',true);} }
      else { // no match: swap back
        const u = this.g[a.r][a.c]; this.g[a.r][a.c] = this.g[b.r][b.c]; this.g[b.r][b.c] = u;
        NE.sfx.bounce();
      }
      if (this.got >= this.need) {
        this.bonus = this.moves * 40 * this.level; this.score += this.bonus;
        this.phase = "clear"; NE.sfx.win(); this.shake.add(6);
        this.reward(5 + 5 * this.level, `level ${this.level} cleared`, "lvl" + this.level);
      }
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { g: this.g.map(r => r.slice()), sel: this.sel, score: this.score, moves: this.moves,
               level: this.level, need: this.need, got: this.got, phase: this.phase, colors: this.colors, bonus: this.bonus,elapsed:this.elapsed,swaps:this.swaps,bestCascade:this.bestCascade,charge:this.charge,cascadeGoal:this.cascadeGoal,pulse:this.pulse };
    }
    restore(s) {
      this.g = s.g.map(r => r.slice()); this.sel = s.sel; this.score = s.score; this.moves = s.moves;
      Object.assign(this, { level: s.level, need: s.need, got: s.got, phase: s.phase, colors: s.colors, bonus: s.bonus,elapsed:s.elapsed,swaps:s.swaps,bestCascade:s.bestCascade,charge:s.charge,cascadeGoal:s.cascadeGoal,pulse:s.pulse });
    }
    render(ctx) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = this.g[r][c]; if (v < 0) continue;
        const x = this.ox + c * this.cell, y = this.oy + r * this.cell;
        ctx.drawImage(this.tiles[v],x,y);
        NE.symbol(ctx, v, x + this.cell/2, y + this.cell/2, 24);
      }
      if (this.sel) {
        const x = this.ox + this.sel.c * this.cell, y = this.oy + this.sel.r * this.cell;
        ctx.save(); ctx.strokeStyle = P.white; ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, this.cell - 4, this.cell - 4); ctx.restore();
      }
      const portrait=this.H>this.W,hx=portrait?24:this.ox+N*this.cell+28;
      NE.text(ctx,'CRYSTAL GARDEN · LEVEL '+this.level,portrait?this.W/2:hx,portrait?26:45,{size:portrait?22:14,color:P.cyan,align:portrait?'center':'left'});
      NE.text(ctx,String(this.score)+' pts',hx,portrait?70:85,{size:26});NE.text(ctx,this.moves+' moves',portrait?this.W-24:hx,portrait?70:140,{size:24,color:this.moves<=5?P.red:P.lime,align:portrait?'right':'left'});
      NE.bar(ctx,hx,portrait?115:190,portrait?this.W-48:130,12,this.got/this.need,P.cyan);
      NE.text(ctx,'PULSE '+this.charge+'/4',hx,portrait?710:240,{size:20,color:P.amber});NE.text(ctx,this.cascadeGoal?'DOUBLE CASCADE ✓':'GOAL: DOUBLE CASCADE',hx,portrait?745:280,{size:portrait?18:12,color:P.lime});
      NE.drawEcho(ctx,portrait?this.W-70:hx+50,portrait?750:350,18,P.cyan,1,this.t);
      NE.text(ctx,'Tap a core, then a neighbour',this.W/2,this.H-45,{size:16,color:P.dim,align:'center'});
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "OUT OF MOVES", `score ${this.score} · ${this.swaps} swaps · best cascade ${this.bestCascade} · tap to retry`);
      if (this.phase === "clear" && this.state === "play")
        NE.banner(ctx, this.W, this.H, `LEVEL ${this.level} CLEARED!`, `+${this.bonus} for spare moves   -   click / SPACE for level ${this.level + 1}`);
    }
  }
  NE.register("match",
    { polished:true,world:["#101a29","#18394a","#62f5cf"],scene:"reactor",music:{root:196,tempo:110,wave:"sine"},hint:"TAP TWO NEIGHBOURING CORES",touch: "tap", title: "CORE MATCH", genre: "Match-3 puzzle", color: P.magenta,
      desc: "Swap neon cores to line up 3+, chain cascades, climb endless levels. Misfire? Rewind the move." },
    Match);
})();
