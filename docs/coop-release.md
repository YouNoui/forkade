# Co-op release — 24 November 2026

## Section 13 approvals

| Connector | Scopes requested by app code | Console app actually used | Status | Who clicks |
|---|---|---|---|---|
| Cloudflare Wrangler | Deploy forkade-coop and its two SQLite DO bindings; one server secret | Official Wrangler OAuth client 54d11594-84e4-41aa-b438-e81b8fa78ee7; account f294bccbb4356f8d259b9c7be5e5344f | OAuth authenticated; no new long-lived token. User authorized this deployment/migration. Wrangler's existing OAuth grant is broader than the operations this app uses. | None pending |
| Cloudflare Notifications | Usage Based Billing email alerts for Workers/DO; no billing changes | Same designated account; no app OAuth submission | Owner requested email younesnoui@gmail.com; alert-only, no usage blocking | Agent |
| Vercel | Forkade production/preview server secret and Git deployment | prj_X4jPzrcRewTttJttIkROZfCvlDAj, team_ZZxx2DLI7VXGW8CgmD6SuD4g | Existing integration; owner key unchanged | Agent |

No end-user OAuth scopes, logins or third-party app-review submissions are introduced.
The six-character room invitation replaces the earlier unimplemented 128-bit-secret
proposal by explicit instruction in the owner’s co-op brief. Share only with friends.

## Verification

Runtime: isolated workerd SQLite/Hibernation tests cover four peers, shared state,
emotes, full/expired rooms, schema injection, byte caps, Origin, join throttling,
message floods, owner header auth, kill switch, budgets and Singapore rollover.
Browser: see external shared-process/forkade-coop evidence and CI artifacts.
Live smoke may create only temporary co-op rooms; other production APIs are intercepted.
Local browser relay tests disable Chromium's local-network check only in their test
process, because the client requests a loopback Worker. Live runs keep it enabled.

## UX checklist

Sections 3.1/5.1/6/22: shared tokens and 44px buttons; named controls and status region;
no new timed motion; opt-in sharing; visible Play solo and plain network/full/expiry
fallbacks. No code typing, password or account signup is added. Owner key stays header-only.
No marketing, paid choices, fabricated counts, urgency timers or device-based prices.
Co-op is unranked, fixed Volt/Normal; first seeded upgrades keep all peers in one world.
Solo rewind, rewards and ranked flows are preserved. Browser emulation is not physical
phone performance proof.

## Deployment record

Dedicated Worker deployed with Wrangler: a871b260-bb5e-43d1-8a9d-0615fd8a6c51.
The owner’s brief explicitly authorizes this new SQLite migration; configuration SHA-256:
DFD6F7A7EF21A91A0D700B2F818A0625DC0998AAFE8D081EC159319C65F3B948.
COOP_SECRET installed as a server secret in the Worker and Vercel production/preview.
Usage Based Billing email notifications enabled for 1,000,000 Workers requests and
100,000 Durable Object requests (two policies because the console selects one product).
No plan, payment method or other app resource was changed by this task.
Other Workers were inventoried before and after. Concurrent deployments to other apps
changed some timestamps during this task; the external snapshots preserve that evidence,
so this release does not claim all eight timestamps stayed unchanged.
