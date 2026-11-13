/* ==========================================================================
   FORKADE  --  engine.js   (shared browser toolkit)

   One small canvas engine behind every game. One hero (ECHO), one neon
   look, one twist (REWIND). Classic <script> (no modules) so it hosts as
   plain static files and runs from file:// too.

   A game registers itself with:
       Forkade.register("id", {title, genre, color, desc}, GameClass)
   where GameClass extends Forkade.GameBase and implements
   step(dt), render(ctx), snapshot(), restore(snap), reset().
   ========================================================================== */
(function (global) {
  "use strict";

  const palette = {
    bg: "#06051a", bg2: "#16113d", ink: "#f1f3ff", dim: "#8d92bd",
    cyan: "#22e4ff", magenta: "#ff3ea5", lime: "#9dff57", amber: "#ffb23f",
    red: "#ff4f6e", violet: "#a07bff", white: "#ffffff",
  };
  const ECHO_COLOR = palette.cyan;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ----------------------------------------------------------- drawing --- */
  function glowRect(ctx, color, x, y, w, h, r = 6, line = 0) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 16;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    if (line) { ctx.lineWidth = line; ctx.strokeStyle = color; ctx.stroke(); }
    else { ctx.fillStyle = color; ctx.fill(); }
    ctx.restore();
  }
  function glowCircle(ctx, color, x, y, r, line = 0) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, TAU);
    if (line) { ctx.lineWidth = line; ctx.strokeStyle = color; ctx.stroke(); }
    else { ctx.fillStyle = color; ctx.fill(); }
    ctx.restore();
  }
  function glowLine(ctx, color, x1, y1, x2, y2, w = 2) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }

  function drawEcho(ctx, cx, cy, size = 16, color = ECHO_COLOR, face = 1, t = 0) {
    if (color === ECHO_COLOR && typeof rewards !== "undefined") color = rewards.echoColor(t);
    cy += Math.sin(t * 4) * size * 0.08;
    const s = size;
    glowRect(ctx, color, cx - s * 0.7, cy - s * 0.7, s * 1.4, s * 1.4, s * 0.45);
    // visor
    ctx.save();
    ctx.fillStyle = palette.bg;
    ctx.beginPath();
    const vx = cx + face * s * 0.15 - s * 0.45, vy = cy - s * 0.1 - s * 0.25;
    if (ctx.roundRect) ctx.roundRect(vx, vy, s * 0.9, s * 0.5, s * 0.22);
    else ctx.rect(vx, vy, s * 0.9, s * 0.5);
    ctx.fill(); ctx.restore();
    // eye
    glowCircle(ctx, palette.white, cx + face * s * 0.3, cy - s * 0.1, Math.max(2, s * 0.14));
    // antenna
    glowLine(ctx, color, cx, cy - s * 0.7, cx, cy - s * 1.05, 2);
    glowCircle(ctx, palette.magenta, cx, cy - s * 1.1, Math.max(2, s * 0.12));
  }

  /* --------------------------------------------------------- particles --- */
  class Particles {
    constructor() { this.p = []; }
    emit(x, y, color, { n = 10, speed = 3, life = 0.6, size = 3,
                        angle = null, spread = TAU, gravity = 0 } = {}) {
      for (let i = 0; i < n; i++) {
        const a = angle == null ? rand(0, TAU) : angle + rand(-spread / 2, spread / 2);
        const sp = speed * rand(0.3, 1) * 60;
        this.p.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                      life: life * rand(0.6, 1), max: life, color, size, gravity });
      }
    }
    update(dt) {
      for (const q of this.p) {
        q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.gravity * dt; q.life -= dt;
      }
      this.p = this.p.filter(q => q.life > 0);
    }
    render(ctx) {
      for (const q of this.p) {
        const k = Math.max(0, q.life / q.max);
        glowCircle(ctx, q.color, q.x, q.y, Math.max(1, q.size * k));
      }
    }
  }

  /* -------------------------------------------------------------- shake --- */
  class Shake {
    constructor() { this.a = 0; }
    add(v) { this.a = Math.min(24, this.a + v); }
    offset(dt) {
      this.a = Math.max(0, this.a - dt * 40);
      return this.a <= 0 ? [0, 0] : [rand(-this.a, this.a), rand(-this.a, this.a)];
    }
  }

  /* ------------------------------------------------------------- stars --- */
  class Stars {
    constructor(w, h, n = 110) {
      this.w = w; this.h = h;
      const cols = [palette.cyan, palette.magenta, palette.violet, palette.dim];
      this.s = [];
      for (let i = 0; i < n; i++)
        this.s.push([rand(0, w), rand(0, h), rand(0.3, 2.2), cols[i % 4]]);
    }
    update(dt, vx = 0, vy = 14) {
      for (const st of this.s) {
        st[0] -= vx * st[2] * dt; st[1] += vy * st[2] * dt * 0.15;
        if (st[1] > this.h) { st[1] = 0; st[0] = rand(0, this.w); }
        if (st[0] < 0) st[0] = this.w; if (st[0] > this.w) st[0] = 0;
      }
    }
    render(ctx) {
      for (const [x, y, z, c] of this.s) { ctx.fillStyle = c; const r = z | 0 || 1; ctx.fillRect(x, y, r, r); }
    }
  }

  function fillBg(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, palette.bg); g.addColorStop(0.55, palette.bg2); g.addColorStop(1, "#24103f");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w / 2, h * 1.05, 0, w / 2, h * 1.05, h * 0.9);
    glow.addColorStop(0, "rgba(255,62,165,0.16)"); glow.addColorStop(1, "rgba(255,62,165,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95);
    vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  }

  /* ---------------------------------------------------------------- hud --- */
  function text(ctx, s, x, y, { size = 22, color = palette.ink, align = "left",
                               glow = true, bold = true } = {}) {
    ctx.save();
    ctx.font = `${bold ? "bold " : ""}${size}px Consolas, "SF Mono", ui-monospace, monospace`;
    ctx.textAlign = align; ctx.textBaseline = "top"; ctx.fillStyle = color;
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
    ctx.fillText(s, x, y);
    ctx.restore();
  }
  function bar(ctx, x, y, w, h, frac, color, label) {
    frac = Math.max(0, Math.min(1, frac));
    ctx.fillStyle = palette.bg2; ctx.fillRect(x, y, w, h);
    if (frac > 0) glowRect(ctx, color, x, y, w * frac, h, 4);
    ctx.strokeStyle = palette.dim; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    if (label) text(ctx, label, x, y - 16, { size: 13, color: palette.dim });
  }
  function banner(ctx, w, h, title, sub) {
    ctx.save(); ctx.fillStyle = "rgba(4,6,14,0.72)"; ctx.fillRect(0, 0, w, h); ctx.restore();
    text(ctx, title, w / 2, h / 2 - 34, { size: 48, color: palette.cyan, align: "center" });
    if (sub) text(ctx, sub, w / 2, h / 2 + 22, { size: 18, color: palette.ink, align: "center" });
  }

  /* ------------------------------------------------------------ rewind --- */
  class Rewind {
    constructor(seconds = 3, fps = 60) {
      this.max = (seconds * fps) | 0; this.frames = []; this.energy = 1; this.active = false;
    }
    record(snap) { if (this.active || snap == null) return;
      this.frames.push(snap); if (this.frames.length > this.max) this.frames.shift(); }
    step(want, dt) {
      if (want && this.energy > 0 && this.frames.length > 1) {
        this.active = true; this.energy = Math.max(0, this.energy - dt / 2.5);
        return this.frames.pop();
      }
      this.active = false; this.energy = Math.min(1, this.energy + dt / 6);
      return null;
    }
    overlay(ctx, w, h) {
      bar(ctx, 16, h - 26, 150, 12, this.energy, palette.violet, "REWIND");
      if (this.active) {
        ctx.save(); ctx.fillStyle = "rgba(160,123,255,0.16)"; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        for (let i = 0; i < 6; i++) { const y = Math.random() * h;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        ctx.restore();
        text(ctx, "- REWINDING -", w / 2, 40, { size: 18, color: palette.violet, align: "center" });
      }
    }
  }

  /* ------------------------------------------------------------- input --- */
  const Input = {
    keys: Object.create(null), pressed: Object.create(null),
    mouse: { x: 0, y: 0, down: false }, tapped: false,
    _bind(canvas) {
      if (this._bound) return; this._bound = true;
      addEventListener("keydown", e => {
        if (!this.keys[e.code]) this.pressed[e.code] = true;
        this.keys[e.code] = true;
        if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
      });
      addEventListener("keyup", e => { this.keys[e.code] = false; });
      addEventListener("blur", () => { this.keys = Object.create(null); });
      const upd = e => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
        this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
      };
      // pointer events cover mouse AND touch, so touch-drag aims the shooters
      canvas.addEventListener("pointermove", upd);
      canvas.addEventListener("pointerdown", e => {
        this.mouse.down = true; this.tapped = true; upd(e);
        if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      });
      addEventListener("pointerup", () => { this.mouse.down = false; });
      canvas.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
      canvas.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
    },
    // virtual button helpers for on-screen touch controls
    hold(code, on) { if (on && !this.keys[code]) this.pressed[code] = true; this.keys[code] = on; },
    tap(code) { this.pressed[code] = true; this.keys[code] = true; setTimeout(() => { this.keys[code] = false; }, 90); },
    left()  { return this.keys.KeyA || this.keys.ArrowLeft; },
    right() { return this.keys.KeyD || this.keys.ArrowRight; },
    up()    { return this.keys.KeyW || this.keys.ArrowUp; },
    down()  { return this.keys.KeyS || this.keys.ArrowDown; },
    rewind(){ return this.keys.KeyR || this.keys.ShiftLeft || this.keys.ShiftRight; },
    clearPressed() { this.pressed = Object.create(null); this.tapped = false; },
  };

  /* ------------------------------------------------------------- sound ---- */
  // Tiny Web Audio synth - no files, everything generated. Mute persists.
  const sfx = {
    _ac: null, muted: false,
    _load() { try { this.muted = localStorage.getItem("neon-muted") === "1"; } catch (_) {} },
    ensure() {
      if (!this._ac) { try { this._ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {} }
      if (this._ac && this._ac.state === "suspended") this._ac.resume();
      return this._ac;
    },
    toggleMute() {
      this.muted = !this.muted;
      try { localStorage.setItem("neon-muted", this.muted ? "1" : "0"); } catch (_) {}
      return this.muted;
    },
    _tone(freq, dur, type = "square", gain = 0.12, to = null) {
      if (this.muted) return; const ac = this.ensure(); if (!ac) return;
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur);
    },
    _noise(dur, gain = 0.18, cut = 1200) {
      if (this.muted) return; const ac = this.ensure(); if (!ac) return;
      const t = ac.currentTime, n = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(cut, t);
      f.frequency.exponentialRampToValueAtTime(200, t + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(ac.destination); src.start(t);
    },
    shoot()  { this._tone(680, 0.08, "square", 0.07, 220); },
    jump()   { this._tone(300, 0.14, "triangle", 0.12, 760); },
    pickup() { this._tone(540, 0.07, "sine", 0.12); setTimeout(() => this._tone(820, 0.1, "sine", 0.12), 60); },
    bounce() { this._tone(420, 0.06, "triangle", 0.12, 560); },
    hit()    { this._noise(0.12, 0.14, 1600); },
    explode(){ this._noise(0.35, 0.22, 900); },
    die()    { this._tone(400, 0.5, "sawtooth", 0.18, 70); },
    win()    { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, "triangle", 0.14), i * 110)); },
    rewind() { this._tone(900, 0.25, "sine", 0.1, 300); },
    ui()     { this._tone(600, 0.05, "sine", 0.08); },
  };
  sfx._load();

  /* ----------------------------------------------------------- scores ----- */
  // Per-game best score in localStorage. Survives refreshes; no server.
  const scores = {
    key(id) { return "neon-best-" + id; },
    get(id) { try { return parseInt(localStorage.getItem(this.key(id)) || "0", 10) || 0; } catch (_) { return 0; } },
    submit(id, v) {
      v = v | 0; if (v <= this.get(id)) return false;
      try { localStorage.setItem(this.key(id), String(v)); } catch (_) {}
      return true;
    },
  };


  /* ---------------------------------------------------------- rewards ----- */
  // Cores (currency), badges (bronze/silver/gold per game), ECHO skins, rank and a
  // daily streak. Everything lives in localStorage on this device - nothing is sent anywhere.
  const GOALS = {               // score needed for bronze / silver / gold
    skyhop: [150, 500, 1200], swarm: [150, 500, 1200], striker: [300, 1000, 2500],
    breaker: [1000, 4000, 10000], trail: [100, 300, 600], drift: [500, 2000, 5000],
    prism: [500, 2000, 6000], match: [2000, 6000, 12000], wrecker: [1500, 5000, 12000],
    echo3d: [50, 120, 200],
  };
  const TIERS = [{ name: "BRONZE", color: "#e0a060", cores: 20 },
                 { name: "SILVER", color: "#d8dcf0", cores: 50 },
                 { name: "GOLD",   color: "#ffd84a", cores: 120 }];
  const SKINS = [
    { id: "classic", name: "Classic",   color: "#22e4ff", cost: 0 },
    { id: "pink",    name: "Hot Pink",  color: "#ff3ea5", cost: 100 },
    { id: "lime",    name: "Acid Lime", color: "#9dff57", cost: 150 },
    { id: "sunset",  name: "Sunset",    color: "#ffb23f", cost: 250 },
    { id: "violet",  name: "Ultraviolet", color: "#a07bff", cost: 350 },
    { id: "ghost",   name: "Ghost",     color: "#f4f6ff", cost: 500 },
    { id: "rainbow", name: "Rainbow",   color: "rainbow", cost: 1000 },
  ];
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  const rewards = {
    enabled: true, GOALS, TIERS, SKINS, toasts: [], listeners: [],
    cores() { return load("forkade-cores", 0); },
    lifetime() { return load("forkade-lifetime", 0); },
    rank() { return 1 + Math.floor(Math.sqrt(this.lifetime() / 25)); },
    add(n) {
      n = Math.max(0, Math.round(n)); if (!n || !this.enabled) return 0;
      save("forkade-cores", this.cores() + n); save("forkade-lifetime", this.lifetime() + n);
      this.listeners.forEach(f => f()); return n;
    },
    toast(text, color) { this.toasts.push({ text, color: color || palette.amber, t: 0 }); this.listeners.forEach(f => f(text, color)); },
    badges() { return load("forkade-badges", {}); },          // { gameId: highestTier (0..3) }
    tierOf(id) { return this.badges()[id] || 0; },
    goals(id, meta) { return (meta && meta.goals) || GOALS[id] || [500, 2000, 6000]; },
    // called once when a round ends; returns cores earned
    roundEnd(id, score, newBest, meta) {
      if (!this.enabled || !id) return 0;
      let got = this.add(Math.max(1, Math.sqrt(Math.max(0, score)) * 0.6));
      if (newBest && score > 0) got += this.add(10);
      const g = this.goals(id, meta), b = this.badges(), had = b[id] || 0;
      let tier = had; while (tier < 3 && score >= g[tier]) tier++;
      for (let k = had; k < tier; k++) {
        got += this.add(TIERS[k].cores);
        this.toast(`${TIERS[k].name} BADGE  +${TIERS[k].cores} cores`, TIERS[k].color);
        sfx.win();
      }
      if (tier > had) { b[id] = tier; save("forkade-badges", b); }
      return got;
    },
    owned() { return load("forkade-skins", ["classic"]); },
    skin() { const id = load("forkade-skin", "classic"); return SKINS.find(s => s.id === id) || SKINS[0]; },
    buy(id) {
      const sk = SKINS.find(s => s.id === id); if (!sk) return false;
      const own = this.owned(); if (own.includes(id)) { save("forkade-skin", id); this.listeners.forEach(f => f()); return true; }
      if (this.cores() < sk.cost) return false;
      save("forkade-cores", this.cores() - sk.cost); own.push(id); save("forkade-skins", own); save("forkade-skin", id);
      this.listeners.forEach(f => f()); return true;
    },
    // daily streak: call once when the arcade opens
    daily() {
      const day = d => d.toISOString().slice(0, 10), now = new Date();
      const st = load("forkade-streak", { last: null, n: 0 }), today = day(now);
      if (st.last === today) return null;
      const y = new Date(now); y.setDate(y.getDate() - 1);
      st.n = st.last === day(y) ? st.n + 1 : 1; st.last = today; save("forkade-streak", st);
      return { streak: st.n, cores: this.add(10 * Math.min(7, st.n)) };
    },
    streak() { return load("forkade-streak", { n: 0 }).n || 0; },
    echoColor(t) { const c = this.skin().color; return c === "rainbow" ? `hsl(${(t * 90) % 360},95%,62%)` : c; },
  };

  /* --------------------------------------------------------- game base --- */
  class GameBase {
    constructor() {
      this.W = 900; this.H = 560;
      this.t = 0; this.state = "play";
      this.particles = new Particles();
      this.shake = new Shake();
      this.stars = new Stars(this.W, this.H);
      this.rewind = new Rewind(this.rewindSeconds || 3);
      this.input = Input;
      this.id = this.id || null;        // set by play() for high scores
      this.score = 0; this.best = this.best || 0; this.newBest = false;
      this._prevState = "play"; this._prevRw = false;
    }
    // mid-round reward (level clears etc). key makes it count once per round, even with rewind.
    reward(n, label, key) {
      this._keys = this._keys || new Set();
      if (key && this._keys.has(key)) return;
      if (key) this._keys.add(key);
      const got = rewards.add(n); if (got) rewards.toast(`+${got} cores  ${label || ""}`, palette.lime);
    }
    step(dt) {}
    render(ctx) {}
    snapshot() { return null; }
    restore(s) {}
    reset() {}

    frame(ctx, dt) {
      this.t += dt;
      if (this.input.pressed.KeyP && (this.state === "play" || this.state === "pause"))
        this.state = this.state === "play" ? "pause" : "play";

      // round over: ENTER / SPACE / tap (or the touch FIRE button) restarts. The short
      // delay stops a held fire button from skipping straight past the score.
      if (this.state === "over" || this.state === "win") {
        this._overT = (this._overT || 0) + dt;
        const I = this.input;
        if (this._overT > 0.6 && (I.pressed.Enter || I.pressed.NumpadEnter || I.pressed.Space || I.tapped)) {
          this._overT = 0; this.particles.p = []; this.rewind.frames = []; this.rewind.energy = 1;
          this.reset(); this.state = "play";
        }
      } else this._overT = 0;

      if (this.state === "play") {
        const snap = this.rewind.step(this.input.rewind(), dt);
        if (snap != null) this.restore(snap);
        else { this.step(dt); this.rewind.record(this.snapshot()); }
        this.particles.update(dt);
      }

      // rewind whoosh on the rising edge
      if (this.rewind.active && !this._prevRw) sfx.rewind();
      this._prevRw = this.rewind.active;

      // round end: sound + save high score, once
      if (this.state !== this._prevState) {
        if (this.state === "over" && this._prevState === "play") {
          sfx.die(); this.newBest = this.id ? scores.submit(this.id, this.score) : false;
          this.earned = rewards.roundEnd(this.id, this.score, this.newBest, this.meta);
        } else if (this.state === "win" && this._prevState === "play") {
          sfx.win(); this.newBest = this.id ? scores.submit(this.id, this.score) : false;
          this.earned = rewards.roundEnd(this.id, this.score, this.newBest, this.meta);
        } else if (this.state === "play") {
          this.newBest = false; this.earned = 0; this._keys = new Set();   // restarted
        }
        this._prevState = this.state;
      }

      fillBg(ctx, this.W, this.H);
      this.stars.update(dt); this.stars.render(ctx);
      const [ox, oy] = this.shake.offset(dt);
      ctx.save(); ctx.translate(ox, oy);
      this.render(ctx);
      this.particles.render(ctx);
      ctx.restore();
      this.rewind.overlay(ctx, this.W, this.H);
      if (this.state === "pause") banner(ctx, this.W, this.H, "PAUSED", "P resume   ESC menu");
      // best-score line under any game-over / win banner
      if ((this.state === "over" || this.state === "win") && this.id) {
        const b = scores.get(this.id);
        text(ctx, (this.newBest ? "★ NEW BEST  " : "BEST  ") + b,
             this.W / 2, this.H / 2 + 52, { size: 16,
             color: this.newBest ? palette.amber : palette.dim, align: "center" });
        if (this.earned) text(ctx, `+${this.earned} cores   (total ${rewards.cores()})`, this.W / 2, this.H / 2 + 76,
             { size: 16, color: palette.lime, align: "center" });
      }
      // reward toasts, top centre
      let ty = 70;
      for (const q of rewards.toasts) {
        q.t += dt; const a = q.t < 0.25 ? q.t / 0.25 : q.t > 2.4 ? Math.max(0, (2.9 - q.t) / 0.5) : 1;
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = "rgba(6,5,26,0.8)"; const w = 30 + q.text.length * 10;
        ctx.fillRect(this.W / 2 - w / 2, ty - 6, w, 32); ctx.restore();
        ctx.save(); ctx.globalAlpha = a; text(ctx, q.text, this.W / 2, ty, { size: 17, color: q.color, align: "center" }); ctx.restore();
        ty += 38;
      }
      rewards.toasts = rewards.toasts.filter(q => q.t < 2.9);
      // HUD corner: equipped skin + wallet
      text(ctx, `${rewards.cores()} cores`, this.W - 16, this.H - 24, { size: 13, color: palette.lime, align: "right", glow: false });
    }
  }

  /* -------------------------------------------------------- runtime ------ */
  const registry = [];
  function register(id, meta, cls) { registry.push({ id, meta, cls }); }

  let canvas, ctx, current = null, running = false, last = 0, onExit = null;

  function boot(cv, exitCb) {
    canvas = cv; ctx = cv.getContext("2d"); onExit = exitCb || null;
    canvas.width = 900; canvas.height = 560;
    Input._bind(canvas);
    addEventListener("keydown", e => { if (e.code === "Escape") stop(); });
  }
  function play(id) {
    const entry = registry.find(g => g.id === id); if (!entry) return;
    sfx.ensure();                       // unlock audio on this user gesture
    current = new entry.cls(); current.id = id; current.meta = entry.meta; current.reset(); rewards.toasts = [];
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }
  function stop() {
    running = false; current = null;
    if (onExit) onExit();
  }
  function loop(now) {
    if (!running || !current) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    current.frame(ctx, dt);
    Input.clearPressed();
    requestAnimationFrame(loop);
  }

  global.Forkade = {
    palette, ECHO_COLOR, rand, TAU,
    glowRect, glowCircle, glowLine, drawEcho, fillBg, text, bar, banner,
    Particles, Shake, Stars, Rewind, Input, GameBase, sfx, scores, rewards,
    register, boot, play, stop, registry,
    current: () => current,          // the running game (handy for tests and the Playground)
  };
  global.NeonEcho = global.Forkade;   // old name kept so older forks still work
})(typeof window !== "undefined" ? window : globalThis);
