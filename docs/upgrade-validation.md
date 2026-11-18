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
