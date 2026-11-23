/* Version-aware update recovery. No cookies, no telemetry. */
(()=>{'use strict';
 const version='v51',updated='23 Nov';window.ForkadeVersion={version,updated};
 const label=document.createElement('p');label.id='app-version';label.className='hint';label.textContent='Version '+version+' · updated '+updated;document.querySelector('#settings .sheet')?.append(label);
 if(location.protocol==='file:'||!('serviceWorker'in navigator))return;
 let reg,pending=false,reloading=false;const hadController=!!navigator.serviceWorker.controller;
 const bar=document.createElement('button');bar.id='update-bar';bar.hidden=true;bar.textContent='New version — tap to update';document.body.append(bar);
 const midRound=()=>document.body.classList.contains('playing');
 function reload(){if(reloading)return;reloading=true;location.reload();}
 function offer(){pending=true;if(!midRound())reload();else bar.hidden=false;}
 bar.onclick=reload;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!hadController)return;const channel=new MessageChannel();const timeout=setTimeout(offer,1500);channel.port1.onmessage=e=>{clearTimeout(timeout);const next=e.data?.version||version;let last;try{last=sessionStorage.getItem('forkade-controller-version');sessionStorage.setItem('forkade-controller-version',next);}catch{}if(last!==next)offer();};navigator.serviceWorker.controller?.postMessage({type:'VERSION'},[channel.port2]);});
 new MutationObserver(()=>{if(pending&&!midRound())reload();}).observe(document.body,{attributes:true,attributeFilter:['class']});
 async function check(){try{reg=reg||await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});await reg.update();if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});}catch{/* Offline: keep the current playable version. */}}
 addEventListener('load',check);if(document.readyState==='complete')check();document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
})();
