/* GAME 5 - Echo Trail : neon snake */
(function () {
  const NE = Forkade, P = NE.palette, CELL = 24;

  class Trail extends NE.GameBase {
    reset() {
      this.elapsed=0;this.eaten=0;this.glide=0;this.collectGoal=false;this.won=false;this.makeSegments();this.cols = (this.W / CELL) | 0;
      this.oy=90;this.rows=((this.H-this.oy-(this.H>this.W?110:40))/CELL)|0;
      const cx = this.cols >> 1, cy = this.rows >> 1;
      this.snake = [[cx, cy], [cx - 1, cy], [cx - 2, cy]];
      this.dir = [1, 0]; this.pending = [1, 0];
      this.food = this.newFood(); this.score = 0;
      this.moveT = 0; this.speed = 0.12; this.state = "play";
    }
    makeSegments(){this.segments=[P.violet,P.magenta].map(color=>{const c=document.createElement('canvas');c.width=c.height=CELL;const x=c.getContext('2d'),g=x.createRadialGradient(8,7,1,12,12,11);g.addColorStop(0,'#e6d7ff');g.addColorStop(.35,color);g.addColorStop(1,'#241c41');x.fillStyle=g;x.beginPath();x.ellipse(12,12,10,8,0,0,NE.TAU);x.fill();x.strokeStyle=color;x.stroke();return c;});}
    newFood(){
      // Bounded search also handles a completely filled board without hanging.
      const cells=this.cols*this.rows,start=Math.floor(NE.rng()*cells);
      for(let n=0;n<cells;n++){const i=(start+n)%cells,x=i%this.cols,y=Math.floor(i/this.cols);if(!this.snake.some(s=>s[0]===x&&s[1]===y))return[x,y];}
      return null;
    }
    step(dt) {
      this.elapsed+=dt;this.glide=Math.max(0,this.glide-dt);const I = this.input;
      if (this.state !== "play") { if (I.pressed.Enter) this.reset(); return; }
      let nd = null;
      if (I.pressed.KeyW || I.pressed.ArrowUp) nd = [0, -1];
      else if (I.pressed.KeyS || I.pressed.ArrowDown) nd = [0, 1];
      else if (I.pressed.KeyA || I.pressed.ArrowLeft) nd = [-1, 0];
      else if (I.pressed.KeyD || I.pressed.ArrowRight) nd = [1, 0];
      if (nd && (nd[0] !== -this.dir[0] || nd[1] !== -this.dir[1])) this.pending = nd;

      this.moveT += dt;
      if (this.moveT < this.speed*(this.glide>0?1.5:1)) return;
      this.moveT = 0; this.dir = this.pending;
      let nx = (this.snake[0][0] + this.dir[0] + this.cols) % this.cols;
      let ny = (this.snake[0][1] + this.dir[1] + this.rows) % this.rows;
      if (this.snake.some((s,i) => i<this.snake.length-1&&s[0]===nx&&s[1]===ny)) {
        this.state = "over";this.juice?.hit(nx*CELL,ny*CELL+this.oy,"Tangled",true,true);NE.sfx.hit(); this.shake.add(14); return;
      }
      this.snake.unshift([nx, ny]);
      if (nx === this.food[0] && ny === this.food[1]) {
        this.eaten++;const comet=this.eaten%5===0;this.score+=comet?30:10;if(comet)this.glide=4;
        if(this.eaten>=10&&!this.collectGoal){this.collectGoal=true;this.score+=100;this.juice?.hit(this.W/2,70,'10 ORBS +100',true);}
        this.juice?.hit(nx*CELL+12,ny*CELL+this.oy+12,comet?'Comet +30 · glide':'+10',comet);this.particles.emit(nx*CELL+12,ny*CELL+this.oy+12,comet?P.cyan:P.amber,{n:12,speed:3});this.food=this.newFood();if(!this.food){this.won=true;this.state='over';NE.sfx.win();}NE.sfx.pickup();
        this.speed = Math.max(0.05, this.speed - 0.004); this.shake.add(2);
      } else this.snake.pop();
    }
    snapshot() {
      if (this.state !== "play") return null;
      return { snake: this.snake.map(s => s.slice()), dir: this.dir.slice(),
               pending: this.pending.slice(), food: this.food.slice(),
               score:this.score,speed:this.speed,moveT:this.moveT,elapsed:this.elapsed,eaten:this.eaten,glide:this.glide,collectGoal:this.collectGoal,won:this.won };
    }
    restore(s) {
      this.snake = s.snake.map(x => x.slice()); this.dir = s.dir.slice();
      this.pending = s.pending.slice(); this.food = s.food.slice();
      this.score=s.score;this.speed=s.speed;this.moveT=s.moveT;Object.assign(this,{elapsed:s.elapsed,eaten:s.eaten,glide:s.glide,collectGoal:s.collectGoal,won:s.won});
    }
    px(cx, cy) { return [cx * CELL + CELL / 2, cy * CELL + CELL / 2 + this.oy]; }
    render(ctx) {
      ctx.save();ctx.strokeStyle='rgba(140,181,213,.12)';ctx.strokeRect(0,this.oy,this.cols*CELL,this.rows*CELL);ctx.restore();
      if(this.food){const [fx,fy]=this.px(this.food[0],this.food[1]),comet=(this.eaten+1)%5===0;ctx.save();ctx.translate(fx,fy);ctx.fillStyle=comet?P.cyan:P.amber;ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();for(let k=0;k<10;k++){const a=k*NE.TAU/10-Math.PI/2,r=k%2?5:11;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
      for (let i = 1; i < this.snake.length; i++) {
        const [x, y] = this.px(this.snake[i][0], this.snake[i][1]);
        ctx.drawImage(this.segments[i%2],x-12,y-12);
      }
      const [hx, hy] = this.px(this.snake[0][0], this.snake[0][1]);
      if(this.glide>0)NE.glowCircle(ctx,P.cyan,hx,hy,19,2);NE.drawEcho(ctx, hx, hy, 14, P.cyan, this.dir[0] >= 0 ? 1 : -1, this.t);
      NE.text(ctx, String(this.score), 20, 14, { size: 40 });
      NE.text(ctx,'Length '+this.snake.length,this.W-20,20,{size:16,color:P.dim,align:'right'});
      NE.text(ctx,this.glide>0?'Glide '+this.glide.toFixed(1)+'s':`Comet ${this.eaten%5}/5`,20,64,{size:17,color:P.cyan});NE.text(ctx,this.collectGoal?'10 orbs ✓':`Goal ${this.eaten}/10`,this.W-20,64,{size:17,color:P.amber,align:'right'});
      if (this.state === "over")
        NE.banner(ctx, this.W, this.H, this.won?"Garden filled!":"Tangled", `score ${this.score} · ${this.eaten} orbs · length ${this.snake.length} · tap to retry`);
    }
  }
  NE.register("trail",
    { polished:true,world:["#121c29","#263450","#94a1e8"],scene:"reactor",music:{root:246.94,tempo:100,wave:"sine"},hint:"Arrows to turn · edges wrap",title: "Echo Trail", genre: "Neon snake", color: P.violet,
      desc: "Grow a glowing trail of data orbs. About to crash? Rewind a few moves." },
    Trail);
})();
