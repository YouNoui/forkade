# ECHO 3D — sky islands

Original floating rock islands, layered crystal scenery, a brighter walking ECHO, pooled pickup sparks and a procedural chiptune. Later islands move; every fifth island grants four seconds of boosted jumping. Island eight provides one rescue. Five cores add 30 points once, and the result shows actual progress and best-score distance with one-tap retry.

Rewind snapshots now include grounded/yaw state, elapsed time, boosts, bonus and checkpoint consumption. Course generation is date-seeded, independent of cosmetic randomness. Score cap is 400 and badge tiers are 60/150/240; existing rankings are retained. Fair play documents the changes. Service worker v43 and the offline download are rebuilt.

Verification: 30-second scripted simulation, repeatable seed, three-second snapshot restoration including power/rescue state; 390 Android Chromium, 390 iPhone WebKit, 1280 desktop and offline browser checks with zero console errors. All 22 API/unit tests pass. Headless CPU baseline 3.69 ms/frame, upgraded 4.13 ms/frame; this is not physical-device GPU FPS or haptic proof. HTML including licensed THREE: about 607 KiB before, 615 KiB after.

Before/after MP4s are in the shared `forkade-games-before-after` folder. UX §22: readable HUD, one main retry, 44px controls, first-input hint dismissal, reduced motion, real scores/bonuses, local progress and no new uploads. Gameplay colours retain the approved exception; shell uses Forkade's trio. No login, third-party submission or migration.
