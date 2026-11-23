/* ECHO RUMBLE: original, fixed-step local simulation. No network or wall clock. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RumbleCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const HZ=60, LIMIT=90*HZ, STAGE=20*HZ, clone=x=>JSON.parse(JSON.stringify(x));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function dailySeed(date=new Date()) {const text=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
  const CHAOS=['Gravity flip','Everyone tiny','Big Head mode','Raining rubber ducks','Disco floor','Slippery soap floor','Slow-mo dramatic mode','Bouncy castle walls'];
  const actor=()=>({x:0,z:7,y:0,vy:0,hp:4,cool:0,inv:0,yaw:0,kx:0,kz:0,slipX:0,slipZ:0,bonk:0,emote:0,emoteKind:0,emoteHeld:false,face:'smug'});
  class Run {
    constructor(seed,config=null){this.seed=seed>>>0;this.config=config?clone(config):null;this.stageLength=(config?.timer||20)*HZ;this.limit=this.stageLength*3+30*HZ;this.reset();}
    rand(){let x=this.s.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.s.rng=x>>>0;return this.s.rng/4294967296;}
    reset(){this.s={rng:this.seed||1,tick:0,stage:0,stageTick:0,score:0,combo:0,comboTime:0,bestCombo:0,forks:0,done:false,win:false,player:actor(),echoes:[],logs:[],log:[],objects:[],events:[],boss:120,order:['climb','brawl','smash'],kills:0,crystals:0,blocks:0,chaos:0,chaosPlan:[],chaosLeft:600,emoteQueue:[],bossAttack:{phase:'idle',timer:120,x:0,z:0,cycle:0},misses:0};let bag=[0,1,2,3,4,5,6,7];for(let i=7;i>0;i--){const j=Math.floor(this.rand()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}this.s.chaosPlan=bag.slice(0,4);this.s.bossType=this.seed%3;this.s.matchChain=0;this.s.matchColour=-1;this.s.snakeTrail=[];for(let i=2;i>0;i--){const j=Math.floor(this.rand()*(i+1));[this.s.order[i],this.s.order[j]]=[this.s.order[j],this.s.order[i]];}if(this.config)this.s.order=this.config.stages.slice();else if(this.seed>100){const extra=['glass','tower','snake','match'];this.s.order[0]=extra[this.seed%4];this.s.order[1]=extra[(this.seed+1)%4];}this.s.order.push('boss');this.enter();}
    kind(){return this.s.order[this.s.stage];}
    terrain(x,z){if(Math.abs(x+7)<1.5&&Math.abs(z-5)<2)return .4+(z-3)*.15;if(this.kind()!=='climb')return 0;for(let i=0;i<6;i++){const p=this.platform(i);if(Math.abs(x-p.x)<2.5&&Math.abs(z-p.z)<2.1)return p.y;}return 0;}
    platform(i){return {x:(i%2?1:-1)*3.4+(i%2?Math.sin(this.s.stageTick/100+i)*1.1:0),z:6-i*2.7,y:.5+i*.48};}
    chaos(){return this.config?.chaos===false?-1:this.s.chaosLeft>0?this.s.chaos:-1;}
    emote(a,kind){a.emote=120;a.emoteKind=kind;a.face='smug';}
    damage(a,x,z){if(a.inv)return;const d=Math.max(.1,Math.hypot(a.x-x,a.z-z));a.hp--;a.inv=100;a.kx=(a.x-x)/d*12;a.kz=(a.z-z)/d*12;a.vy=7;a.bonk=50;a.face='panic';this.event('damage',a.x,a.z);}
    defeat(o){o.faint=60;o.hp=0;this.event('defeat',o.x,o.z,o.variant||0);}
    bossStep(){const s=this.s,b=s.bossAttack;if(this.kind()!=='boss'||s.done)return;b.timer--;
      if(b.phase==='idle'&&b.timer<=0){b.phase='windup';b.timer=75;b.x=s.player.x;b.z=s.player.z;this.event('windup',b.x,b.z);}
      else if(b.phase==='windup'&&b.timer<=0){b.phase='slam';b.timer=24;const d=Math.hypot(s.player.x-b.x,s.player.z-b.z);const hit=s.bossType===1?Math.abs(s.player.x-b.x)<1.4:s.bossType===2?(d<2||d>4&&d<5.5):d<3.2;if(hit){this.damage(s.player,b.x+.1,b.z+.1);b.dance=90;}else if(d<6){s.misses++;this.event('near',s.player.x,s.player.z);}this.event('slam',b.x,b.z);if(b.cycle%2===0)for(let i=0;i<2&&s.objects.length<24;i++)s.objects.push({type:'drone',variant:0,x:b.x+(i?2:-2),z:b.z,y:0,hp:1,cool:90,faint:0});}
      else if(b.phase==='slam'&&b.timer<=0){b.phase='recover';b.timer=65;}
      else if(b.phase==='recover'&&b.timer<=0){b.phase='idle';b.timer=110;b.cycle++;}if(b.dance>0)b.dance--;
    }
    enter(){const s=this.s;s.stageTick=0;s.player=actor();s.log=[];s.objects=[];s.echoes=s.logs.map(()=>actor());s.boss=120;s.matchChain=0;s.matchColour=-1;s.snakeTrail=[];s.chaos=s.chaosPlan[s.stage];s.chaosLeft=600;s.emoteQueue=[];s.bossAttack={phase:'idle',timer:150,x:0,z:0,cycle:0,dance:0};const kind=this.kind();
      if(kind==='climb')for(let i=0;i<12;i++){const p=this.platform(i%6);s.objects.push({type:'crystal',x:p.x+(i<6?-.65:.65),z:p.z,y:p.y+1,hp:1});}
      if(kind==='brawl'||kind==='boss')for(let i=0;i<(kind==='boss'?4:this.config?.enemies||12);i++){const a=this.rand()*Math.PI*2;s.objects.push({type:'drone',variant:i%4,faint:0,x:Math.cos(a)*9,z:Math.sin(a)*9,y:0,hp:kind==='boss'?3:2,cool:90+i*13});}
      if(kind==='smash')for(let i=0;i<18;i++)s.objects.push({type:'block',x:(i%6-2.5)*3.4,z:(Math.floor(i/6)-1)*4,y:0,hp:2+Math.floor(this.rand()*3)});
      if(kind==='glass'||kind==='tower')for(let i=0;i<18;i++)s.objects.push({type:kind,x:(i%6-2.5)*3.3,z:(Math.floor(i/6)-1)*4,y:0,hp:kind==='glass'?1:3,stack:kind==='tower'?3:1});
      if(kind==='snake')for(let i=0;i<12;i++)s.objects.push({type:'crystal',x:Math.sin(i*2.4)*8,z:Math.cos(i*2.4)*8,y:1,hp:1});
      if(kind==='match')for(let i=0;i<18;i++)s.objects.push({type:'crystal',colour:i%3,x:(i%6-2.5)*3.3,z:(Math.floor(i/6)-1)*4,y:1,hp:1});
      for(let i=0;i<4;i++)s.objects.push({type:'decoration',x:(i%2?9:-9),z:(i<2?4:-5),y:0,hp:1,faint:0});
      this.start=clone({chaos:s.chaos,chaosLeft:600,matchChain:0,matchColour:-1,snakeTrail:[],bossAttack:s.bossAttack,emoteQueue:[],rng:s.rng,objects:s.objects,score:s.score,combo:s.combo,bestCombo:s.bestCombo,kills:s.kills,crystals:s.crystals,blocks:s.blocks});s.events=[{type:'mutation',kind,chaos:s.chaos}];
    }
    event(type,x=0,z=0,value=0,tx=x,tz=z){if(this.s.events.length<32)this.s.events.push({type,x,z,value,tx,tz});}
    point(n,x,z){const s=this.s;s.combo=s.comboTime?Math.min(20,s.combo+1):1;s.comboTime=150;s.bestCombo=Math.max(s.bestCombo,s.combo);s.score+=n+s.combo*2;if(s.combo===10){s.score+=100;this.event('aura',x,z,100);}this.event('score',x,z,n+s.combo*2);}
    fork(){const s=this.s;if(s.done||!s.log.length)return false;
      s.logs.push(s.log.slice(0,this.stageLength));if(s.logs.length>3)s.logs.shift();s.forks++;const start=clone(this.start);Object.assign(s,start);s.player=actor();s.echoes=s.logs.map(()=>actor());s.stageTick=0;s.log=[];s.comboTime=0;s.boss=120;s.events=[];this.event('fork');return true;
    }
    input(raw={}){return [Math.round(clamp(Number(raw.x)||0,-1,1)*100)/100,Math.round(clamp(Number(raw.z)||0,-1,1)*100)/100,raw.jump?1:0,Math.round(clamp(Number(raw.ax)||0,-1,1)*100)/100,Math.round(clamp(Number(raw.az)||0,-1,1)*100)/100,raw.fire===false?0:1,raw.emote?1:0,clamp(Math.floor(raw.emoteKind)||0,0,5)];}
    move(a,v,echoIndex=-1){const s=this.s,ch=this.chaos();if(v[6]&&!a.emoteHeld){if(echoIndex>=0)s.emoteQueue.push({at:s.stageTick+18*(echoIndex+1),i:echoIndex,kind:v[7]});else{this.emote(a,v[7]);s.echoes.forEach((_,i)=>s.emoteQueue.push({at:s.stageTick+18*(i+1),i,kind:v[7]}));this.event('emote',a.x,a.z,v[7]);}}a.emoteHeld=!!v[6];if(a.emote>0)a.emote--;if(a.bonk>0)a.bonk--;if(!a.bonk)a.face=a.hp<=1?'panic':a.inv?'shock':'smug';let [x,z,jump]=v;const n=Math.max(1,Math.hypot(x,z));x/=n;z/=n;let speed=(5.8+(this.seed%3)*.35)*(ch===4?1.45:1)*(this.config?.speed||1);if(ch===5){a.slipX=a.slipX*.95+x*.05;a.slipZ=a.slipZ*.95+z*.05;x=a.slipX;z=a.slipZ;}
      const ground=this.terrain(a.x,a.z);if(jump&&a.y<=ground+.02)a.vy=8;
      let nx=clamp(a.x+(x*speed+a.kx)/HZ,-10.5,10.5),nz=clamp(a.z+(z*speed+a.kz)/HZ,-10.5,10.5),ng=this.terrain(nx,nz);
      // Climbing auto-hops at ledges: one thumb is enough, Space adds manual timing.
      if(ng>a.y+.2&&a.y<=ground+.05)a.vy=8;
      if(ng<=a.y+.55){a.x=nx;a.z=nz;}
      if(ch===7&&(Math.abs(nx)>=10.5||Math.abs(nz)>=10.5)){a.kx=nx>=10.5?-14:nx<=-10.5?14:a.kx;a.kz=nz>=10.5?-14:nz<=-10.5?14:a.kz;a.vy=7;a.bonk=45;this.event('bonk',nx,nz);}
      a.kx*=.93;a.kz*=.93;if(ch===0){a.vy+=(a.y<3.5?8:-15)/HZ;}else a.vy-=20*(this.config?.gravity||1)/HZ;a.y+=a.vy/HZ;if(a.y<=this.terrain(a.x,a.z)){a.y=this.terrain(a.x,a.z);a.vy=0;}
      if(x||z)a.yaw=Math.atan2(x,z);if(a.cool)a.cool--;if(a.inv)a.inv--;
      for(const o of s.objects)if(o.hp&&o.type==='crystal'&&Math.hypot(o.x-a.x,o.z-a.z)<1.25&&Math.abs(o.y-a.y-1)<1.3){o.hp=0;s.crystals++;this.point(30,o.x,o.z);if(this.kind()==='match'){s.matchChain=s.matchColour===o.colour?s.matchChain+1:1;s.matchColour=o.colour;if(s.matchChain===3){this.point(150,o.x,o.z);this.event('match',o.x,o.z);s.matchChain=0;}}}
      if(a.cool||!v[5])return;a.cool=18;let target=null,dist=7;
      for(const o of s.objects){if(!o.hp||o.type==='crystal')continue;const d=Math.hypot(o.x-a.x,o.z-a.z);const aim=Math.hypot(v[3],v[4]);if(aim>.1&&d>.1&&((o.x-a.x)*v[3]+(o.z-a.z)*v[4])/(d*aim)<.65)continue;if(d<dist){target=o;dist=d;}}
      if(target){if(echoIndex>=0&&s.stageTick%90<18)this.event('help',a.x,a.z,echoIndex);this.event('shot',a.x,a.z,0,target.x,target.z);target.hp--;this.event('hit',target.x,target.z);if(!target.hp){this.defeat(target);if(target.type==='drone')s.kills++;else s.blocks++;this.point(target.type==='drone'?40:25,target.x,target.z);}}
      if(this.kind()==='boss'&&Math.hypot(a.x,a.z+3)<8&&s.echoes.length>=2&&s.boss>0){s.boss--;this.event('shot',a.x,a.z,0,0,-3);this.event('hit',0,-3);if(!s.boss){this.point(600,0,-3);s.win=true;s.done=true;this.event('win');}}
    }
    step(raw={}){const s=this.s;if(s.done)return;s.events=[];s.tick++;if(s.comboTime>0)s.comboTime--;if(!s.comboTime)s.combo=0;
      const stage=Math.min(3,Math.floor(s.tick/this.stageLength));if(stage!==s.stage){s.stage=stage;this.enter();}
      const v=this.input(raw);s.log.push(v);if(s.log.length>this.stageLength*2)s.log.shift();this.move(s.player,v);
      s.echoes.forEach((a,i)=>{const log=s.logs[i];this.move(a,log[s.stageTick]||[0,0,0,0,0,1,0,0],i);});
      for(const q of s.emoteQueue)if(q.at===s.stageTick&&s.echoes[q.i])this.emote(s.echoes[q.i],q.kind);s.emoteQueue=s.emoteQueue.filter(q=>q.at>s.stageTick);
      for(const o of s.objects){if(o.faint>0)o.faint--;if(o.type!=='drone'||!o.hp)continue;const dx=s.player.x-o.x,dz=s.player.z-o.z,d=Math.max(.01,Math.hypot(dx,dz));o.x+=dx/d*.018;o.z+=dz/d*.018;o.cool--;if(d<1.3&&o.cool<=0&&!s.player.inv){this.damage(s.player,o.x,o.z);o.cool=100;}}
      // The toaster warns before launching a deterministic, dodgeable toast bonk.
      for(const o of s.objects)if(o.hp&&o.variant===2){if(o.cool===30){o.tx=s.player.x;o.tz=s.player.z;this.event('toast-warn',o.tx,o.tz);}if(o.cool===0){this.event('toast',o.x,o.z,0,o.tx,o.tz);if(Math.hypot(s.player.x-o.tx,s.player.z-o.tz)<1.7)this.damage(s.player,o.x,o.z);o.cool=180;}}
      if(this.chaos()===3&&s.stageTick%90===60){const i=Math.floor(s.stageTick/90),x=Math.sin(i*2.4+this.seed)*8,z=Math.cos(i*1.7+this.seed)*8;this.event('duck',x,z);if(Math.hypot(s.player.x-x,s.player.z-z)<2){s.player.vy=6;s.player.bonk=24;}}
      if(this.kind()==='snake'){if(s.stageTick%12===0){s.snakeTrail.unshift({x:s.player.x,z:s.player.z});if(s.snakeTrail.length>24)s.snakeTrail.pop();}const tail=s.snakeTrail[18];if(tail&&Math.hypot(tail.x-s.player.x,tail.z-s.player.z)<1.2)this.damage(s.player,tail.x+.1,tail.z+.1);}
      this.bossStep();if(s.chaosLeft>0)s.chaosLeft--;
      s.stageTick++;if(s.player.hp<=0)this.fork();if(s.tick>=this.limit){s.done=true;this.event('end');}
    }
    snapshot(){return {seed:this.seed,config:clone(this.config),s:clone(this.s),start:clone(this.start)};}
    restore(p){this.seed=p.seed>>>0;this.config=clone(p.config??null);this.stageLength=(this.config?.timer||20)*HZ;this.limit=this.stageLength*3+30*HZ;this.s=clone(p.s);this.start=clone(p.start);}
  }
  return {Run,dailySeed,HZ,LIMIT,STAGE,CHAOS};
});
