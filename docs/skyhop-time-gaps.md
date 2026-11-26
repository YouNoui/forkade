# Sky Hop: Time Gaps (beta)

Choose **Time Gaps (beta)** on Sky Hop's start screen, or enable it in Settings for the next round. Both controls use the same device preference. Jump, hold rewind near the top for at least 0.3 seconds, then release it. Your past self stays in the air: land on its dashed platform and jump again to cross the gate. The same rewind still rescues falls.

The toggle is off by default and fixed per round. Daily always uses classic Sky Hop. Beta rounds earn the existing normal cores and keep their best under `skyhop-time-gaps` in the existing score store; they cannot request ranked run tokens, Post or earn badges. The only new localStorage keys are `forkade-skyhop-time-gaps` and `forkade-skyhop-echo-hint`.

## Simulation contracts

- An echo needs an airborne rewind start at least 60px above the restored player. Its 64px one-way surface is eight pixels below the original feet in world coordinates. Only one exists. It lasts four seconds of forward play, fading in its final 0.8 seconds; pausing and rewinding do not age it.
- Echoes and the in-progress rewind observation stay outside snapshots. Reset clears them. Gate geometry, schedule and completion are in snapshots; the engine retains gameplay RNG history. Creating or drawing an echo consumes no gameplay RNG.
- Ordinary beta rounds get a local seed at reset because unranked play does not request a server-issued seed. Explicit test seeds remain unchanged; restoring across a gate's generation restores its exact route and schedule.
- A gate is due at 15 seconds, then 12–18 seconds after its predecessor. It waits for a grounded player, at least half rewind energy, and completion of the previous gate. Its 190–270px gap has no intermediate island; anchors and adjacent islands stay static, and anchor centers differ by at most 90px. The classic 120-second sky-rush platform is disabled in this mode so it cannot bridge the gap.
- Shield bounce launches no higher than the gate's lower anchor and uses ordinary jump strength. Beta physics subdivides long frames into at most 1/60-second steps to preserve jump reach. Classic mode's integration is unchanged.
- The shared engine's optional `configureRound` hook is needed before its token request. It also uses the game's optional local score key and round label. The existing Assist exclusion path handles beta token/badge exclusion without changing reward constants or server rankings.

## Verification and evidence

Run `node tests/skyhop-time-gaps.cjs` and `WEBKIT=1 node tests/skyhop-time-gaps.cjs` (PowerShell: set `$env:WEBKIT='1'`). `SKYHOP_SIM_ONLY=1` runs just the deterministic harness. Both browsers are included in `npm run test:suite`.

The classic 30-second state/RNG trace is frozen from main commit `1b4c448c7921e8c6bfbcdcf80526a546782fdfbb`: SHA-256 `fef97408ed3c07a1a208633e16a2b630afb9b002f17bc37f65ac54c9fc117729`. The harness uses the engine's actual RNG and Rewind class, runs 200 seeds in both canvas orientations, verifies geometry/energy/echo lifetime/rescue/reset/rewind, and checks 100% bot completion with rewind versus 0% without it or with shield alone. It also checks all 200 seeds with 20Hz and 30Hz frame intervals.

Browser coverage uses the real engine, web and offline builds at 1280, 390×844 and 844×390, synchronized start/Settings toggles, token/Post/badge/Daily exclusion, separate local best and normal cores. Daily bypasses the start choice, and opening it alone never requests a run token. It asserts that the toggle and touch rewind control are at least 44px, keeps rewind below the canvas, and runs the Playground starter. Security and all ranking writes use isolated local fixtures.

Screenshots, logs and the ~20-second `before.webm` / `after.webm` clips are outside git under `C:\Users\Younes\Desktop\shared process\forkade-skyhop-time-gaps\`. The clips show real browser frames with scripted input and a seeded scene positioned just before its first gate. Browser emulation and CPU timings are not physical Android/iPhone FPS proof. Hosted preview results and the full UX §22 checklist belong in the PR.

No default-mode change, new ranked board or cross-game Time Bank is included. Those remain owner decisions after review.
