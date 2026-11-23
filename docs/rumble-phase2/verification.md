> Historical release record. For current behavior and commands, see the root README. Screenshot evidence was archived outside git on 24 Nov 2026; see docs/cleanup-2026-11-24.md.

# ECHO RUMBLE Phase 2 verification

The 23 Nov owner brief explicitly authorizes Phase 2 and resumes classic polish. This supersedes the earlier stop-after-Phase-1 instruction.

- Real handler tests validate full input replays and reject wrong seeds, altered scores, malformed/oversized inputs and unfinished runs. Only explicit Post makes a ghost available. Ghost names retain their posted preset even when a classic nickname changes.
- Forge uses a closed preset vocabulary. Tests cover publication, codes, minimum counted-play duration, one count/token, reports, owner moderation and absence of raw IP storage.
- `rumble-sharing-browser.cjs` drives Post → real test-store ghost and Forge publish → copy → practice → deep link at 390 and 1280. It accelerates deterministic simulation and ages only isolated test tokens; it does not submit production records.
- `rumble-browser.cjs` passes Android Chromium, iPhone WebKit, desktop, landscape and offline Chromium/WebKit. It checks touch movement, rewind, forks, settings pause, saved avatars and no automatic replay upload; console errors are checked. CPU simulation/render-submit averages were below 16 ms in these headless runs. This does not measure physical-device GPU FPS or haptics.
- General Chromium web/dist matrix and reward, assist, bonus, experiment, fairness, UX, service-worker update, social proof and prior game-polish checks pass. The general WebKit web/dist matrix also passes at all three sizes.

UX checklist: trio shell/one yellow action; 44px controls; 390/1280 layouts; loading/error/empty states; reduced motion; preset picks; dismissible editor; creator unpublish; local settings feedback; server validation; real play counts. Gameplay palettes remain the approved exception. Forge is a multi-control game editor, not a customer onboarding form. No OAuth, external submission, paid flow or migration was added.

Archived screenshot: Forge, 390 (`forge-390.png`).
Archived screenshot: Forge, 1280 (`forge-1280.png`).
Archived screenshot: Rumble, 390 (`rumble-390.png`).
Archived screenshot: Rumble, 1280 (`rumble-1280.png`).
