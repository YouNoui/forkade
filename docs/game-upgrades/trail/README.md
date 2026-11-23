# ECHO Trail: comet garden

A tall phone board gives the trail room to move. Shaded cached segments, star pickups, layered garden circuits and shared music replace the flat snake presentation. Every fifth orb is a comet worth30 and grants four seconds of slower glide; ten orbs award+100 once. The board wraps and a completely filled board finishes safely instead of looping forever in food placement.

All food placement now uses the seedable gameplay RNG. Rewind restores food, glide, achievements and elapsed time. Normal Assist simulation remains supported; Trail is not added to the six-game Daily rotation. The launcher preserves portrait orientation for both Trail and Match instead of requesting fullscreen first.

Passed:22 unit/API tests; actual phone direction-button input on Chromium/WebKit390 and desktop1280; exact comet/goal scoring, glide restore and bounded full-board placement; seeded30-second simulation and three-second rewind. Full Chromium/WebKit web/offline matrices run before merge. CPU0.125ms scripted frame, baseline render1.01ms (different layout/workload). Physical-device FPS/haptics unverified.

UX22: phone layout,44px directional controls, shaped pickups, real goal/time values, shared audio/reduced motion, retry/offline. No new auth, connector/scopes, collection or submission. Cap30,000, badge tiers150/450/900; old scores remain. Video: shared process/forkade-games-before-after/trail.mp4.

Source bytes: 3,518 before; 5,818 after.
