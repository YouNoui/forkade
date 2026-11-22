/* GAME 4 - PULSE BREAKER : neon brick-breaker with endless levels */
(function () {
  const NE = Forkade, P = NE.palette;

  class Breaker extends NE.GameBase {
    reset() {
      this.paddle = this.W / 2; this.pw = 110; this.lives = 3; this.score = 0;
      this.level=1;this.elapsed=0;this.breaks=0;this.goal=5;this.wide=0;this.fire=0;this.shield=1;this.nextCell=12;this.nextCore=120;this.drops=[];this.prevDown=false;this.bonus=0;this._keys=new Set();this.state="play";
      this.buildWall();
    }
    // every level is a new wall shape; tougher bricks take 2-3 hits
    buildWall() {
      this.brickW = (this.W - 80) / 10 - 6;
      const L = this.level, cols = ["cyan", "lime", "amber", "magenta", "violet"];
      const rows = Math.min(8, 2 + Math.ceil(L / 2)), shape = (L - 1) % 5;
      this.bricks = [];
      for (let row = 0; row < rows; row++) for (let col = 0; col < 10; col++) {
        const mid = Math.abs(col - 4.5);
        if (shape === 1 && mid > rows - row) continue;                       // pyramid
        if (shape === 2 && (row + col) % 2) continue;                        // checker
        if (shape === 3 && Math.abs(mid - 2.5) + Math.abs(row - rows / 2) > rows / 2 + 1) continue; // twin diamonds
        if (shape === 4 && row % 3 === 2 && col % 3 !== 0) continue;         // ladders
        const hp = Math.min(3, 1 + (row < Math.floor((L - 1) / 2) ? 1 : 0) + (L >= 6 && row === 0 ? 1 : 0));
        this.bricks.push({ x: 40 + col * (this.brickW + 6), y: 80 + row * 32, c: P[cols[row % 5]], special:row===1&&(col===3||col===7)?1:0, hp });
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
      this.elapsed+=dt;this.wide=Math.max(0,this.wide-dt);this.fire=Math.max(0,this.fire-dt);this.pw=this.wide>0?170:110;
      if(this.elapsed>=this.nextCell){this.nextCell+=35;if(this.drops.length<6)this.drops.push({x:this.W/2,y:this.H*.35,life:12,kind:Math.floor(this.elapsed/35)%2});}
      if(this.elapsed>=this.nextCore){this.nextCore+=120;const br=this.bricks[Math.floor(this.bricks.length/2)];if(br){br.special=2;br.hp=5;this.juice?.hit(this.W/2,130,'REACTOR CORE · +500',true);}}
      for(const d of this.drops){d.y+=110*dt;d.life-=dt;if(Math.abs(d.y-(this.H-65))<25&&Math.abs(d.x-this.paddle)<this.pw/2+12){d.life=0;if(d.kind===0)this.wide=12;else this.fire=8;this.juice?.hit(this.paddle,this.H-130,d.kind===0?'WIDE · 12s':'BLAZE · 8s',true);NE.sfx.pickup();}}this.drops=this.drops.filter(d=>d.life>0&&d.y<this.H+20);
      const click = I.mouse.down && !this.prevDown; this.prevDown = I.mouse.down;
      if (this.phase === "clear") {
        if (I.pressed.Space || I.pressed.Enter || click) { this.level++; this.buildWall(); NE.sfx.ui(); }
        return;
      }
      const kb = (I.right() ? 1 : 0) - (I.left() ? 1 : 0);
      if (kb) this.paddle += kb * 520 * dt;
      // follow a hovering mouse, or a finger only while it's touching the game
      else if (I.mouse.seen && (I.mouse.kind === "mouse" || I.mouse.down))
        this.paddle += (I.mouse.x - this.paddle) * Math.min(1, dt * 14);
      this.paddle = Math.max(this.pw / 2, Math.min(this.W - this.pw / 2, this.paddle));
      if ((I.pressed.Space || click) && this.stuck) this.launch();
      if (this.stuck) { this.bx = this.paddle; this.by = this.H - 70; return; }

      this.particles.emit(this.bx,this.by,this.fire>0?P.amber:P.cyan,{n:1,speed:.3,life:.2,size:3});
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
        if (Math.abs(this.bx - (br.x + this.brickW / 2)) < this.brickW / 2 + 4 && Math.abs(this.by - (br.y + 12)) < 18) {
          if(this.fire<=0)this.bvy *= -1; this.shake.add(2);
          this.particles.emit(this.bx, this.by, br.c, { n: 8, speed: 3 });
          if ((br.hp-=this.fire>0?3:1)<=0) {let destroyed=1;this.score+=15*this.level;
            if(br.special===1){for(const other of this.bricks)if(other!==br&&other.hp>0&&Math.hypot(other.x-br.x,other.y-br.y)<100){other.hp=0;destroyed++;this.score+=15*this.level;this.particles.emit(other.x+this.brickW/2,other.y+12,other.c,{n:6,speed:4});}}
            if(br.special===2){this.score+=500;this.shield=1;}
            this.breaks+=destroyed;while(this.breaks>=this.goal){this.score+=75;this.goal+=5;this.juice?.hit(this.W/2,140,'5 BRICKS +75',true);}
            this.juice?.hit(this.bx,this.by,'+'+(15*this.level*destroyed),br.special>0);NE.sfx.pickup();this.bricks=this.bricks.filter(b=>b.hp>0);
          }
          else { this.score += 5; NE.sfx.hit(); }
          break;
        }
      }
      if(this.shield&&this.by>this.H-28&&this.bvy>0){this.shield=0;this.by=this.H-32;this.bvy=-Math.abs(this.bvy);this.juice?.hit(this.bx,this.by-30,'SAFETY PULSE',true);}
      if (this.by > this.H + 10) {
        this.lives -= 1; this.shake.add(7);this.juice?.hit(this.W/2,this.H*.6,"PULSE LOST",true,true);
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
      return {extra:[this.elapsed,this.breaks,this.goal,this.wide,this.fire,this.shield,this.nextCell,this.nextCore,this.pw,this.prevDown],drops:this.drops.map(d=>({...d})),paddle: this.paddle, lives: this.lives, score: this.score, stuck: this.stuck,
               bx: this.bx, by: this.by, bvx: this.bvx, bvy: this.bvy,
               bricks: this.bricks.map(b => ({ ...b })),
               level: this.level, speed: this.speed, phase: this.phase, bonus: this.bonus };
    }
    restore(s) {
      [this.elapsed,this.breaks,this.goal,this.wide,this.fire,this.shield,this.nextCell,this.nextCore,this.pw,this.prevDown]=s.extra;this.drops=s.drops.map(d=>({...d}));
      this.paddle = s.paddle; this.lives = s.lives; this.score = s.score; this.stuck = s.stuck;
      this.bx = s.bx; this.by = s.by; this.bvx = s.bvx; this.bvy = s.bvy;
      this.bricks = s.bricks.map(b => ({ ...b }));
      this.level = s.level; this.speed = s.speed; this.phase = s.phase; this.bonus = s.bonus;
    }
    render(ctx) {
      for(const br of this.bricks){const x=br.x,y=br.y,w=this.brickW;ctx.fillStyle='#1b1630';ctx.beginPath();ctx.moveTo(x,y+5);ctx.lineTo(x+w,y+5);ctx.lineTo(x+w-4,y+26);ctx.lineTo(x+4,y+26);ctx.closePath();ctx.fill();ctx.fillStyle=br.special===2?P.amber:br.c;ctx.beginPath();ctx.moveTo(x+5,y);ctx.lineTo(x+w-5,y);ctx.lineTo(x+w,y+6);ctx.lineTo(x+w-4,y+21);ctx.lineTo(x+4,y+21);ctx.lineTo(x,y+6);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(x+6,y+3,w-12,2);if(br.special)NE.text(ctx,br.special===2?'✦':'✹',x+w/2,y+2,{size:18,align:'center',color:P.bg,glow:false});else{ctx.fillStyle=P.bg;for(let n=0;n<br.hp;n++)ctx.fillRect(x+w/2-(br.hp*5)/2+n*5,y+10,3,3);}}
      for(const d of this.drops){this.world?.glow(ctx,d.x,d.y,35);ctx.fillStyle=d.kind===0?P.lime:P.amber;ctx.beginPath();ctx.moveTo(d.x,d.y-14);ctx.lineTo(d.x+14,d.y);ctx.lineTo(d.x,d.y+14);ctx.lineTo(d.x-14,d.y);ctx.closePath();ctx.fill();NE.text(ctx,d.kind===0?'↔':'✦',d.x,d.y-9,{size:18,align:'center',color:P.bg,glow:false});}
      if(this.shield){ctx.strokeStyle='#99ffe7';ctx.setLineDash([12,12]);ctx.beginPath();ctx.moveTo(10,this.H-25);ctx.lineTo(this.W-10,this.H-25);ctx.stroke();ctx.setLineDash([]);}
      this.world?.glow(ctx,this.bx,this.by,60);this.world?.glow(ctx,this.paddle,this.H-70,85);
      NE.glowRect(ctx, P.cyan, this.paddle - this.pw / 2, this.H - 68, this.pw, 14, 7);
      NE.drawEcho(ctx, this.paddle, this.H - 86, 12, P.cyan, 1, this.t);
      NE.glowCircle(ctx, P.white, this.bx, this.by, 7);
      NE.text(ctx, String(this.score), 20, 16, { size: 40 });
      for (let i = 0; i < this.lives; i++) NE.glowCircle(ctx, P.cyan, this.W - 30 - i * 26, 28, 7);
      NE.text(ctx,`FORGE ${this.level} · ${this.breaks%5}/5 BRICKS · +75`,22,60,{size:17,color:"#ffe0b1",glow:false});
      if(this.wide>0||this.fire>0)NE.text(ctx,this.wide>0?"WIDE "+Math.ceil(this.wide)+"s":"BLAZE "+Math.ceil(this.fire)+"s",this.W-20,90,{size:18,align:"right",color:P.lime,glow:false});
      if (this.stuck && this.state === "play")
        NE.text(ctx, "SPACE or click to launch", this.W / 2, this.H - 110, { size: 16, color: P.dim, align: "center" });
      if (this.state === "over")
        {NE.banner(ctx,this.W,this.H,"FORGE RUN",`${this.breaks} bricks · ${this.level-1} walls · combo ${this.juice?.best||0}`);const gap=NE.scores.get(this.id)-this.score;NE.text(ctx,gap>0?gap+' points to your best':this.assisted?'ASSIST RUN':'YOUR BEST FORGE',this.W/2,this.H/2+130,{size:18,align:'center',glow:false});}
      if (this.phase === "clear" && this.state === "play")
        NE.banner(ctx, this.W, this.H, `WALL ${this.level} CLEARED!`, `+${this.bonus} and +1 life   -   SPACE / click for wall ${this.level + 1}`);
    }
  }
  NE.register("breaker",
    { polished:true,scene:"forge",world:["#160e12","#392317","#ffb23f"],music:{root:220,tempo:120,wave:"sine"},hint:"DRAG TO AIM · TAP / SPACE TO LAUNCH", touch: "lr", title: "PULSE BREAKER", genre: "Brick-breaker", color: P.amber,
      desc: "Crack luminous forge crystals, trigger blast cascades and catch wide/blaze cells. A safety pulse catches one miss; rewind catches the next." },
    Breaker);
})();
