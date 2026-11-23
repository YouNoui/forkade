# Driftstorm: guardian storm

Cached shaded rocks and a shaped ship cross a layered nebula, with shared music and impact feedback. Six rock kills grant eight seconds of Twin Shot; twelve give +200 once. A twelve-hit guardian is scheduled every 120 seconds (one alive at a time), worth +400 plus its normal 15. Real wave and rock counts appear in results. All new powers, timers, seeded rocks and the previously omitted shot cooldown rewind.

Spent bullets now hit only once, and newly spawned fragments wait until the next collision pass. Reused rock buffers avoid an allocation per frame. Rocks and shots are capped at 96 each. Old scores remain, cap is 1,200,000 and badge tiers are 700 / 2,400 / 5,500.

Passed: 22 API/unit tests; actual thrust/turn/fire at 390 Chromium/WebKit and 1280; exact Twin Shot/goal/guardian rewards; one-guardian cap; spent-bullet fragment isolation; power/cooldown rewind; seeded 30-second simulation and three-second rewind. Full Chromium/WebKit web/offline matrices run before merge. CPU 0.15ms scripted frame; baseline render 0.82ms (different workload). Physical-device GPU/haptics unverified.

UX22: shaped hazards, real values, shared reduced motion/audio, existing 44px controls/rotate hint, pause/retry and offline. No new auth, connector/scopes, collection or submission. Before/after video: shared process/forkade-games-before-after/drift.mp4.

Source bytes: 5,999 before; 8,598 after.
