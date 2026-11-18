(function () {
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('forkade-settings') || '{}'); } catch (_) {}
  const settings = Object.assign({ mute: false, volume: 0.6, reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    colourBlind: false, analytics: true }, saved);
  delete settings.ranked;
  settings.volume = Math.max(0, Math.min(1, Number(settings.volume) || 0));
  window.ForkadeSettings = settings;
  settings.save = function () {
    try { localStorage.setItem('forkade-settings', JSON.stringify(settings)); } catch (_) {}
    document.documentElement.classList.toggle('reduce-motion', !!settings.reduceMotion);
    if (window.Forkade) { Forkade.sfx.muted = settings.mute; Forkade.sfx.applyVolume(); }
    dispatchEvent(new Event('forkade-settings'));
  };
  settings.save();
})();
