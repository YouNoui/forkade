/* GAME 7 - Prism Stacks : colour-burst stacker (Forkade original)
   Small 2-5 cell shards fall into a 12x16 well. Clear a row by filling it,
   OR burst any group of 4+ touching cells of the same colour. After a burst,
   loose cells fall on their own and can chain into more bursts. */
(function () {
  const NE = Forkade, P = NE.palette, COLS = 12, ROWS = 16;
  const COLORS = [P.cyan, P.magenta, P.lime, P.amber];

  // shards: 2-5 cells. Deliberately not the classic 7 four-block set.
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
      this.cell=this.H>this.W?40:30;this.elapsed=0;this.pieces=0;this.bestChain=0;this.clearGoal=false;this.makeTiles();this.ox=(this.W-COLS*this.cell)/2-(this.H>this.W?0:90);
      this.oy=this.H>this.W?100:(this.H-ROWS*this.cell)/2;
      this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); // 0 empty, 1..4 colour
      this.next = this.makePiece();
      this.spawn();
      this.score = 0; this.cleared = 0; this.level = 1; this.chain = 0;
      this.dropT = 0; this.settleT = 0; this.settling = false; this.state = "play";
    }
    makeTiles(){this.tiles=COLORS.map(color=>{const c=document.createElement('canvas');c.width=c.height=this.cell;const x=c.getContext('2d'),r=this.cell*.42,m=this.cell/2,g=x.createRadialGradient(m-r*.3,m-r*.4,1,m,m,r);g.addColorStop(0,'#fff');g.addColorStop(.35,color);g.addColorStop(1,'#24213c');x.fillStyle=g;x.beginPath();x.arc(m,m,r,0,NE.TAU);x.fill();x.strokeStyle=color;x.lineWidth=1.5;x.stroke();return c;});this.board=document.createElement('canvas');this.board.width=COLS*this.cell;this.board.height=ROWS*this.cell;const c=this.board.getContext('2d');c.fillStyle='rgba(10,8,30,.78)';c.fillRect(0,0,this.board.width,this.board.height);c.strokeStyle='rgba(160,123,255,.16)';for(let x=1;x<COLS;x++){c.beginPath();c.moveTo(x*this.cell,0);c.lineTo(x*this.cell,this.board.height);c.stroke();}}
    addClear(n){this.cleared+=n;this.level=1+Math.floor(this.cleared/60);if(this.cleared>=24&&!this.clearGoal){this.clearGoal=true;this.score+=200;this.juice?.hit(this.W/2,80,'24 ORBS +200',true);}}
    makePiece() {
      const shape = SHAPES[(NE.rng() * SHAPES.length) | 0];
      // each cell gets its own colour - two colours max per shard keeps it readable
      const a = 1 + ((NE.rng() * 4) | 0), b = 1 + ((NE.rng() * 4) | 0);
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
      this.pieces++;if(this.pieces%5===0){let count=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const x=this.pxi+dx,y=this.pyi+dy;if(x>=0&&x<COLS&&y>=0&&y<ROWS&&this.grid[y][x]){this.particles.emit(this.ox+(x+.5)*this.cell,this.oy+(y+.5)*this.cell,COLORS[this.grid[y][x]-1],{n:6,speed:4});this.grid[y][x]=0;count++;}}this.score+=count*15;this.addClear(count);this.juice?.hit(this.ox+(this.pxi+.5)*this.cell,this.oy+(this.pyi+.5)*this.cell,'Pulse +'+count*15,true);NE.sfx.explode();}
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
      this.chain++;this.bestChain=Math.max(this.bestChain,this.chain);this.juice?.hit(this.W/2,90,'BURST ×'+this.chain,this.chain>1);
      for (const k of kill) {
        const x = k % COLS, y = (k / COLS) | 0;
        this.particles.emit(this.ox + x * this.cell + this.cell / 2, this.oy + y * this.cell + this.cell / 2,
                            COLORS[this.grid[y][x] - 1], { n: 4, speed: 3, life: 0.5 });
        this.grid[y][x] = 0;
      }
      this.score += kill.size * 10 * this.chain * this.level;
      this.addClear(kill.size);
      this.shake.add(2 + this.chain * 2);
      if (this.chain > 1) NE.sfx.explode(); else NE.sfx.pickup();
      return true;
    }
    step(dt) {
      this.elapsed+=dt;const I = this.input;
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
               dropT: this.dropT, settleT: this.settleT, settling:this.settling,elapsed:this.elapsed,pieces:this.pieces,bestChain:this.bestChain,clearGoal:this.clearGoal };
    }
    restore(s) {
      this.grid = s.grid.map(r => r.slice()); this.cells = s.cells.map(c => c.slice());
      this.next = s.next.map(c => c.slice()); this.pxi = s.pxi; this.pyi = s.pyi;
      this.score = s.score; this.cleared = s.cleared; this.level = s.level; this.chain = s.chain;
      this.dropT = s.dropT; this.settleT = s.settleT; this.settling=s.settling;Object.assign(this,{elapsed:s.elapsed,pieces:s.pieces,bestChain:s.bestChain,clearGoal:s.clearGoal});
    }
    // round "orb" cells - a different look from square blocks
    orb(ctx, px, py, color, r = this.cell * 0.42) {
      const size=r/.42;ctx.drawImage(this.tiles[COLORS.indexOf(color)],px-size/2,py-size/2,size,size);
      NE.symbol(ctx,COLORS.indexOf(color),px,py,r*1.3);
    }

    render(ctx) {
      const gx = this.ox, gy = this.oy;
      ctx.drawImage(this.board,gx,gy);
      NE.glowRect(ctx, P.violet, gx - 3, gy - 3, COLS * this.cell + 6, ROWS * this.cell + 6, 8, 2);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const c = this.grid[y][x];
        if (c) this.orb(ctx, gx + x * this.cell + this.cell / 2, gy + y * this.cell + this.cell / 2, COLORS[c - 1]);
      }
      if (!this.settling && this.state === "play") {
        let g = this.pyi; while (!this.collides(this.cells, this.pxi, g + 1)) g++;
        ctx.save(); ctx.globalAlpha = 0.2;
        for (const [cx, cy, c] of this.cells) if (g + cy >= 0)
          this.orb(ctx, gx + (this.pxi + cx) * this.cell + this.cell / 2, gy + (g + cy) * this.cell + this.cell / 2, COLORS[c - 1]);
        ctx.restore();
        for (const [cx, cy, c] of this.cells) if (this.pyi + cy >= 0)
          this.orb(ctx, gx + (this.pxi + cx) * this.cell + this.cell / 2, gy + (this.pyi + cy) * this.cell + this.cell / 2, COLORS[c - 1]);
      }
      const portrait=this.H>this.W,hx=gx+COLS*this.cell+36;
      if(portrait){NE.text(ctx,String(this.score)+' score',20,18,{size:30});NE.text(ctx,'Level '+this.level,this.W-20,22,{size:20,align:'right',color:P.dim});NE.text(ctx,'Burst '+this.cleared,20,64,{size:18,color:P.cyan});NE.text(ctx,(this.pieces+1)%5===0?'Pulse ready':'Pulse '+this.pieces%5+'/5',this.W-20,64,{size:18,align:'right',color:P.amber});NE.text(ctx,'Next',40,770,{size:16,color:P.dim});for(const[cx,cy,c]of this.next)this.orb(ctx,150+cx*24,785+cy*24,COLORS[c-1],10);NE.text(ctx,this.clearGoal?'24 orbs ✓':`Goal ${this.cleared}/24`,this.W-30,775,{size:17,color:P.lime,align:'right'});NE.text(ctx,'Move · turn · drop',this.W/2,850,{size:16,color:P.dim,align:'center'});}
      else{NE.text(ctx,'Score',hx,gy+4,{size:14,color:P.dim});NE.text(ctx,String(this.score),hx,gy+22,{size:30});NE.text(ctx,'Burst '+this.cleared,hx,gy+85,{size:20,color:P.cyan});NE.text(ctx,'Level '+this.level,hx,gy+130,{size:20,color:P.dim});NE.text(ctx,'Best chain '+this.bestChain,hx,gy+175,{size:17,color:P.amber});NE.text(ctx,'Next',hx,gy+220,{size:14,color:P.dim});for(const[cx,cy,c]of this.next)this.orb(ctx,hx+20+cx*24,gy+260+cy*24,COLORS[c-1],10);NE.text(ctx,(this.pieces+1)%5===0?'Pulse ready':'Pulse '+this.pieces%5+'/5',hx,gy+320,{size:17,color:P.amber});NE.text(ctx,this.clearGoal?'24 orbs ✓':`Goal ${this.cleared}/24`,hx,gy+350,{size:17,color:P.lime});NE.drawEcho(ctx,hx+50,gy+405,16,P.cyan,1,this.t);NE.text(ctx,'←→ move · ↑ turn · ↓ soft · SPACE drop',this.W/2,this.H-22,{size:13,color:P.dim,align:'center'});}
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, "Well overflowed", `score ${this.score} · ${this.cleared} orbs · best chain ${this.bestChain} · tap to retry`);
    }
  }
  NE.register("prism",
    { polished:true,world:["#19152d","#33264b","#b7a6e2"],scene:"reactor",music:{root:233.08,tempo:92,wave:"triangle"},hint:"Move · turn · drop shards",title: "Prism Stacks", genre: "Colour-burst stacker", color: P.lime,
      desc: "Drop shards, fill a row or touch 4 of a colour to burst. Loose orbs fall and chain. Bad drop? Rewind." },
    Prism);
})();
