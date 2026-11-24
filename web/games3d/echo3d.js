
(function () {
  const F=(()=>{try{return parent.Forkade;}catch{return null;}})();
  const reduce=()=>!!F?.settings.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seed=Number(new URLSearchParams(location.search).get('seed'))||Math.floor(Date.now()/86400000);let rng=seed>>>0;
  const rand=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
  let decorRng=(seed^0x9e3779b9)>>>0;const cosmetic=()=>{decorRng=(Math.imul(decorRng,1664525)+1013904223)>>>0;return decorRng/4294967296;};
  const tone=(n=440)=>{try{F?.sfx._tone(n,.12,'triangle',.055);}catch{}};
  let music=0,musicNote=0,flash=0,freeze=0;
  const THREEOK = typeof THREE !== "undefined";
  const bannerEl = document.getElementById("banner");
  if (!THREEOK) {
    bannerEl.style.display = "flex";
    document.getElementById("bt").textContent = "3D could not start";
    document.getElementById("bs").textContent = "Return to the arcade and try a 2D game.";
    return;
  }

  const C = { cyan:0x22e4ff, mag:0xff3ea5, violet:0xa07bff, amber:0xffb23f, dim:0x1a1d33 };
  const canvas = document.getElementById("c");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x142a48);
  scene.fog = new THREE.Fog(0x142a48, 50, 150);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize); resize();

  // lights
  scene.add(new THREE.AmbientLight(0x6070a0, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(10, 20, 8); scene.add(key);
  const rim = new THREE.PointLight(C.mag, 0.8, 120); rim.position.set(-15, 10, -10); scene.add(rim);

  // starfield
  (function stars() {
    const g = new THREE.BufferGeometry(), n = 500, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { p[i*3]=(cosmetic()-0.5)*260; p[i*3+1]=cosmetic()*120-10; p[i*3+2]=(cosmetic()-0.5)*260; }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color:0x9fb0ff, size:0.5 })));
  })();

  // neon edge material helper for platforms
  function platMat(color) {
    return new THREE.MeshPhongMaterial({ color:new THREE.Color(color).multiplyScalar(.45), emissive:color, emissiveIntensity:0.1,
      shininess:40 });
  }

  // ---- build a floating course ----
  const platforms = [];
  function addPlatform(x, y, z, w, d, color) {
    const geo = new THREE.BoxGeometry(w, 1, d);
    const m = new THREE.Mesh(geo, platMat(color));
    m.position.set(x, y, z); scene.add(m);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color })); edges.position.copy(m.position); scene.add(edges);
    const rock=new THREE.Object3D();rock.rotation.z=Math.PI;rock.position.set(x,y-2,z);rock.scale.set(Math.min(w,d)*.6,3,Math.min(w,d)*.6);
    const ring=new THREE.Object3D();ring.rotation.x=Math.PI/2;ring.position.set(x,y+.52,z);ring.scale.setScalar(Math.min(w,d)*.28);edges.visible=false;
    platforms.push({x,y,z,w,d,baseX:x,mesh:m,edges,rock,ring});
  }
  const palette = [C.cyan, C.violet, C.mag, C.amber];
  addPlatform(0, 0, 0, 8, 8, C.cyan);        // start
  let px = 0, pz = 0, py = 0;
  for (let i = 1; i <= 16; i++) {
    pz -= 7 + rand() * (i<5?1:3);
    px += (rand() - 0.5) * 9;
    py += (rand() - 0.4) * 2.2;
    const w = 4 + rand() * 3, d = 4 + rand() * 3;
    addPlatform(px, py, pz, w, d, palette[i % palette.length]);
  }
  // goal pad
  addPlatform(px, py, pz - 7, 7, 7, 0x8cff5a);
  const goal = { x: px, y: py, z: pz - 7 };

  const rocks=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,5),new THREE.MeshToonMaterial({color:0x253552}),platforms.length),rings=new THREE.InstancedMesh(new THREE.TorusGeometry(1,.04,4,16),new THREE.MeshBasicMaterial({color:C.cyan}),platforms.length);scene.add(rocks,rings);
  // Three layers of original floating scenery, instanced once.
  const scenery=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1),platMat(0x365780),72),stamp=new THREE.Object3D();scene.add(scenery);
  for(let i=0;i<72;i++){const layer=i%3;stamp.position.set((i%2?1:-1)*(15+layer*17+cosmetic()*12),-4-layer*7+cosmetic()*15,-i*3);stamp.scale.setScalar(1+layer+cosmetic()*2);stamp.updateMatrix();scenery.setMatrixAt(i,stamp.matrix);}
  const pulseGeo=new THREE.SphereGeometry(.12,6,4),pulseMat=new THREE.MeshBasicMaterial({color:0xffd84d}),sparkMesh=new THREE.InstancedMesh(pulseGeo,pulseMat,96),sparks=Array.from({length:96},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0}));scene.add(sparkMesh);let sparkAt=0;
  function burst(x,y,z,n=18){if(reduce())n=2;for(let i=0;i<n;i++){const q=sparks[sparkAt++%96],a=i*2.4;q.life=.7;q.x=x;q.y=y;q.z=z;q.vx=Math.cos(a)*3;q.vz=Math.sin(a)*3;q.vy=2+i%4;}tone(600);if(F?.settings.vibration&&!reduce())navigator.vibrate?.(12);}
  const portal=new THREE.Mesh(new THREE.TorusGeometry(3.2,.18,6,32),new THREE.MeshBasicMaterial({color:0xffd84d}));portal.position.set(goal.x,goal.y+3.2,goal.z);scene.add(portal);
  // ---- coins ----
  const coins = [];
  const coinGeo = new THREE.TorusGeometry(0.5, 0.17, 8, 18);
  const coinMat = new THREE.MeshPhongMaterial({ color:C.amber, emissive:C.amber, emissiveIntensity:0.7 });
  platforms.forEach((p, i) => {
    if (i === 0) return;
    if (rand() < 0.8) {
      const m = new THREE.Mesh(coinGeo, coinMat.clone());
      m.position.set(p.x + (rand()-0.5)*2, p.y + 1.4, p.z + (rand()-0.5)*2);
      scene.add(m); coins.push({ mesh:m, got:false,platform:p,offset:m.position.x-p.x });
    }
  });
  document.getElementById("total").textContent = coins.length;

  // ---- player (blocky ECHO) ----
  const player = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1),
    new THREE.MeshPhongMaterial({ color:0xf1f3ff, emissive:C.cyan, emissiveIntensity:0.08 }));
  player.add(body);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.32, 0.12),
    new THREE.MeshPhongMaterial({ color:0x05060f }));
  visor.position.set(0, 0.1, 0.56); player.add(visor);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10),
    new THREE.MeshBasicMaterial({ color:0xffffff })); eye.position.set(0.18, 0.1, 0.62); player.add(eye);
  const ant = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10),
    new THREE.MeshBasicMaterial({ color:C.mag })); ant.position.set(0, 0.85, 0); player.add(ant);
  const footGeo=new THREE.BoxGeometry(.36,.35,.6),footMat=platMat(0xf1f3ff),feet=[-1,1].map(n=>{const m=new THREE.Mesh(footGeo,footMat);m.position.set(n*.35,-.65,.1);player.add(m);return m;});
  const secondEye=eye.clone();secondEye.position.x=-.18;player.add(secondEye);
  const light=new THREE.PointLight(C.cyan,1.1,10);light.position.y=1.5;player.add(light);
  scene.add(player);

  // ---- state ----
  const state = { x:0, y:2, z:0, vx:0, vy:0, vz:0, onGround:false, score:0, done:false, win:false, yaw:0,elapsed:0,boost:0,bonus:0,checkpoint:0,rescued:false,landed:0 };
  function reset() {
    if (window.__startedOnce) parent.postMessage({t:"forkade-run-start",id:"echo3d"},"*"); window.__startedOnce=true;
    Object.assign(state, { x:0, y:2.2, z:0, vx:0, vy:0, vz:0, onGround:false, score:0, done:false, win:false,yaw:0,elapsed:0,boost:0,bonus:0,checkpoint:0,rescued:false,landed:0 });
    camera.position.set(0,9,12);camera.lookAt(0,2,0);
    coins.forEach(c => { c.got = false; c.mesh.visible = true; });
    rew.frames.length = 0; rew.energy = 1; paused=false;music=0;freeze=0;flash=0;
    document.getElementById("coins").textContent = 0;
    bannerEl.style.display = "none";
  }

  // ---- input ----
  let doneAt = 0,paused=false;
  const pauseButton=document.createElement('button');pauseButton.className='tb';pauseButton.textContent='Ⅱ';pauseButton.setAttribute('aria-label','Pause');Object.assign(pauseButton.style,{position:'fixed',right:'110px',top:'8px',zIndex:101,minWidth:'44px'});document.body.append(pauseButton);pauseButton.onclick=()=>{paused=!paused;pauseButton.textContent=paused?'▶':'Ⅱ';};
  const status=document.createElement('div');status.id='course-status';Object.assign(status.style,{position:'fixed',top:'124px',left:'12px',right:'12px',textAlign:'center',color:'#f1f3ff',background:'#15131de6',padding:'8px',borderRadius:'12px',font:'12px Consolas,monospace',pointerEvents:'none'});document.body.append(status);
  let hintSeen=false;try{hintSeen=localStorage.getItem('forkade-hint-echo3d')==='1';}catch{}
  function dismissHint(){hintSeen=true;try{localStorage.setItem('forkade-hint-echo3d','1');}catch{}}
  addEventListener('pointerdown',dismissHint,{once:true});addEventListener('keydown',dismissHint,{once:true});
  window.__echo3d = () => state;   // read-only peek for automated tests
  // ---- phone controls: left half = floating thumb stick, right half = tap to jump ----
  const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, stickEl = () => document.getElementById("stick");
  let jumpId = null;
  addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse" || (e.target.closest && e.target.closest(".tb, .back, button"))) return;
    if (state.done) return;
    if (e.clientX < innerWidth * 0.5 && stick.id === null) {
      stick.id = e.pointerId; stick.ox = e.clientX; stick.oy = e.clientY; stick.x = stick.y = 0;
      const el = stickEl(); el.style.left = e.clientX + "px"; el.style.top = e.clientY + "px"; el.style.display = "block";
      el.firstElementChild.style.transform = "";
    } else if (jumpId === null) { jumpId = e.pointerId; tk.j = true; }
    const h = document.getElementById("thint"); if (h) h.style.display = "none";
  }, { passive: true });
  addEventListener("pointermove", e => {
    if (e.pointerId !== stick.id) return;
    let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const d = Math.hypot(dx, dy), R = 50;
    if (d > R) { dx *= R / d; dy *= R / d; }
    stick.x = dx / R; stick.y = dy / R;
    if (Math.abs(stick.x) < 0.15) stick.x = 0; if (Math.abs(stick.y) < 0.15) stick.y = 0;   // small dead zone
    stickEl().firstElementChild.style.transform = `translate(${dx}px,${dy}px)`;
  }, { passive: true });
  const lift = e => {
    if (e.pointerId === stick.id) { stick.id = null; stick.x = stick.y = 0; stickEl().style.display = "none"; }
    if (e.pointerId === jumpId) { jumpId = null; tk.j = false; }
  };
  addEventListener("pointerup", lift); addEventListener("pointercancel", lift);
  // phones: tap anywhere (or JUMP) on the result screen to play again
  addEventListener("pointerdown", e => { if (!e.target.closest("button")&&state.done && performance.now() - doneAt > 600) reset(); });
  const retry=document.createElement('button');retry.textContent='▶ Play again';Object.assign(retry.style,{minHeight:'48px',padding:'12px 30px',background:'#ffd84d',color:'#14121a',borderRadius:'12px',font:'bold 16px Consolas,monospace'});retry.onclick=reset;bannerEl.append(retry);
  const keys = Object.create(null);
  addEventListener("keydown", e => {
    keys[e.code] = true;
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault();
    if ((e.code === "Enter" || e.code === "Space") && state.done && performance.now() - doneAt > 600) reset();
    if (e.code === "Escape") backOut();
  });
  addEventListener("keyup", e => { keys[e.code] = false; });
  const tk = Object.create(null);
  const isTouch = matchMedia("(pointer:coarse)").matches || "ontouchstart" in window;
  if (isTouch) document.body.classList.add("touchon");
  document.querySelectorAll(".tb").forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); tk[k] = true; };
    const off = e => { e.preventDefault(); tk[k] = false; };
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off);
    b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
  });
  function backOut() {
    try { parent.postMessage("neon-3d-back", "*"); } catch (_) {}
  }
  document.getElementById("back").addEventListener("click", backOut);

  // ---- rewind (same signature twist) ----
  const rew = { frames: [], max: 180, energy: 1, active: false };
  function record() {
    if (rew.active) return;
    rew.frames.push(snapshot());
    if (rew.frames.length > rew.max) rew.frames.shift();
  }

  function snapshot(){return {state:{...state},coins:coins.map(c=>c.got),rng};}
  function restore(f){Object.assign(state,f.state);rng=f.rng;coins.forEach((c,i)=>{c.got=f.coins[i];c.mesh.visible=!c.got;});syncPlatforms();}
  function syncPlatforms(){platforms.forEach((p,i)=>{p.x=p.baseX+(i>=6&&i%3===0?Math.sin(state.elapsed*.65+i)*1.1:0);p.mesh.position.x=p.edges.position.x=p.rock.position.x=p.ring.position.x=p.x;});}
  // ---- loop ----
  let best = parseInt(localStorage.getItem("neon-best-echo3d") || "0", 10) || 0;
  document.getElementById("best").textContent = best;
  try { document.getElementById("who").textContent = localStorage.getItem("neon-player") || "ECHO"; } catch (_) {}

  let prev = performance.now();
  let settingsPaused=false;
  addEventListener('message',e=>{if(e.source===parent&&e.data?.t==='forkade-pause')settingsPaused=e.data.paused;});
  function frame(now) {
    if(settingsPaused||paused){prev=now;requestAnimationFrame(frame);return;}
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    const wantRw = keys.KeyR || keys.ShiftLeft || keys.ShiftRight || tk.rw;

    if (!state.done) {
      if (wantRw && rew.energy > 0 && rew.frames.length > 1) {
        rew.active = true; rew.energy = Math.max(0, rew.energy - dt / 2.5);
        const f = rew.frames.pop();
        restore(f);
        document.getElementById("coins").textContent = state.score;
      } else {
        rew.active = false; rew.energy = Math.min(1, rew.energy + dt / 6);
        if(freeze>0&&!reduce())freeze-=dt;else{step(dt); record();}
      }
    }
    document.getElementById("rwfill").style.width = (rew.energy * 100) + "%";
    render(dt, now);
    requestAnimationFrame(frame);
  }

  function step(dt) {
    if(state.done)return;state.elapsed+=dt;state.boost=Math.max(0,state.boost-dt);syncPlatforms();
    music-=dt;if(music<=0){music=.28;tone(164.81*Math.pow(2,[0,7,12,10,3,7,15,12][musicNote++%8]/12));}
    // camera-relative movement (camera looks toward -z)
    let ix = ( (keys.KeyD||keys.ArrowRight||tk.r) ? 1:0 ) - ( (keys.KeyA||keys.ArrowLeft||tk.l) ? 1:0 );
    let iz = ( (keys.KeyS||keys.ArrowDown||tk.b) ? 1:0 ) - ( (keys.KeyW||keys.ArrowUp||tk.f) ? 1:0 );
    if (stick.id !== null) { ix = stick.x; iz = stick.y; }        // analog thumb stick on phones
    const sp = 11;
    state.vx = ix * sp; state.vz = iz * sp;
    if ((keys.Space || tk.j) && state.onGround) { state.vy = state.boost>0?16:13;tone(330); state.onGround = false; }
    state.vy -= 34 * dt;

    state.x += state.vx * dt; state.z += state.vz * dt; state.y += state.vy * dt;
    if (ix || iz) state.yaw = Math.atan2(state.vx, state.vz);

    // platform landing
    state.onGround = false;
    if (state.vy <= 0) {
      for (const p of platforms) {
        const top = p.y + 0.5 + 0.55;
        if (state.x > p.x - p.w/2 && state.x < p.x + p.w/2 &&
            state.z > p.z - p.d/2 && state.z < p.z + p.d/2 &&
            state.y <= top && state.y > top - 1.2) {
          if(!state.onGround&&state.vy<-4){burst(state.x,top-.4,state.z,5);}
          state.y = top; state.vy = 0; state.onGround = true;
          const pi=platforms.indexOf(p);state.landed=Math.max(state.landed,pi);if(pi===8)state.checkpoint=8;
          if(pi>0&&pi%5===0)state.boost=4;
        }
      }
    }
    coins.forEach(c=>c.mesh.position.x=c.platform.x+c.offset);
    // coins
    for (const c of coins) {
      if (!c.got) {
        const d2 = (c.mesh.position.x-state.x)**2 + (c.mesh.position.y-state.y-0.3)**2 + (c.mesh.position.z-state.z)**2;
        if (d2 < 1.7) { c.got = true; c.mesh.visible = false; state.score++;burst(state.x,state.y,state.z);if(state.score===5){state.bonus=30;flash=.25;if(!reduce())freeze=.05;}
          document.getElementById("coins").textContent = state.score; }
      }
    }
    // reach goal
    if (state.x > goal.x - 3.5 && state.x < goal.x + 3.5 &&
        state.z > goal.z - 3.5 && state.z < goal.z + 3.5 && state.onGround) {
      finish(true);
    }
    // fell
    if(state.y < -25){if(state.checkpoint&&!state.rescued){const p=platforms[state.checkpoint];state.x=p.x;state.z=p.z;state.y=p.y+3;state.vy=0;state.rescued=true;tone(220);}else finish(false);}
  }

  function finish(win) {
    state.done = true; state.win = win; doneAt = performance.now();
    const total = coins.length;
    let scoreVal = state.score * 10 + state.bonus + (win ? 100 : 0);
    let nb = false;
    if (scoreVal > best) { best = scoreVal; nb = true;
      try { localStorage.setItem("neon-best-echo3d", String(best)); } catch (_) {}
      document.getElementById("best").textContent = best; }
    try { parent !== window && parent.postMessage({ t: "forkade-score", id: "echo3d", score: scoreVal, best: nb }, "*"); } catch (_) {}
    bannerEl.style.display = "flex";
    document.getElementById("bt").textContent = win ? "Course clear!" : "You fell";
    document.getElementById("bs").innerHTML =
      `cores ${state.score}/${total} · island ${state.landed}/${platforms.length-1} · score ${scoreVal}` +
      (nb ? " · ★ NEW BEST" : " · "+(best-scoreVal)+" from your best") + "<br>ENTER / tap to retry · Esc back";
  }

  const camTarget=new THREE.Vector3(),desired=new THREE.Vector3();
  function render(dt, now) {
    for(let i=0;i<platforms.length;i++){const p=platforms[i];p.rock.updateMatrix();p.ring.updateMatrix();rocks.setMatrixAt(i,p.rock.matrix);rings.setMatrixAt(i,p.ring.matrix);}rocks.instanceMatrix.needsUpdate=true;rings.instanceMatrix.needsUpdate=true;
    body.scale.set(1,state.onGround?1:1.1,1);feet.forEach((m,i)=>m.rotation.x=reduce()?0:Math.sin(state.elapsed*12+i*Math.PI)*Math.min(.5,Math.hypot(state.vx,state.vz)*.05));eye.scale.y=secondEye.scale.y=reduce()?1:Math.sin(state.elapsed*.7)>.99?.1:1;
    flash=Math.max(0,flash-dt);status.textContent=!hintSeen?'Drag left thumb to move · tap right to jump':flash>0?'FIVE SPARKS! +30':state.boost>0?'↑ Jump boost · '+Math.ceil(state.boost)+'s':state.checkpoint&&!state.rescued?'◆ Checkpoint ready · one rescue':state.landed>=6?'Moving islands ahead · time your leap':'Collect five sparks for +30';
    for(let i=0;i<96;i++){const q=sparks[i];q.life=Math.max(0,q.life-dt);q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;q.vy-=8*dt;stamp.position.set(q.x,q.y,q.z);stamp.scale.setScalar(q.life>0?1:0);stamp.updateMatrix();sparkMesh.setMatrixAt(i,stamp.matrix);}sparkMesh.instanceMatrix.needsUpdate=true;
    player.position.set(state.x, state.y, state.z);
    player.rotation.y = state.yaw;
    const t = now / 1000;
    body.position.y = reduce()?0:state.onGround ? Math.sin(t*8)*0.04 : 0.1;
    ant.material.color.setHSL((t*0.1)%1, 0.9, 0.6);
    coins.forEach(c => { if (c.mesh.visible) { c.mesh.rotation.y += dt*3; c.mesh.rotation.x = 0.5; } });
    // follow cam
    camTarget.set(state.x+state.vx*.12,state.y+2,state.z+state.vz*.12);
    desired.set(state.x+state.vx*.1,state.y+7,state.z+12);
    camera.position.lerp(desired, 0.08);
    camera.lookAt(camTarget);
    renderer.render(scene, camera);
  }

  window.Echo3D={state,seed,step,render,snapshot,restore,reset,rew,keys,platforms,coins,pause:()=>paused=!paused};
  reset();
  requestAnimationFrame(frame);
})();
