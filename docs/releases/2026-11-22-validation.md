# Forkade release — 22 Nov 2026

The owner replaced the initial multi-PR plan with one consolidated release. Tasks 1–3 had already shipped in #19, #20 and #21. #22 completes Tasks 4–9 in separate commits; nothing was reverted or duplicated.

## Validation

- Unit/API: 10 checks, including ranking count/percentile/ties, consent gates, A/B buckets, token/replay/pending/daily behavior.
- Gifts: fixed clock, all waits and probability boundaries, non-stacking claims, reload persistence.
- Machine: 2,000 seeded draws per ownership band, each within ±3 percentage points; refund and guaranteed re-roll; persisted result after reload.
- Assist: action + puzzle, exactly three losses before offer, never auto-enabled, Daily excluded, no ranked post/badge, normal seeded snapshots byte-identical to pre-assist b40ebc4 for all six seeded games.
- Bonus: 40/80 boundaries, exact breakdown copy, Singapore midnight rollover.
- Browser social proof: hidden below 20; a previous posted best is explicitly labelled.
- A/B: stable letter, no device identifier, opt-out/GPC guards; server DNT/GPC tests. Day-one returns are clearly labelled approximate device-reported aggregates, using first/return flags and existing day-salted counters, not cross-day identity.
- Fair play: all new rule sections checked against runtime constants.
- Editor/dialogs: autosave and reload, safe reset/cancel/undo, empty-board Play, one visible modal, keyboard containment and focus restoration.
- Chromium web/dist: 1280 desktop, 390 portrait, 844 landscape passed; WebKit passed the same matrix (12 cases total). Synthetic touch fixture uses portable Event touch data (Windows WebKit cannot construct Touch directly).
- Fully disconnected file:// build: 2D and both 3D games pass in Chromium/WebKit with zero network requests or console errors. Install icon is embedded.
- Release scenarios at Android UA 390, WebKit/iPhone Safari UA 390, desktop 1280: fresh/returning, real local gift/spin, action+puzzle Assist, bonus breakdown, Fair play, no horizontal overflow/page errors. Tests intercept API writes, so production boards/counters receive no test entries.

## Issue #17 dispositions

1. Privacy claims/defaults: corrected per explicit owner decision; default-on counts retained, opt-out explained.
2. Playground loss: autosave, failure warning, reset confirmation and persisted Undo.
3. Dialog focus/stacking: unified focus/inert manager; confirmation replaces parent, then restores it.
4. Owner tools: approved Appendix A explicitly retains shared-key/no-account architecture, rather than inventing email/roles/2FA. Credential is tab-session-only and sent in a header; decisions require source/reason, capped 100-entry/90-day history and a 60-day player notice. A new account/2FA system is outside this approved architecture.
5. Deadlines: stats and token start bounded; Redis calls have five-second abort; owner Show disables while loading.
6. Targets: remaining report/pause/3D controls and gift links are at least 44px.
7. Empty rankings: direct Play a round action.
8. Phone primary: actual gift/Start here/Daily action stays at the bottom; no duplicate CTA.
9. Settings: row scope/consequence, changed markers, reset and saved status.
10. Loading geometry: fixed-height ranking scroller and reserved owner charts/moderation regions.
11. Palette/font: approved Appendix A explicitly allows monospace and game colours on cards. No rebrand.
12. Motion: shared timing tokens/press scale, reduced-motion editor and launcher, existing sheet/reveal controls; toasts avoid consent and sticky actions.
13. Choices/navigation: four initial game cards with More; one builder card, duplicate footer entry removed. Install prompt and offline download remain distinct supported functions.
14. Me/email: approved Appendix A explicitly preserves no accounts/emails/Me hub.
15. Details: dvh surfaces/editor/iframe, alpha borders, darker base/lighter layers, masked Fair play table edges. Approved arcade glyphs and existing colour identity retained.

## Verification limits

Browser emulation is not a physical iPhone audio/A2HS test. Real production percentiles are only shown for existing posted players on boards with at least 20 players; we do not fabricate that population. Owner-authenticated production A/B totals need the owner's existing STATS_KEY, which is not present locally; API/UI behavior is verified with fixtures, the production key screen is checked without credentials. No third-party review/submission or database migration was made.
