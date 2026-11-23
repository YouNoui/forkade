/* Opt-in redemption. The server never receives progress, a name or a ranking ID. */
(()=>{'use strict';const F=Forkade,C=ForkadePromoCatalog;
  const form=document.createElement('form');form.id='promo-form';form.innerHTML='<h3>Have a code?</h3><label class="nick" for="promo-code">Code <input id="promo-code" minlength="6" maxlength="16" pattern="[A-Za-z0-9]{6,16}" autocapitalize="characters" autocomplete="off" spellcheck="false" required aria-describedby="promo-help"></label><p class="hint" id="promo-help">Redeeming sends the code and a random device key. Only a salted hash is kept to prevent repeat use. Rewards stay here; scores and rankings never change.</p><button class="btn btn-pop" id="promo-redeem">Redeem</button><p id="promo-result" role="status" aria-live="polite"></p>';
  document.querySelector('#settings .sheet').appendChild(form);
  const input=form.querySelector('input'),button=form.querySelector('button'),msg=form.querySelector('#promo-result');
  input.addEventListener('input',()=>{input.value=input.value.toUpperCase();input.removeAttribute('aria-invalid');});
  form.onsubmit=async e=>{e.preventDefault();if(!form.reportValidity())return;UI.busy(button,'Redeeming…');msg.textContent='Checking your code (up to 7 seconds)…';
    const code=input.value.trim().toUpperCase();const work=async()=>{
      let device=localStorage.getItem('forkade-promo-device');if(!/^[a-f0-9]{32}$/.test(device||'')){const bytes=crypto.getRandomValues(new Uint8Array(16));device=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');localStorage.setItem('forkade-promo-device',device);}
      // Save before sending so a lost response can be recovered by retrying this code.
      localStorage.setItem('forkade-promo-pending',code);
      const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);let r,j;try{r=await fetch((location.protocol==='file:'?'https://playforkade.com':'')+'/api/promo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'redeem',code,device}),signal:ctl.signal});j=await r.json();}finally{clearTimeout(timer);}
      if(!r.ok&&!j.receipt)throw Error(j.error||'Could not redeem. Try again.');
      if(j.receipt&&F.rewards.grantPromo(j.receipt)){localStorage.removeItem('forkade-promo-pending');msg.textContent='✓ Code redeemed: '+C.describe(j.receipt.reward);UI.burst(button);refreshRewards();paintParts();}
      else {localStorage.removeItem('forkade-promo-pending');msg.textContent='Already redeemed on this device.';}
    };
    try{if(navigator.locks)await navigator.locks.request('forkade-promo',work);else await work();}
    catch(err){msg.textContent=err.name==='AbortError'?'Timed out. Retry the same code; you will not use it twice.':err.message;input.setAttribute('aria-invalid','true');if(!F.settings.reduceMotion)input.animate([{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(-4px)'},{transform:'translateX(0)'}],{duration:300});}
    finally{UI.reset(button);}
  };
  const parts=document.createElement('section');parts.id='promo-parts';document.getElementById('skins').after(parts);
  function paintParts(){parts.replaceChildren();const owned=F.rewards.promo().parts;if(!owned.length)return;const title=document.createElement('h3');title.textContent='Gifted Rumble parts';parts.append(title);const hint=document.createElement('p');hint.className='hint';hint.textContent='All Rumble parts are already free. These gifts are saved in your collection. Equip for your next Rumble run.';parts.append(hint);for(const id of owned){const b=document.createElement('button');b.className='btn';b.textContent=C.parts[id];b.onclick=()=>{try{const a=JSON.parse(localStorage.getItem('forkade-rumble-avatar')||'{}'),[group,n]=id.split(':');a[group]=Number(n);localStorage.setItem('forkade-rumble-avatar',JSON.stringify(a));b.textContent='✓ '+C.parts[id]+' equipped';}catch{b.textContent='Storage unavailable. Try again.';}};parts.append(b);}}
  F.rewards.listeners.push(paintParts);paintParts();
  const code=new URLSearchParams(location.search).get('code');if(code){input.value=code.toUpperCase().slice(0,16);F.openSettings();input.focus();input.scrollIntoView({block:'center'});}
})();
