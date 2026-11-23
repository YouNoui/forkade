> Historical release record. For current behavior and commands, see the root README. Screenshot evidence was archived outside git on 24 Nov 2026; see docs/cleanup-2026-11-24.md.

# Sky Striker — Tempest flight

Three cached storm-cloud layers, a shaped/leaning fighter, exhaust trail, shaped enemy aircraft and distinct diamond hazard bullets. Drag to fly and fire with one thumb; existing portrait controls remain. Early enemy shots are slower; spread-shot foes arrive at 35s, tougher foes at 70s, and the moving Tempest Carrier at 120s.

Catch an eight-second spread-shot cell every fifth kill. Ten ships pay +100; each dangerous near miss pays +5 once and triggers a brief reduced-motion-aware slowdown. Carrier defeat pays +300 and restores one hull with five seconds of protection. End-of-run stats use actual kills/grazes/combo and distance to the real local best. Music has its own key, tempo and instrument through the master gain.

Snapshot/restore now includes weapon/spawn timers, invulnerability, pickup timers, boss deadline and per-projectile graze flags. CPU render timing 0.035ms → 0.089ms; full-frame sample ~0.285ms at 390×844. Source 4.83 → 9.25 KiB. Measurements are headless desktop CPU command-submission timings, not physical-phone/GPU guarantees. 30 simulated seconds, identical seed replay, approximately three seconds of rewind, boss spawn and power/timer restoration pass.

Badge tiers 400/1400/3500; server cap raised to 600,000 for long bonus-rich runs, rate limit remains 500 points/second. Old ranking entries remain untouched. Projectile/enemy/pickup bounds and the shared 240-particle pool limit work.

API tests and Android390/WebKit iPhone390/desktop1280 checks pass. Full browser web/dist matrices and offline checks run before merge. Windows WebKit exercises the reduced-motion navigation fallback; Chromium covers animated morphs. No physical haptics/audio/A2HS claim.

UX §22: portrait readability, existing 44px controls, one-tap replay, truthful goals, reduced motion, local-only settings; no new forms, dialogs or third-party submissions. §3.1 original game palette/depth (Appendix A); §5.1 existing UI preserved; §6 auth not applicable.

Archived screenshot: 390 (`android-390.png`).
Archived screenshot: 1280 (`desktop-1280.png`).

12-second before/after clip: `C:\Users\Younes\Desktop\shared process\forkade-games-before-after\striker.gif`.

