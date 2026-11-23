> Historical release record. For current behavior and commands, see the root README. Screenshot evidence was archived outside git on 24 Nov 2026; see docs/cleanup-2026-11-24.md.

# Proposed Appendix A: Forkade — awaiting Younes/Claude approval

Drafted from main `1ebaa22` on 22 Nov 2026. The shared playbook has NOT been edited. This records current code choices; it does not approve the audit failures or establish a second UX standard.

### forkade
- Shell palette: base `--base: #0b0a10`; partner/brand `--brand: #22e1ff`; primary-action accent `--pop: #ffd84d`, always with `--pop-ink: #14121a` text.
- Supporting surface/text tokens: `--panel: #15131d`, `--panel2: #1d1a28`, `--text: #f1f3ff`, `--muted: #9a9fc4`, `--line: rgba(150,156,190,.32)`. Status: `--ok: #4ade80`, `--danger: #ff5a6e`.
- Fonts currently: Consolas, SF Mono, ui-monospace, monospace (system fonts; no remote font requests). This differs from the generic sans-serif rule and needs an explicit exception or a later design decision.
- Style: dark neon arcade; cyan brand; yellow main action; 44px shared button kit; phone bottom sheets; reduce-motion support. Games retain their own gameplay colours. Current launcher card accents also inherit those game colours: approve that exception or track a later shell palette fix.
- Limits per email: not applicable — no account, email capture or email identity. Rankings use a random device player ID, a 2–14 character nickname, one best per board, top 50 display, per-game score caps and server rate limits. These are not per-person or per-email limits.
- Offers: free MIT open-source arcade, thirteen games, offline download, Playground; no paid plans, subscriptions, ads or cash prizes. Local cores buy cosmetic skins; starter reward +30 for trying three games, daily completion +25, yesterday's daily top-ten +75, streak 10–70. Rewards and progress are device-local, not money. Current constants live in `web/engine.js`, `web/features.js` and `web/daily.js`.
- Owner tools: `/stats.html`, shared owner-key gate, anonymous counts and score/nickname moderation. No user email directory or role-based Me page exists.

Approval requested: palette/tokens, system monospace exception, gameplay-vs-launcher colour scope, no-email limits, and the current free/local reward offer above. Only after explicit approval should this block be added to the shared Appendix A.
