# Security policy

Report a suspected vulnerability privately to **hello@iamynoui.com**. Include the affected local/preview URL, reproduction steps and impact. Never post credentials, player device keys, personal data or a working exploit in a public issue. Do not test attacks on production; use `tests/server.cjs` or isolated preview storage.

## Boundaries and data

Forkade has no accounts, payments, AI integration or upload endpoint. Cores and cosmetics are not money. Playground runs code that its user writes locally; it does not import remote scripts. Forge accepts a closed, numeric/preset configuration, never executable code or URLs. CSP permits local evaluation only on Playground, while blocking remote scripts and network origins. Other pages use exact inline-script hashes, not `unsafe-inline`.

Progress, settings, rewards and unposted replays stay on the device. Anonymous first-party visit/play counts are on by default, disclosed with a Settings opt-out; DNT/GPC are respected. No cookies, ads, fingerprinting or third-party trackers are added. Explicit Post shares nickname/score; Rumble also shares a validated input replay and avatar look for three days. Explicit Publish shares Forge presets for up to 90 days. See the generated [privacy page](https://playforkade.com/privacy.html) for full retention and deletion details.

Player IDs are **private bearer device secrets**, generated with 128 cryptographically random bits, not public account IDs. Possessing one authorises posting/deletion for that device and unpublishing its Forge. Public rankings, replay packets, friend ghosts and Forge responses must never expose `pid` or `owner`, including nested objects. Tests enforce that alternative to introducing a separate deletion password, preserving existing players' removal access. Owner-only moderation necessarily sees IDs; never share those lists. Protect local storage and don't paste untrusted code into Playground.

Every ranked game needs a single-use, two-hour run token and its server-issued seed. Per-game score/time caps screen implausible runs; Rumble additionally replays bounded inputs server-side. Other games are not cheat-proof. Seeded local practice, Assist and friend races are unranked. All random IDs and seeds use cryptographic server randomness where uniqueness is required.

Owner actions accept only `X-Stats-Key`, compare in constant time, and share a five-wrong-attempt/ten-minute limit per salted network hash. A correct key still works during that window. The owner UI warns about keys shorter than 32 characters. No body role/key flag grants access. `lib/security.js` trusts Vercel's overwritten `x-real-ip` / `x-vercel-forwarded-for`, never caller-controlled `x-forwarded-for`. Raw addresses are not persisted. IP hashing uses a server secret; failures expire after ten minutes.

Promo use and device deduplication are atomic Lua operations. Personal codes default to one use; unlimited is explicit and marked red. Ten attempts/minute/network and five successful claims/code/network/Singapore-day apply even after local storage is cleared. Daily hashes expire within 24 hours. This limits abuse, not unique people: people sharing a network share that allowance. Promo rewards cap at 100,000 cores/code; local wallet/lifetime values cap at 1,000,000,000 and reject non-finite inputs. Expiry is at most 366 days ahead. None of this changes earned rankings or makes local state tamper-proof.

All API bodies are byte-bounded: rankings 270,000 (including replay), Forge 6,000, promo 8,192, stats 2,048. Numeric JSON fields are actual finite numbers with explicit ranges, not coercible strings. Owner stats days are decimal integers 1–90. Redis key inputs use strict patterns/allow-lists; Lua receives user values only through KEYS/ARGV. No SQL is used.

## Disabled co-op

There is no Cloudflare Worker or room endpoint in this checkout; private live co-op remains disabled. Before introducing one, require unguessable cryptographic room secrets (at least 128 bits), strict bounded numeric/preset message schemas, authentication before joining, per-peer and per-room rate/size limits, short room expiry and no free text, remote URLs or executable input. Keep it disabled until those tests and the hosting/free-plan checks pass. Do not provision or change another app's resources.

## Verification and credentials

- `node tests/security.cjs`: isolated API attacks, numeric fuzz, concurrent claims, private-field checks, built-secret scan and CSP hash freshness.
- `SECURITY_BROWSER=1 node tests/security.cjs`: local Chromium 390/1280 injection/CSP, owner-warning and Playground tests.
- `SECURITY_REDIS=1 node tests/security.cjs`: real Lua, 100 parallel claims against the dedicated **127.0.0.1:6380** Redis only. CI starts this disposable instance; no hosted endpoint is accepted.
- `npm test` and `npm run test:suite`: existing gameplay, browser, privacy, offline and replay regressions.
- After regenerating every HTML/offline bundle, run `node tools/build_csp.cjs`; CI rejects stale hashes. `tools/scan_client.cjs` reports paths/rules only, never credential values. Public content hashes and media blobs are not secrets.
- Gitleaks 8.30.1 scans all fetched Git history with redaction, without rewriting history. The 24 November 2026 initial full-history scan found no leaks. If a real credential is found, rotate it at its provider and report its name only; never publish its value. `.env*`, `.vercel`, PEM files and Wrangler local secrets are ignored.

Live verification is restricted to read-only GETs/headers and one wrong-key 401. Browser verification blocks API traffic. Never create test scores, ghosts, codes, reports or forges in production.

Trusted edge header reference: [Vercel request headers](https://vercel.com/docs/headers/request-headers).
