/* ECHO RUMBLE: original, fixed-step local simulation. No network or wall clock. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RumbleCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const HZ=60, LIMIT=90*HZ, STAGE=20*HZ, clone=x=>JSON.parse(JSON.stringify(x));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function dailySeed(date=new Date()) {const text=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
  const actor=()=>({x:0,z:7,y:0,vy:0,hp:4,cool:0,inv:0,yaw:0});
  class Run {
    constructor(seed){this.seed=seed>>>0;this.reset();}
    rand(){let x=this.s.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.s.rng=x>>>0;return this.s.rng/4294967296;}
    reset(){this.s={rng:this.seed||1,tick:0,stage:0,stageTick:0,score:0,combo:0,comboTime:0,bestCombo:0,forks:0,done:false,win:false,player:actor(),echoes:[],logs:[],log:[],objects:[],events:[],boss:120,order:['climb','brawl','smash'],kills:0,crystals:0,blocks:0};for(let i=2;i>0;i--){const j=Math.floor(this.rand()*(i+1));[this.s.order[i],this.s.order[j]]=[this.s.order[j],this.s.order[i]];}this.s.order.push('boss');this.enter();}
    kind(){return this.s.order[this.s.stage];}
    terrain(x,z){if(this.kind()!=='climb')return 0;for(let i=0;i<6;i++){const p=this.platform(i);if(Math.abs(x-p.x)<2.5&&Math.abs(z-p.z)<2.1)return p.y;}return 0;}
    platform(i){return {x:(i%2?1:-1)*3.4,z:6-i*2.7,y:.5+i*.48};}
    enter(){const s=this.s;s.stageTick=0;s.player=actor();s.log=[];s.objects=[];s.echoes=s.logs.map(()=>actor());s.boss=120;const kind=this.kind();
      if(kind==='climb')for(let i=0;i<12;i++){const p=this.platform(i%6);s.objects.push({type:'crystal',x:p.x+(i<6?-.65:.65),z:p.z,y:p.y+1,hp:1});}
      if(kind==='brawl'||kind==='boss')for(let i=0;i<(kind==='boss'?4:12);i++){const a=this.rand()*Math.PI*2;s.objects.push({type:'drone',x:Math.cos(a)*9,z:Math.sin(a)*9,y:0,hp:kind==='boss'?3:2,cool:90+i*13});}
      if(kind==='smash')for(let i=0;i<18;i++)s.objects.push({type:'block',x:(i%6-2.5)*3.4,z:(Math.floor(i/6)-1)*4,y:0,hp:2+Math.floor(this.rand()*3)});
      this.start=clone({rng:s.rng,objects:s.objects,score:s.score,combo:s.combo,bestCombo:s.bestCombo,kills:s.kills,crystals:s.crystals,blocks:s.blocks});s.events=[{type:'mutation',kind}];
    }
    event(type,x=0,z=0,value=0,tx=x,tz=z){if(this.s.events.length<32)this.s.events.push({type,x,z,value,tx,tz});}
    point(n,x,z){const s=this.s;s.combo=s.comboTime?Math.min(20,s.combo+1):1;s.comboTime=150;s.bestCombo=Math.max(s.bestCombo,s.combo);s.score+=n+s.combo*2;this.event('score',x,z,n+s.combo*2);}
    fork(){const s=this.s;if(s.done||!s.log.length)return false;
      s.logs.push(s.log.slice(0,STAGE));if(s.logs.length>3)s.logs.shift();s.forks++;const start=clone(this.start);Object.assign(s,start);s.player=actor();s.echoes=s.logs.map(()=>actor());s.stageTick=0;s.log=[];s.comboTime=0;s.boss=120;s.events=[];this.event('fork');return true;
    }
    input(raw={}){return [Math.round(clamp(Number(raw.x)||0,-1,1)*100)/100,Math.round(clamp(Number(raw.z)||0,-1,1)*100)/100,raw.jump?1:0,Math.round(clamp(Number(raw.ax)||0,-1,1)*100)/100,Math.round(clamp(Number(raw.az)||0,-1,1)*100)/100,raw.fire===false?0:1];}
    move(a,v){const s=this.s;let [x,z,jump]=v;const n=Math.max(1,Math.hypot(x,z));x/=n;z/=n;const speed=5.8+(this.seed%3)*.35;
      const ground=this.terrain(a.x,a.z);if(jump&&a.y<=ground+.02)a.vy=8;
      let nx=clamp(a.x+x*speed/HZ,-10.5,10.5),nz=clamp(a.z+z*speed/HZ,-10.5,10.5),ng=this.terrain(nx,nz);
      // Climbing auto-hops at ledges: one thumb is enough, Space adds manual timing.
      if(ng>a.y+.2&&a.y<=ground+.05)a.vy=8;
      if(ng<=a.y+.55){a.x=nx;a.z=nz;}
      a.vy-=20/HZ;a.y+=a.vy/HZ;if(a.y<=this.terrain(a.x,a.z)){a.y=this.terrain(a.x,a.z);a.vy=0;}
      if(x||z)a.yaw=Math.atan2(x,z);if(a.cool)a.cool--;if(a.inv)a.inv--;
      for(const o of s.objects)if(o.hp&&o.type==='crystal'&&Math.hypot(o.x-a.x,o.z-a.z)<1.25&&Math.abs(o.y-a.y-1)<1.3){o.hp=0;s.crystals++;this.point(30,o.x,o.z);}
      if(a.cool||!v[5])return;a.cool=18;let target=null,dist=7;
      for(const o of s.objects){if(!o.hp||o.type==='crystal')continue;const d=Math.hypot(o.x-a.x,o.z-a.z);const aim=Math.hypot(v[3],v[4]);if(aim>.1&&d>.1&&((o.x-a.x)*v[3]+(o.z-a.z)*v[4])/(d*aim)<.65)continue;if(d<dist){target=o;dist=d;}}
      if(target){this.event('shot',a.x,a.z,0,target.x,target.z);target.hp--;this.event('hit',target.x,target.z);if(!target.hp){if(target.type==='drone')s.kills++;else s.blocks++;this.point(target.type==='drone'?40:25,target.x,target.z);}}
      if(this.kind()==='boss'&&Math.hypot(a.x,a.z+3)<8&&s.echoes.length>=2&&s.boss>0){s.boss--;this.event('shot',a.x,a.z,0,0,-3);this.event('hit',0,-3);if(!s.boss){this.point(600,0,-3);s.win=true;s.done=true;this.event('win');}}
    }
    step(raw={}){const s=this.s;if(s.done)return;s.events=[];s.tick++;if(s.comboTime>0)s.comboTime--;if(!s.comboTime)s.combo=0;
      const stage=Math.min(3,Math.floor(s.tick/STAGE));if(stage!==s.stage){s.stage=stage;this.enter();}
      const v=this.input(raw);s.log.push(v);if(s.log.length>STAGE*2)s.log.shift();this.move(s.player,v);
      s.echoes.forEach((a,i)=>{const log=s.logs[i];this.move(a,log[s.stageTick]||[0,0,0,0,0,1]);});
      for(const o of s.objects){if(o.type!=='drone'||!o.hp)continue;const dx=s.player.x-o.x,dz=s.player.z-o.z,d=Math.max(.01,Math.hypot(dx,dz));o.x+=dx/d*.018;o.z+=dz/d*.018;o.cool--;if(d<1.3&&o.cool<=0&&!s.player.inv){s.player.hp--;s.player.inv=60;o.cool=100;this.event('damage',s.player.x,s.player.z);}}
      if(this.kind()==='boss'&&s.stageTick%150===149&&Math.hypot(s.player.x,s.player.z+3)<5&&!s.player.inv){s.player.hp--;s.player.inv=60;this.event('damage',s.player.x,s.player.z);}
      s.stageTick++;if(s.player.hp<=0)this.fork();if(s.tick>=LIMIT){s.done=true;this.event('end');}
    }
    snapshot(){return {seed:this.seed,s:clone(this.s),start:clone(this.start)};}
    restore(p){this.seed=p.seed>>>0;this.s=clone(p.s);this.start=clone(p.start);}
  }
  return {Run,dailySeed,HZ,LIMIT,STAGE};
});
