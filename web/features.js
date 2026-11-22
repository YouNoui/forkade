/* Launcher enhancements. Classic script: also inlined into the offline distribution. */
(function () {
  const F = Forkade, S = F.settings, D = ForkadeDaily;
  const bonusLeft=document.createElement('p');bonusLeft.id='bonus-left';bonusLeft.className='hint';document.querySelector('.wallet').appendChild(bonusLeft);
  function paintBonus(){const left=F.bonus.left();bonusLeft.hidden=left>=10;bonusLeft.textContent='Full-bonus rounds left today: '+left;}
  F.rewards.listeners.push(paintBonus);paintBonus();setInterval(paintBonus,1000);
  const gift=document.createElement('section');gift.id='free-gift';gift.className='gift-card';
  gift.innerHTML='<h2>Free gift</h2><p id="gift-hint"></p><button id="gift-open" class="btn btn-pop">Open gift</button><p id="gift-time" role="status"></p><a href="fair.html#chances">Chances and timers</a>';
  document.querySelector('.wallet').after(gift);
  const giftButton=gift.querySelector('button');
  function paintGift(){const st=F.gifts.state(),ready=F.gifts.ready(),n=Math.max(0,Math.ceil((st.next-Date.now())/1000));
    document.body.classList.toggle('gift-ready',ready);giftButton.hidden=!ready;
    gift.querySelector('#gift-hint').textContent=st.count<3?'Welcome gifts: 3 bigger ones ('+(3-st.count)+' left)':'25 cores (80%), 35 (15%), or 50 (5%).';
    gift.querySelector('#gift-time').textContent=ready?'Ready when you are.':'Next gift in '+Math.floor(n/3600)+':'+String(Math.floor(n/60)%60).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
  }
  giftButton.onclick=async()=>{UI.busy(giftButton,'Opening…');try{
    const claim=()=>F.gifts.claim();const result=navigator.locks?await navigator.locks.request('forkade-gift',claim):claim();
    if(result){UI.burst(giftButton);toast('Gift opened! +'+result.amount+' cores');refreshRewards();}
  }finally{UI.reset(giftButton);paintGift();}};
  paintGift();setInterval(paintGift,1000);addEventListener('storage',paintGift);
  const machine=document.createElement('section');machine.id='prize-machine';machine.className='gift-card';
  machine.innerHTML='<h3>Prize machine</h3><p id="machine-odds"></p><button class="btn btn-pop" id="machine-spin">Spin — 100 cores</button><button class="btn" id="machine-reroll" hidden>Re-roll — 60 cores</button><p id="machine-hint"></p><p id="machine-result" role="status"></p><a href="fair.html#chances">All chances and rules</a>';
  document.getElementById('skins').before(machine);
  let revealing=false;
  function paintMachine(){const M=F.machine,st=M.state(),complete=F.rewards.owned().length===F.rewards.SKINS.length;
    machine.querySelector('#machine-odds').textContent=complete?'Collection complete — no more spins.':'Chance of a NEW skin: '+M.chance()+'%';
    const spin=machine.querySelector('#machine-spin'),reroll=machine.querySelector('#machine-reroll');
    spin.disabled=revealing||complete||F.rewards.cores()<M.rules.cost;reroll.hidden=!st.last?.duplicate||complete;
    reroll.disabled=revealing||F.rewards.cores()<M.rules.rerollCost;
    machine.querySelector('#machine-hint').textContent=complete?'All skins owned.':st.last?.duplicate?'Re-roll for 60 — 2nd re-roll in a row is guaranteed new. Next re-roll: '+(st.rerolls===2?100:st.chance)+'% new.':F.rewards.cores()<M.rules.cost?'Need '+(M.rules.cost-F.rewards.cores())+' more cores.':'Duplicates refund '+M.rules.refund+' cores. No ads or money.';
    if(!revealing)machine.querySelector('#machine-result').textContent=st.last?(st.last.duplicate?'Duplicate: ':'New skin: ')+st.last.name+(st.last.duplicate?' · +25 cores refunded':''):'';
  }
  async function spinMachine(reroll){if(revealing)return;revealing=true;paintMachine();machine.querySelector('#machine-result').textContent='Opening…';
    const act=()=>F.machine.spin(reroll);let result;try{result=navigator.locks?await navigator.locks.request('forkade-machine',act):act();
      if(!F.settings.reduceMotion)await new Promise(r=>setTimeout(r,1000));
    }finally{revealing=false;paintMachine();refreshRewards();}if(result)UI.burst(machine);}
  machine.querySelector('#machine-spin').onclick=()=>spinMachine(false);machine.querySelector('#machine-reroll').onclick=()=>spinMachine(true);
  F.rewards.listeners.push(paintMachine);paintMachine();addEventListener('storage',paintMachine);
  const settings = document.createElement('div'); settings.className = 'modal'; settings.id = 'settings'; settings.hidden = true;
  settings.innerHTML = `<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <button class="x" id="close-settings" aria-label="Close settings">×</button><h2 id="settings-title">SETTINGS</h2>
    <p class="hint">Your progress and settings stay on this device. No cookies, ads or third-party trackers. Your nickname and score only leave this device when you tap Post.</p>
    <label class="nick">Nickname <input id="playername" maxlength="14" placeholder="ECHO" autocomplete="nickname" spellcheck="false"></label>
    <label><input type="checkbox" data-setting="mute"> Mute sound</label>
    <label>Volume <input aria-label="Volume" type="range" min="0" max="1" step="0.05" data-setting="volume"></label>
    <label><input type="checkbox" data-setting="reduceMotion"> Reduce motion, shake and flashes</label>
    <label><input type="checkbox" data-setting="colourBlind"> Colour-blind symbols ● ■ ▲ ◆ ★ +</label>
    <label><input type="checkbox" data-setting="analytics"> Count my visits anonymously (helps us see which games people like)</label>
    <p class="hint">First-party visits and game counts only, no raw IP storage. Always off with Do Not Track or Global Privacy Control.</p>
  </section>`;
  document.body.appendChild(settings);
  const settingHelp={mute:'Only this device — turns all game sounds off.',volume:'Only this device — adjusts every game sound.',reduceMotion:'Only this device — removes shake, flashes and UI animation.',colourBlind:'Only this device — adds distinct symbols to Match and Prism.',analytics:'Anonymous counts leave this device while enabled; turn off to stop future counts.'};
  for(const el of settings.querySelectorAll('[data-setting]')){const help=document.createElement('small');help.className='setting-help';help.textContent=settingHelp[el.dataset.setting];el.closest('label').after(help);}
  const nickHelp=document.createElement('p');nickHelp.className='hint';nickHelp.textContent='Nickname stays here until you tap Post; then it is public on rankings.';settings.querySelector('.nick').after(nickHelp);
  const resetSettings=document.createElement('button');resetSettings.className='btn';resetSettings.textContent='Reset settings';resetSettings.onclick=()=>{Object.assign(S,{mute:false,volume:.6,reduceMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,colourBlind:false,analytics:true});S.save();showSettings();toast('Settings reset on this device. Anonymous counts are on.');};settings.querySelector('.sheet').appendChild(resetSettings);
  const defaults={mute:false,volume:.6,reduceMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,colourBlind:false,analytics:true};
  function markSettings(){for(const el of settings.querySelectorAll('[data-setting]')){const label=el.closest('label');label.dataset.changed=String(S[el.dataset.setting]!==defaults[el.dataset.setting]);}}
  addEventListener('forkade-settings',markSettings);markSettings();
  const assistRow=document.createElement('div');assistRow.innerHTML='<h3>Assist — this device</h3><label>Game <select id="assist-game"></select></label><label><input type="checkbox" id="assist-toggle"> Assist next round</label><p class="hint" id="assist-description"></p><p class="hint">Assisted rounds earn cores, but cannot post scores or unlock badges. Never applies to Daily challenges. Changes apply next round.</p><span id="assist-saved" role="status"></span>';
  settings.querySelector('.sheet').appendChild(assistRow);
  const assistSelect=assistRow.querySelector('select'),assistToggle=assistRow.querySelector('input');
  for(const [id,knob] of Object.entries(F.assistMode.rules)){const o=document.createElement('option');o.value=id;o.textContent=GAME_NAMES()[id]||id;assistSelect.appendChild(o);}
  function paintAssist(){assistToggle.checked=F.assistMode.preference(assistSelect.value);document.getElementById('assist-description').textContent=F.assistMode.rules[assistSelect.value];}
  assistSelect.onchange=paintAssist;assistToggle.onchange=()=>{F.assistMode.set(assistSelect.value,assistToggle.checked);document.getElementById('assist-saved').textContent='Saved ✓ — next round, only on this device';};paintAssist();
  const offer=document.createElement('div');offer.className='modal';offer.id='assist-offer';offer.hidden=true;
  offer.innerHTML='<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="assist-title"><button class="x" aria-label="Close assist offer">×</button><h2 id="assist-title">Want a hand?</h2><p id="assist-offer-text"></p><button class="btn btn-pop" id="assist-yes">Turn on assist</button> <button class="btn btn-link" id="assist-no">No thanks</button></section>';document.body.appendChild(offer);
  let offeredId,offerFocus;
  const closeOffer=()=>{offer.hidden=true;offerFocus?.focus();};offer.querySelector('.x').onclick=closeOffer;offer.querySelector('#assist-no').onclick=closeOffer;
  offer.querySelector('#assist-yes').onclick=()=>{F.assistMode.set(offeredId,true);paintAssist();closeOffer();toast('Assist enabled for your next '+(GAME_NAMES()[offeredId]||offeredId)+' round.');};
  offer.onclick=e=>{if(e.target===offer)closeOffer();};offer.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape')closeOffer();if(e.key==='Tab'){const all=[...offer.querySelectorAll('button')],first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
  addEventListener('forkade-assist-offer',e=>{setTimeout(()=>{if(document.querySelector('.modal:not([hidden])'))return;offeredId=e.detail.id;offerFocus=document.activeElement;document.getElementById('assist-offer-text').textContent='Assist makes '+(GAME_NAMES()[offeredId]||offeredId)+' a little easier: '+F.assistMode.rules[offeredId]+'. Assisted rounds earn cores but aren’t ranked and don’t unlock badges.';offer.hidden=false;offer.querySelector('#assist-no').focus();},350);});
  let resume = false, previousFocus;
  function showSettings() {
    previousFocus = document.activeElement; const game = F.current(); resume = game?.state === 'play';
    if (resume) game.state = 'pause';
    gframe.contentWindow?.postMessage({ t:'forkade-pause', paused:true }, '*');
    settings.querySelectorAll('[data-setting]').forEach(el => el.type === 'range' ? el.value = S[el.dataset.setting] : el.checked = !!S[el.dataset.setting]);
    settings.hidden = false; document.getElementById('close-settings').focus();
  }
  function closeSettings() {
    settings.hidden = true; if (resume && F.current()?.state === 'pause') F.current().state = 'play';
    gframe.contentWindow?.postMessage({ t:'forkade-pause', paused:false }, '*');
    previousFocus?.focus();
  }
  // nickname: prefilled, autosaved, shown only when you Post a score
  const nick = document.getElementById('playername');
  try { nick.value = localStorage.getItem('neon-player') || ''; } catch (_) {}
  nick.addEventListener('input', () => { try { localStorage.setItem('neon-player', nick.value.trim() || 'ECHO'); } catch (_) {}
    const label = nick.closest('label'); let tick = label.querySelector('.saved');
    if (!tick) { tick = document.createElement('span'); tick.className = 'saved'; tick.setAttribute('role', 'status'); label.appendChild(tick); }
    tick.textContent = '✓ Saved'; tick.classList.add('on'); clearTimeout(tick._t); tick._t = setTimeout(() => tick.classList.remove('on'), 1600); });
  document.getElementById('close-settings').onclick = closeSettings;
  settings.addEventListener('click', e => { if (e.target === settings) closeSettings(); });
  settings.addEventListener('keydown', e => {
    e.stopPropagation(); if (e.key === 'Escape') closeSettings();
    if (e.key === 'Tab') { const controls = [...settings.querySelectorAll('button,input,select')], first=controls[0], last=controls.at(-1);
      if (e.shiftKey && document.activeElement===first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement===last) { e.preventDefault(); first.focus(); } }
  });
  settings.addEventListener('input', e => { const key = e.target.dataset.setting; if (!key) return;
    S[key] = e.target.type === 'range' ? +e.target.value : e.target.checked; S.save(); F.sfx.ensure(); paintMute();
    // say it's saved, right where the change happened
    const label = e.target.closest('label'); let tick = label.querySelector('.saved');
    if (!tick) { tick = document.createElement('span'); tick.className = 'saved'; tick.setAttribute('role', 'status'); label.appendChild(tick); }
    tick.textContent = '✓ Saved'; tick.classList.add('on'); clearTimeout(tick._t); tick._t = setTimeout(() => tick.classList.remove('on'), 1600);
  });
  for (const parent of [document.querySelector('.wallet .wbtns') || document.querySelector('.wallet'), document.querySelector('.stagebar')]) {
    const btn = document.createElement('button'); btn.className = 'btn mute settings-button'; btn.textContent = '⚙ Settings'; btn.onclick = showSettings; parent.appendChild(btn);
  }
  window.addEventListener('message', e => { if (e.source===gframe.contentWindow && e.data?.t==='forkade-settings-open') showSettings(); });
  const share = document.createElement('button'); share.id='pb-share'; share.className='btn'; share.textContent='Share'; document.getElementById('pb-post').after(share);
  const again = document.createElement('button'); again.id='pb-again'; again.className='btn btn-link'; again.textContent='\u21bb Play again';
  again.onclick = () => { const L = F.board.last; if (L) openGame(L.id); }; share.after(again);
  share.onclick = async () => {
    const L = F.board.last; if (!L) return;
    const name = GAME_NAMES()[L.id] || L.id, url = 'https://playforkade.com/' + L.id;
    const text = `I scored ${L.score} in ${name} on FORKADE — beat me 👉 ${url}`;
    try { if (navigator.share) await navigator.share({ title: name + ' on FORKADE', text });
      else { await navigator.clipboard.writeText(text); toast('Score link copied!'); }
    } catch (e) { if (e.name !== 'AbortError') toast('Could not share. Copy this link: ' + url); }
  };
  const dailyCard = document.createElement('button'); dailyCard.className='card daily'; dailyCard.id='daily-challenge'; dailyCard.style.setProperty('--c','var(--brand)');
  grid.prepend(dailyCard);
  const claim = document.createElement('button'); claim.className='btn'; claim.id='daily-claim'; claim.textContent="Claim yesterday's top-10 bonus"; dailyCard.after(claim);
  // only players who have posted can be in a top 10: hide the button for everyone else
  try { if (!localStorage.getItem('forkade-pid')) claim.hidden = true; } catch (_) {}
  // first visit: the Start here card comes before everything else
  { const start = grid.querySelector('.card.start'); if (start) grid.prepend(start); }
  function dailyPaint() {
    const d = D.challenge(), seconds = Math.max(0, Math.floor((d.next-Date.now())/1000));
    const countdown = [Math.floor(seconds/3600), Math.floor(seconds/60)%60, seconds%60].map(x=>String(x).padStart(2,'0')).join(':');
    dailyCard.innerHTML = `<h3 class="name">DAILY CHALLENGE</h3><div>${GAME_NAMES()[d.game]}</div><p class="desc">Same seed. Same level. +25 local cores for finishing. Resets at midnight Singapore.</p><span class="play dplay">&#9654; Play today's</span> <span class="dnext">Next in ${countdown}</span>`;
  }
  dailyPaint(); setInterval(dailyPaint,1000);
  dailyCard.onclick = () => { const d=D.challenge(); openGame(d.game, { seed:d.seed, daily:d.date }); };
  claim.onclick = async () => {
    const d=D.challenge(Date.now()-86400000), key='forkade-daily-top10:'+d.date;
    UI.busy(claim, 'Checking\u2026');
    try {
      if (localStorage.getItem(key)) return toast('Already claimed for '+d.date+'.');
      if (!localStorage.getItem('forkade-pid')) return toast('Post a daily score first to enter the top 10.');
      const result=await F.board.top(d.game,'daily',d.date);
      if (!result.me || result.me.rank > 10) return toast('No top-10 finish on '+d.date+'.');
      localStorage.setItem(key,'1'); F.rewards.add(75); refreshRewards(); toast('Daily top 10! +75 cores'); UI.burst(claim);
    } catch(e) { toast(e.message); }
    finally { UI.reset(claim); }
  };
  const dailyTab = document.createElement('button'); dailyTab.dataset.period='daily'; dailyTab.textContent='Daily'; document.querySelector('#ranks .rtabs.small').appendChild(dailyTab);
  const more=document.createElement('button');more.id='more-games';more.className='btn';more.textContent='More games';grid.after(more);
  let expanded=false;try{expanded=localStorage.getItem('forkade-more-games')==='1';}catch(_){}
  const extra=[...grid.querySelectorAll('.card')].filter(c=>!c.classList.contains('daily')).slice(4);
  function paintMore(){extra.forEach(c=>c.hidden=!expanded);more.textContent=expanded?'Fewer games':'More games ('+extra.length+')';more.setAttribute('aria-expanded',String(expanded));}
  more.onclick=()=>{expanded=!expanded;try{localStorage.setItem('forkade-more-games',expanded?'1':'0');}catch(_){}paintMore();};paintMore();
  // Delay until the distribution has installed its inline 3D pages.
  setTimeout(() => {
    const query = new URLSearchParams(location.search), path = location.pathname.replace(/^\/+|\/+$/g,'');
    const id = query.get('game') || query.get('g') || (query.size===1 && !query.get('daily') ? [...query.keys()][0] : '') || path;
    if (query.has('daily')) { dailyCard.click(); return; }
    if (['echo3d','rampage'].includes(id)) open3D(id); else if (F.registry.some(g=>g.id===id)) openGame(id);
  }, 0);
})();
