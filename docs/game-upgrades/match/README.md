> Historical release record. For current behavior and commands, see the root README. Screenshot evidence was archived outside git on 24 Nov 2026; see docs/cleanup-2026-11-24.md.

# Core Match crystal garden

Adds a cached three-layer crystal world, six shaded core tiles, distinct colour-blind symbols, procedural music and shared combo/hit feedback. Portrait uses a tall canvas and 64px logical cells (about 44px on a 390px screen), with a slim scoreboard and one-thumb swaps. Fast taps are handled as input events instead of relying on a held pointer.

Four successful swaps award +2 moves and +100 points. The first double cascade per level grants +120. Charge, bonus, elapsed time, total swaps and best cascade rewind with the board. Existing Assist adds its five moves; Daily layouts stay seeded. New cap 6,000,000 and badge tiers 2,200/6,500/13,000 retain old rankings. Fair play and SW v44/offline build updated.

Tests: 22 API/unit tests; 30s seeded simulation, full rewind and reduced-motion checks; actual pointer taps earn the four-swap pulse and restore its state in Chromium and WebKit at 390, plus Chromium at 1280. Headless CPU frame cost ~0.95ms before → ~0.34ms after (not physical-phone GPU FPS). Screenshots, metrics and shared before/after clips saved.

UX §22: larger phone controls, single retry, visible goals, immediate tap/cascade feedback, reduced motion, cached static decoration, true counts and bonuses. Shared §3.1/5.1/6 conventions retained; game colours remain the approved exception. No new external service or migration.
