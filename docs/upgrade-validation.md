> Historical release record. For current behavior and commands, see the root README. Screenshot evidence was archived outside git on 24 Nov 2026; see docs/cleanup-2026-11-24.md.

# Upgrade validation

## PR A: share, daily, rankings, settings, portrait

- Portrait selection used the owner stats API's last 30 days on 18 November 2026: Sky Hop 2, Sky Striker 2, Pulse Breaker 2. Other 2D games had at most 1 play. These three use 560×900 in portrait casual play. Daily Sky Hop always uses that same logical layout on all devices; other daily games use 900×560.
- `npm test`: Singapore midnight rollover; real API handlers against an in-memory Redis double; opt-in counts; token binding, replay/concurrency, impossible rate and two-hour expiry; pending-score review/authentication; daily expiry and deletion; existing search-discovery checks.
- `npm run test:browser`: Chromium, web and dist, 1280×900, 390×844, 844×390. All 2D games start; three portrait games receive controls and fit bounds; ECHO 3D renders; native share and clipboard fallback; settings survive reload; symbols in Match/Prism; deep links and query links; unknown route returns grid; six daily initial snapshots match across desktop/phone contexts; opt-in Post and owner stats. No console errors. Screenshots and machine-readable report in ignored `tests/artifacts/`.
- PNG preview assets are generated offline by `python tools/build_previews.py`. Each game route serves a full launcher with its own title, canonical, OG and Twitter tags; the source index remains the unknown-route fallback. Generated files are committed because Vercel has no build step.
- Run timing is abuse screening, not authoritative gameplay verification. Editable clients can still cheat by waiting. Pending scores stay out of public boards until the owner approves; they expire after three days.
- Rankings and anonymous counting default off. Ranked-run consent starts temporary tokens, while Post remains a separate explicit action. Preview storage keys are prefixed by branch, so preview tests do not write production boards.
- Build sequence: `python tools/make_legal.py`, `python tools/build_previews.py`, `python web/build_dist.py`. PNG generation needs `pip install -r tools/requirements.txt`; browser tests need `npm ci` and `npx playwright install chromium webkit`.
- Static metadata and PNG contents can be verified directly; external social platforms may retain old cached previews until they refresh.

## PR B: RAMPAGE, iPhone and community

- Chromium **and WebKit** pass the complete six-layout matrix (12 combinations total) with zero console errors. RAMPAGE tests exercise timed play, pause, keyboard movement, thumb-stick movement, stomp/destruction/chunks and rewinding score. Both 3D games render in folder and single-file builds.
- `node tests/offline.cjs`: Chromium and WebKit both load the `file://` single-file build with networking disabled; Sky Hop, ECHO 3D and RAMPAGE render with zero network requests or console errors.
- Chromium verifies AudioContext is running after the first user gesture. **Windows Playwright WebKit exposes neither AudioContext nor webkitAudioContext**: it verifies graceful silent play, layout and controls, but cannot validate audible playback. A physical iPhone's audio and OS Add to Home Screen installation are not claimed as tested. Apple metadata, touch icon, manifest, safe areas and scroll locking are included.
- WebKit testing found and fixed an iframe navigation race; game switches now use a fresh 3D iframe. Tests also found stale round-result overlays intercepting touch controls; the shared fix is in PR A. The animation loop is cancelled on stop to prevent duplicate loops on fast restarts.
- PR A preview: real Redis start token, explicit post, read-back, deletion and replay rejection passed in its preview-only namespace. Deep-link HTML and PNG returned successfully. No production scores were written.
- Run `npm run test:preview` only with a protected branch preview URL in `FORKADE_PREVIEW_URL`; set `RAMPAGE=1` for PR B. Temporary preview test scores are removed in cleanup. Never supply a production URL.
