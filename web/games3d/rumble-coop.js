/* Explicit live-room opt-in. No identity, cookies, analytics or local replay uploads. */
window.RumbleCoop=class {
 constructor(game){this.game=game;this.active=false;this.slot=null;this.code=null;this.last=0;this.pending=null;this.ready=false;this.checkId=0;this.origin='https://forkade-coop.breek.workers.dev';
  const $=id=>document.getElementById(id);this.$=$;
  $('coop-create').onclick=()=>this.connect();$('coop-join').onclick=()=>this.connect(parent.ForkadeCoopCode);$('coop-share').onclick=()=>this.share();$('coop-solo').onclick=()=>this.solo();$('coop-retry').onclick=()=>this.check();
  this.check();addEventListener('pagehide',()=>this.close());
 }
 check(){if(location.protocol==='file:'||parent.location.protocol==='file:'||this.active)return;if(!parent.location.hostname.endsWith('vercel.app')&&parent.location.hostname!=='playforkade.com'&&!window.ForkadeCoopLocal)return;if(this.checking)return this.checking;
  const id=++this.checkId;this.ready=false;this.$('coop-create').hidden=this.$('coop-join').hidden=this.$('coop-retry').hidden=true;
  if(parent.ForkadeCoopCode)this.$('coop-solo').hidden=false;
  this.message('Checking co-op… up to 22 seconds.');
  this.checking=this.probe(id).finally(()=>{if(id===this.checkId)this.checking=null;});return this.checking;
 }
 async probe(id){
  // One attempt, then at most three retries. Never retry room creation or joining.
  for(let attempt=0;attempt<=3;attempt++){
   if(id!==this.checkId)return;
   const controller=this.statusAbort=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
   try{const r=await fetch(this.origin+'/status',{signal:controller.signal}),j=await r.json();if(!r.ok||typeof j.enabled!=='boolean')throw Error('Unavailable');
    if(id!==this.checkId||this.active)return;this.ready=j.enabled;
    this.$('coop-create').hidden=!this.ready||!!parent.ForkadeCoopCode;this.$('coop-join').hidden=!this.ready||!parent.ForkadeCoopCode;
    this.message(!this.ready?'Co-op is resting, play solo.':parent.ForkadeCoopCode?'A friend invited you. Join shares only preset name and game controls.':'Play with a friend. Shared runs are unranked.');return;
   }catch{if(id!==this.checkId)return;}finally{clearTimeout(timer);}
   if(attempt<3)await new Promise(r=>setTimeout(r,300*(attempt+1)));
  }
  if(id!==this.checkId)return;this.message("Couldn't reach co-op, try again");this.$('coop-retry').hidden=false;
 }
 cancelCheck(){++this.checkId;this.statusAbort?.abort();this.checking=null;this.$('coop-retry').hidden=true;}
 message(text){this.$('coop-status').textContent=text;}
 async connect(code){if(this.active)return;this.cancelCheck();this.$('coop-create').disabled=this.$('coop-join').disabled=true;this.message('Connecting…');
  try{if(!code){const r=await fetch(this.origin+'/rooms',{method:'POST',signal:AbortSignal.timeout(7000)}),j=await r.json();if(!r.ok)throw Error(j.error);code=j.code;}
   if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code))throw Error('Room expired or not found. Play solo.');this.code=code;
   await this.game.prepare();this.active=true;this.$('coop-solo').hidden=false;
   await new Promise((resolve,reject)=>{const ws=this.ws=new WebSocket(this.origin.replace('https:','wss:')+'/rooms/'+code);const timer=setTimeout(()=>{ws.close();reject(Error('Room unavailable, full or expired. Play solo.'));},7000);
    ws.onmessage=e=>{let j;try{j=JSON.parse(e.data);}catch{return;}if(j.t==='joined'){clearTimeout(timer);this.slot=j.slot;this.$('coop-share').hidden=false;this.$('coop-create').hidden=this.$('coop-join').hidden=true;this.game.begin();resolve();}
     if(j.t==='state'&&this.slot!==null){const me=j.players.find(p=>p.slot===this.slot);if(!me)return;this.pending=j;this.message(j.players.map(p=>p.name+(p.slot===this.slot?' (you)':'')).join(' · ')+' · '+j.players.length+'/4'+(j.players.length<2?' · Share to start':' · Shared run, unranked'));}}
    ws.onerror=()=>{clearTimeout(timer);reject(Error('Room unavailable, full or expired. Play solo.'));};ws.onclose=e=>{clearTimeout(timer);this.active=false;if(e.code===4003){this.ready=false;this.$('coop-create').hidden=this.$('coop-join').hidden=true;}this.game.disconnected();this.message(e.code===4003?'Co-op is resting, play solo.':e.code===4008?'Too many messages. Play solo.':'Room closed, full or expired. Play solo.');reject(Error('Room unavailable, full or expired. Play solo.'));};
   });
  }catch(e){this.close();this.message(e.message||'Co-op is unavailable. Play solo.');this.$('coop-solo').hidden=false;}finally{this.$('coop-create').disabled=this.$('coop-join').disabled=false;}
 }
 frame(now,input){if(!this.active||this.ws?.readyState!==1)return;this.pulses||={};for(const key of ['emote','super','gadget','dash','jump'])this.pulses[key]||=!!input[key];if(input.emote)this.pulses.emoteKind=input.emoteKind;if(now-this.last>=60){this.last=now;this.ws.send(JSON.stringify({t:'input',v:this.game.core.input({...input,...this.pulses}).slice(0,12)}));this.pulses={};}
  if(this.pending){const j=this.pending;this.pending=null;this.game.core.seed=j.seed;this.game.core.s=j.s;this.game.core.s.player=j.players.find(p=>p.slot===this.slot).actor;this.game.core.s.echoes=j.players.filter(p=>p.slot!==this.slot).map(p=>p.actor);this.game.core.s.offer=null;this.game.core.s.events=[];}
 }
 async share(){const url='https://playforkade.com/r/coop/'+this.code;try{if(navigator.share)await navigator.share({title:'Play ECHO RUMBLE with me',url});else{await navigator.clipboard.writeText(url);this.message('Room link copied. Share only with friends.');}}catch(e){if(e.name!=='AbortError')this.message(url);}}
 close(){this.cancelCheck();this.active=false;this.pending=null;const ws=this.ws;this.ws=null;if(ws){ws.onclose=null;if(ws.readyState===1)ws.send(JSON.stringify({t:'leave'}));ws.close();}}
 solo(){this.close();parent.ForkadeCoopCode=null;this.$('coop-share').hidden=this.$('coop-join').hidden=this.$('coop-solo').hidden=true;this.$('coop-create').hidden=!this.ready;this.message('Solo progress stays on this device.');this.game.solo();this.check();}
};
