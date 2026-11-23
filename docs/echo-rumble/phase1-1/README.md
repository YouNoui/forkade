> Historical release record. For current behavior and commands, see the root README. Screenshot evidence was archived outside git on 24 Nov 2026; see docs/cleanup-2026-11-24.md.

# ECHO RUMBLE Phase 1.1

Original chunky toy hero with reactive face, running legs, three head sizes, two eye styles, toast/cone hats, moustache, cape and duck/rainbow trails: 24 choices across nine slots. Four original dance poses, delayed echo copying and help bubbles. Jelly, suited pigeon, toaster and cactus enemies, cartoon defeats, destructible props, ramp, moving climb platforms, spectators and a nearest-goal arrow.

Each seeded mutation draws a distinct event from eight chaos choices for 600 simulation ticks. Slow-motion is a presentation-time effect and does not alter deterministic input-step outcomes. KING WOBBLETON locks his target during a 75-tick warning before a belly flop, splits into mini jellies and dances after a hit. Rewind restores chaos, knockback, emote queue and boss attacks. Silly sounds are procedural and use the existing master gain; the local toggle defaults on.

Controls are compact/translucent on touch, with no keyboard hint. Reduce motion disables shake, hue shifts, colour cycling, dramatic camera and slow motion; captions remain. The existing original three.js license is retained. No downloaded character assets or sounds. No Rumble uploads, leaderboard calls, accounts, purchases or new analytics.

## Evidence

- Unit suite: 19 pass, including eight-event seed coverage, 600-tick duration, deterministic full runs/rewind, delayed recorded emotes without movement changes, and 75-tick dodgeable boss telegraphs.
- Rumble browser matrix: Chromium Android 390, desktop 1280, landscape 844; iPhone WebKit 390; Chromium/WebKit offline dist. No application console errors, no beta uploads. Saved avatar, emote button, phone hint, rewind, pause and settings verified.
- Rebuilt RAMPAGE/Rumble, per-game entry pages and single-file distribution. Service worker v40.
- `phase1-1.mp4` and four `phase1-1-N.png` frames live outside git in `C:\Users\Younes\Desktop\shared process\echo-rumble`. 51 seconds at 390x844, five real-time excerpts with actual captured game audio, no speed-up. Scripted real keyboard inputs won with 3,237 points; no injected score or time jumps. Full source/timeline retained in phase1-1-source.
- Isolated 8-second SwiftShader samples: DPR1 mean 27.12 ms (~37 FPS), p95 33.4 ms; device DPR2 capped to render DPR1.25 mean 34.82 ms (~29 FPS), p95 50 ms. This software GPU does not meet the 60 FPS target; CPU simulation/render-submit budgets passed, but no physical-device performance claim is made.
- Full Chromium and WebKit web/dist matrices and Chromium/WebKit offline suite passed, as did growth, Assist, bonus, experiment, Fair play, UX, social proof and classic game-upgrade suites.
- Physical Android FPS, haptics and speaker quality remain unverified. Browser results are emulation on a desktop host. Measurements are in metrics.json and frame-intervals-dpr*.json.
- Deleted only the owner-approved accidental paused rumble-browser project; GET returned 404. No production data or custom domains were removed.

## UX audit

Section 22: checked 1–6, 8–12 and 15–17 (trio shell/game palette exception; >=44px controls; sticky Start; no horizontal scrolling; direct local feedback; fixed canvas; reduced motion; closable focus-contained sheet; local saved scope; truthful score/timer/24 choices). Item 7 uses optional preset customization with one-tap Start; the nine-slot avatar builder remains a game editor rather than customer onboarding. Section 3.1 alpha borders/dvh and 5.1 celebration-only bounce apply. No auth under section 6; items 13–14 do not apply to this account-free beta. Item 18 is recorded in the PR after release. No third-party submissions (section 13), paid options or marketing growth changes.

Archived screenshot: 390px (`android-390.png`).
Archived screenshot: 1280px (`desktop-1280.png`).

Release status and live proof: see PR #30. Stop after delivery for the son's verdict.
