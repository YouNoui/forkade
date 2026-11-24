> Historical release record. For current behavior and commands, see the root README. Screenshot evidence was archived outside git on 24 Nov 2026; see docs/cleanup-2026-11-24.md.

# Glass City: prism shield

Reflective cached panes, shaped hazard barriers and hexagonal pickups sit against layered circuit lights and a windowed skyline. ECHO gets clear shield feedback and shared hit effects/music. Five smashed walls grant one non-stacking shield; eight walls award +300 once. Every120seconds schedules a tall vault wall (+500 on smash). All timers, goals and separate cosmetic debris RNG rewind; existing normal seeded layouts and Assist parity remain intact.

Passed:22 API/unit tests; actual jump/smash controls on Android Chromium390, WebKit iPhone390 and desktop1280; exact cumulative wall/goal scoring; shield consumption; vault schedule/reward; power/RNG rewind; deterministic30-second simulation and three-second rewind; Assist parity. Full Chromium/WebKit web/offline matrices run before merge. CPU0.43ms scripted frame, baseline render0.68ms (different workload). No physical-phone FPS/haptics claim.

UX22: shape cues, visible real goals, sound/reduced-motion settings, existing44px controls/landscape rotate hint, pause/retry and offline. No new login, connector/scopes, collection or third-party submission. Cap3,500,000; badge tiers1,900/6,000/14,000; old scores retained. Before/after video: shared process/forkade-games-before-after/glass.mp4.

Source bytes: 9,182 before; 11,885 after.
