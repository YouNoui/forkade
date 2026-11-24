> Historical release record. For current behavior and commands, see the root README. Screenshot evidence was archived outside git on 24 Nov 2026; see docs/cleanup-2026-11-24.md.

# Rumble home and update recovery

The old session-wide refreshed flag is replaced by per-controller version handling. The page checks registration on load and foreground, the worker skips waiting/claims clients, and menu reloads are deferred during play behind an explicit update bar. Settings shows the running version/date. HTML/code are network-first with a three-second offline fallback; missing JS no longer falls back to HTML.

The Rumble hero has readable monospace/trio styling, one yellow Play action, real six-second muted gameplay (162,470 bytes), a poster and reduced-motion/data-saver pause. Classic games and Daily remain below. Rumble uses the existing shared-card navigation transition and restores the hero on Back.

Validated: real isolated v40 worker -> new worker without storage clearing (including stale legacy refreshed flag); next update during play defers until menu; hero/gift emphasis; reduced-motion poster. npm test, Chromium web/dist 1280/390/844 and offline Chromium/WebKit. UI screenshots attached. Physical installed-device testing remains separate from browser emulation.

UX section22: checked1-12,15-17; 13-14 not applicable to this account-free local UI; live18 verified after deployment in the PR. Sections3.1/5.1/6/19: trio, monospace exception,44px,alpha borders,dvh,reduced motion,real24parts,no fabricated counters or growth changes. No external connector submission.
