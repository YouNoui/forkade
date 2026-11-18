/* RAMPAGE 3D: original neon destruction arena. THREE r128 is bundled in the HTML. */
(() => {
  'use strict';
  const F = (()=>{try{return parent.Forkade;}catch{return null;}})();
  const scene = new THREE.Scene(); scene.background=new THREE.Color('#06051a');scene.fog=new THREE.Fog('#06051a',45,120);
  const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,200);
  let renderer;
  try {renderer=new THREE.WebGLRenderer({antialias:true});} catch (_) {
    document.getElementById('notice').textContent='3D needs WebGL. Try another browser or play a 2D game from the menu.';return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);document.body.prepend(renderer.domElement);
  scene.add(new THREE.AmbientLight(0x8175bb,.9));const sun=new THREE.DirectionalLight(0xffffff,1.5);sun.position.set(12,30,15);scene.add(sun);
  const cube=new THREE.BoxGeometry(1,1,1),colors=[0x22e4ff,0xff3ea5,0x9dff57,0xa07bff,0xffb23f];
  const mats=colors.map(c=>new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.22,roughness:.45}));
  function box(w,h,d,x,y,z,mat){const m=new THREE.Mesh(cube,mat);m.scale.set(w,h,d);m.position.set(x,y,z);scene.add(m);return m;}
  const ground=box(110,.2,110,0,-.2,0,new THREE.MeshStandardMaterial({color:0x12102f}));
  const grid=new THREE.GridHelper(100,25,0xa07bff,0x302449);scene.add(grid);
  const hero=new THREE.Group();scene.add(hero);
  const body=new THREE.Mesh(new THREE.BoxGeometry(3,3.5,2.6),mats[0]);body.position.y=2.7;hero.add(body);
  const visor=new THREE.Mesh(new THREE.BoxGeometry(2.4,.8,.15),new THREE.MeshBasicMaterial({color:0x06051a}));visor.position.set(0,3,1.35);hero.add(visor);
  const eye=new THREE.Mesh(new THREE.SphereGeometry(.21,10,8),new THREE.MeshBasicMaterial({color:0xffffff}));eye.position.set(.6,3,1.49);hero.add(eye);
  const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,1,8),mats[0]);antenna.position.y=4.9;hero.add(antenna);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.22,10,8),mats[1]);tip.position.y=5.5;hero.add(tip);
  const feet=[-1,1].map(x=>{const m=new THREE.Mesh(new THREE.BoxGeometry(1.1,.7,1.7),mats[0]);m.position.set(x,.5,.3);hero.add(m);return m;});
  const ring=new THREE.Mesh(new THREE.RingGeometry(4.7,5,48),new THREE.MeshBasicMaterial({color:0x22e4ff,side:THREE.DoubleSide,transparent:true,opacity:.6}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;scene.add(ring);
  const buildings=[];
  for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++){
    if(x===0||z===0)continue;const floors=2+Math.abs(x*z)%4,mat=Math.abs(x+z)%5,meshes=[];
    for(let i=0;i<floors;i++){
      const m=box(3.5,1.8,3.5,x*7,i*1.9+.9,z*7,mats[mat]);
      const edges=new THREE.LineSegments(new THREE.EdgesGeometry(cube),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.3}));m.add(edges);meshes.push(m);
    }
    buildings.push({x:x*7,z:z*7,floors,mat,meshes});
  }
  const chunkMeshes=Array.from({length:144},()=>{const m=new THREE.Mesh(cube,mats[1]);m.visible=false;scene.add(m);return m;});
  let state,frames=[],energy=1,rewinding=false,paused=false,started=false;
  const keys={},stick={id:null,x:0,y:0},buttons={stomp:false,rewind:false};let press=false;
  const hud=document.getElementById('hud'),notice=document.getElementById('notice'),banner=document.getElementById('banner');
  const sound=name=>{try{F?.sfx[name]();}catch(_){}};
  function reset(){
    state={x:0,z:0,yaw:0,score:0,time:90,cool:0,pulse:0,hp:buildings.map(b=>b.floors),chunks:[],done:false};
    frames=[];energy=1;paused=false;banner.hidden=true;notice.textContent='Move close to a building. Tap STOMP. Clear the city before time runs out!';
    if(started)parent.postMessage({t:'forkade-run-start',id:'rampage'},'*');started=true;sync();
  }
  function snapshot(){return JSON.parse(JSON.stringify(state));}
  function restore(s){state=JSON.parse(JSON.stringify(s));sync();}
  function sync(){buildings.forEach((b,i)=>b.meshes.forEach((m,n)=>{m.visible=n<state.hp[i];}));}
  function stomp(){
    if(state.done||paused||state.cool>0)return;state.cool=.55;state.pulse=1;sound('explode');let hit=0;
    buildings.forEach((b,i)=>{
      if(state.hp[i]&&Math.hypot(b.x-state.x,b.z-state.z)<6){
        const height=--state.hp[i]*1.9+.9;state.score+=120;hit++;
        if(!state.hp[i])state.score+=300;
        for(let j=0;j<12;j++)state.chunks.push({x:b.x+(Math.random()-.5)*3,z:b.z+(Math.random()-.5)*3,y:height,
          vx:(Math.random()-.5)*12,vz:(Math.random()-.5)*12,vy:4+Math.random()*7,t:2,mat:b.mat,rot:Math.random()*6});
      }
    });
    state.chunks=state.chunks.slice(-144);sync();if(hit)notice.textContent=`${hit} building${hit===1?'':'s'} hit! +${hit*120} destruction points`;
    else notice.textContent='Get closer — the cyan ring shows stomp range.';
    if(state.hp.every(n=>n===0)){state.score+=Math.floor(state.time)*30;finish();}
  }
  function finish(){
    if(state.done)return;state.done=true;banner.hidden=false;
    document.getElementById('result').textContent='CITY SCORE '+state.score;
    const best=F?.scores.submit('rampage',state.score)||false;
    parent.postMessage({t:'forkade-score',id:'rampage',score:state.score,best},'*');sound('win');
  }
  function step(dt){
    state.time=Math.max(0,state.time-dt);state.cool=Math.max(0,state.cool-dt);state.pulse=Math.max(0,state.pulse-dt*3);
    let x=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),z=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
    if(stick.id!==null){x=stick.x;z=stick.y;}const length=Math.max(1,Math.hypot(x,z));x/=length;z/=length;
    state.x=Math.max(-27,Math.min(27,state.x+x*11*dt));state.z=Math.max(-27,Math.min(27,state.z+z*11*dt));
    if(x||z)state.yaw=Math.atan2(x,z);
    if(press||buttons.stomp||keys.Space)stomp();press=false;
    for(const c of state.chunks){c.vy-=22*dt;c.x+=c.vx*dt;c.z+=c.vz*dt;c.y+=c.vy*dt;c.rot+=dt*3;c.t-=dt;if(c.y<.2){c.y=.2;c.vy=Math.abs(c.vy)*.35;}}
    state.chunks=state.chunks.filter(c=>c.t>0);if(state.time<=0)finish();
  }
  function draw(now){
    hero.position.set(state.x,0,state.z);hero.rotation.y=state.yaw;
    body.scale.y=1-state.pulse*.12;feet.forEach((f,i)=>f.position.y=.5+(F?.settings.reduceMotion?0:Math.abs(Math.sin(now/100+i*2))*.12));
    ring.position.set(state.x,.03,state.z);ring.material.opacity=F?.settings.reduceMotion ? .35 : .25+state.pulse*.3;
    chunkMeshes.forEach((m,i)=>{const c=state.chunks[i];m.visible=!!c&&!F?.settings.reduceMotion;if(c){m.position.set(c.x,c.y,c.z);m.rotation.set(c.rot,c.rot,0);m.scale.set(.45,.45,.45);m.material=mats[c.mat];}});
    camera.position.set(state.x+13,26,state.z+23);camera.lookAt(state.x,0,state.z);
    hud.textContent=`RAMPAGE 3D · ${state.score} PTS · ${Math.ceil(state.time)}s${paused?' · PAUSED':''}`;
    document.getElementById('energy').style.width=energy*100+'%';renderer.render(scene,camera);
  }
  let last=performance.now(),acc=0;
  function frame(now){
    acc+=Math.min(.05,(now-last)/1000);last=now;
    while(acc>=1/60){acc-=1/60;
      if(!paused&&!state.done){
        rewinding=(keys.KeyR||keys.ShiftLeft||buttons.rewind)&&energy>0&&frames.length>1;
        if(rewinding){restore(frames.pop());energy=Math.max(0,energy-1/150);}
        else{frames.push(snapshot());if(frames.length>180)frames.shift();step(1/60);energy=Math.min(1,energy+1/360);}
      }
    }
    draw(now);requestAnimationFrame(frame);
  }
  const back=()=>parent!==window?parent.postMessage('neon-3d-back','*'):location.assign('../');
  document.getElementById('back').onclick=back;document.getElementById('retry').onclick=reset;
  document.getElementById('pause').onclick=()=>{paused=!paused;};
  document.getElementById('settings').onclick=()=>parent.postMessage({t:'forkade-settings-open'},'*');
  addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape')back();if(e.code==='KeyP')paused=!paused;if(e.code==='Enter'&&state.done)reset();});
  addEventListener('keyup',e=>{keys[e.code]=false;});addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);stick.id=null;stick.x=stick.y=0;buttons.stomp=buttons.rewind=false;});
  addEventListener('message',e=>{if(e.source===parent&&e.data?.t==='forkade-pause')paused=e.data.paused;});
  const pad=document.getElementById('stick'),knob=document.getElementById('knob');
  function move(e){const r=pad.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.35),y=(e.clientY-r.top-r.height/2)/(r.height*.35),n=Math.max(1,Math.hypot(x,y));stick.x=x/n;stick.y=y/n;knob.style.transform=`translate(${stick.x*30}px,${stick.y*30}px)`;}
  pad.onpointerdown=e=>{e.preventDefault();F?.sfx.ensure();stick.id=e.pointerId;pad.setPointerCapture(e.pointerId);move(e);};
  pad.onpointermove=e=>{if(stick.id===e.pointerId)move(e);};
  pad.onpointerup=pad.onpointercancel=()=>{stick.id=null;stick.x=stick.y=0;knob.style.transform='';};
  for(const [id,key]of [['stomp','stomp'],['rewind','rewind']]){const b=document.getElementById(id);b.onpointerdown=e=>{e.preventDefault();F?.sfx.ensure();b.setPointerCapture(e.pointerId);buttons[key]=true;if(key==='stomp')press=true;};b.onpointerup=b.onpointercancel=()=>buttons[key]=false;}
  renderer.domElement.onpointerdown=e=>{F?.sfx.ensure();if(e.clientX>innerWidth*.4)press=true;};
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
  addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
  window.Rampage={get state(){return state;},snapshot,restore,stomp,reset,get controls(){return {stick,buttons};},get paused(){return paused;},get frames(){return frames;}};
  reset();requestAnimationFrame(frame);
})();
