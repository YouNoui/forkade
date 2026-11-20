/* Launcher enhancements. Classic script: also inlined into the offline distribution. */
(function () {
  const F = Forkade, S = F.settings, D = ForkadeDaily;
  const settings = document.createElement('div'); settings.className = 'modal'; settings.id = 'settings'; settings.hidden = true;
  settings.innerHTML = `<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <button class="x" id="close-settings" aria-label="Close settings">×</button><h2 id="settings-title">SETTINGS</h2>
    <p class="hint">Your progress and settings stay on this device. No cookies, ads or third-party trackers. Your nickname and score only leave this device when you tap Post.</p>
    <label><input type="checkbox" data-setting="mute"> Mute sound</label>
    <label>Volume <input aria-label="Volume" type="range" min="0" max="1" step="0.05" data-setting="volume"></label>
    <label><input type="checkbox" data-setting="reduceMotion"> Reduce motion, shake and flashes</label>
    <label><input type="checkbox" data-setting="colourBlind"> Colour-blind symbols ● ■ ▲ ◆ ★ +</label>
    <label><input type="checkbox" data-setting="analytics"> Count my visits anonymously (helps us see which games people like)</label>
    <p class="hint">First-party visits and game counts only, no raw IP storage. Always off with Do Not Track or Global Privacy Control.</p>
  </section>`;
  document.body.appendChild(settings);
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
  document.getElementById('close-settings').onclick = closeSettings;
  settings.addEventListener('click', e => { if (e.target === settings) closeSettings(); });
  settings.addEventListener('keydown', e => {
    e.stopPropagation(); if (e.key === 'Escape') closeSettings();
    if (e.key === 'Tab') { const controls = [...settings.querySelectorAll('button,input')], first=controls[0], last=controls.at(-1);
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
  for (const parent of [document.querySelector('.wallet'), document.querySelector('.stagebar')]) {
    const btn = document.createElement('button'); btn.className = 'mute settings-button'; btn.textContent = '⚙ Settings'; btn.onclick = showSettings; parent.appendChild(btn);
  }
  window.addEventListener('message', e => { if (e.source===gframe.contentWindow && e.data?.t==='forkade-settings-open') showSettings(); });
  const share = document.createElement('button'); share.id='pb-share'; share.textContent='Share'; document.getElementById('pb-post').after(share);
  share.onclick = async () => {
    const L = F.board.last; if (!L) return;
    const name = GAME_NAMES()[L.id] || L.id, url = 'https://playforkade.com/' + L.id;
    const text = `I scored ${L.score} in ${name} on FORKADE — beat me 👉 ${url}`;
    try { if (navigator.share) await navigator.share({ title: name + ' on FORKADE', text });
      else { await navigator.clipboard.writeText(text); toast('Score link copied!'); }
    } catch (e) { if (e.name !== 'AbortError') toast('Could not share. Copy this link: ' + url); }
  };
  const dailyCard = document.createElement('button'); dailyCard.className='card daily'; dailyCard.id='daily-challenge'; dailyCard.style.setProperty('--c','#ffb23f');
  grid.prepend(dailyCard);
  const claim = document.createElement('button'); claim.className='mute'; claim.id='daily-claim'; claim.textContent="Claim yesterday's top-10 bonus"; dailyCard.after(claim);
  function dailyPaint() {
    const d = D.challenge(), seconds = Math.max(0, Math.floor((d.next-Date.now())/1000));
    const countdown = [Math.floor(seconds/3600), Math.floor(seconds/60)%60, seconds%60].map(x=>String(x).padStart(2,'0')).join(':');
    dailyCard.innerHTML = `<h3 class="name">DAILY CHALLENGE</h3><div>${GAME_NAMES()[d.game]}</div><p class="desc">Same seed. Same level. +25 local cores for finishing. Resets at midnight Singapore.</p><span>Next in ${countdown}</span>`;
  }
  dailyPaint(); setInterval(dailyPaint,1000);
  dailyCard.onclick = () => { const d=D.challenge(); openGame(d.game, { seed:d.seed, daily:d.date }); };
  claim.onclick = async () => {
    const d=D.challenge(Date.now()-86400000), key='forkade-daily-top10:'+d.date;
    try {
      if (localStorage.getItem(key)) return toast('Already claimed for '+d.date+'.');
      if (!localStorage.getItem('forkade-pid')) return toast('Post a daily score first to enter the top 10.');
      const result=await F.board.top(d.game,'daily',d.date);
      if (!result.me || result.me.rank > 10) return toast('No top-10 finish on '+d.date+'.');
      localStorage.setItem(key,'1'); F.rewards.add(75); refreshRewards(); toast('Daily top 10! +75 cores');
    } catch(e) { toast(e.message); }
  };
  const dailyTab = document.createElement('button'); dailyTab.dataset.period='daily'; dailyTab.textContent='Daily'; document.querySelector('#ranks .rtabs.small').appendChild(dailyTab);
  // Delay until the distribution has installed its inline 3D pages.
  setTimeout(() => {
    const query = new URLSearchParams(location.search), path = location.pathname.replace(/^\/+|\/+$/g,'');
    const id = query.get('game') || query.get('g') || (query.size===1 && !query.get('daily') ? [...query.keys()][0] : '') || path;
    if (query.has('daily')) { dailyCard.click(); return; }
    if (['echo3d','rampage'].includes(id)) open3D(id); else if (F.registry.some(g=>g.id===id)) openGame(id);
  }, 0);
})();
