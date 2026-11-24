> Historical release record. For current behavior and commands, see the root README. Screenshot evidence was archived outside git on 24 Nov 2026; see docs/cleanup-2026-11-24.md.

# Neon Swarm — reactor garden

Replaces flat enemies with animated, shaped drones and a three-layer cached circuit world. Portrait play and drag-to-move/auto-aim make the phone version one-thumb friendly. Dash drones arrive at 35s, armoured drones at 70s, the reactor guardian at 120s. Every fifth kill drops a ten-second triple-shot/heal cell; ten drones and twenty no-hit seconds pay real score bonuses. Boss defeat gives an eight-second shield. Shared music, bounded particles, light pools, hit feedback and reduced-motion/vibration settings apply.

All gameplay timers, enemy phases, pickups, gun cooldowns and boss state rewind. Gameplay now exclusively uses Forkade.rng; cosmetic randomness stays separate. Damage resets the combo rather than rewarding getting hit. Badge tiers 200/650/1500; existing 500 points/second and server cap remain generous for the new bonuses, old boards untouched.

Proof: 1,800 scripted steps (30 simulated seconds), identical seed replay, approximately three seconds of rewind history, power/cooldown restoration and guardian spawn. Render-only CPU timing before 0.054ms, after 0.108ms; full frame sample 0.295ms on this desktop. Source 5.20 → 8.17 KiB. These are CPU command-submission measurements, not physical Android/GPU performance. Particle cap 240, enemy cap 48, bullet cap 96, pickups cap eight.

API tests and Android390/WebKit iPhone390/desktop1280 game checks pass; full browser web/dist matrices and offline checks run before merge. Windows WebKit navigation uses the documented reduced-motion fallback; Chromium covers animated Back. No physical-device haptics/audio/A2HS claim.

UX §22: checked portrait readability, controls, instant feedback, reduced motion, real score/goal timers and local settings; no new forms, dialogs or third-party submissions. §3.1 depth and existing arcade palette/font exception; §5.1 existing UI motion preserved; §6 auth not applicable.

Archived screenshot: 390 (`android-390.png`).
Archived screenshot: 1280 (`desktop-1280.png`).

Before/after: `C:\Users\Younes\Desktop\shared process\forkade-games-before-after\swarm.gif` (12 seconds).
