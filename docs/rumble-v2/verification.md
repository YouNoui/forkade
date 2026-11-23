# ECHO RUMBLE 2 release evidence

- Four free hero kits and fixed Nova unlock; supers, two gadgets per stage, dashes,
  echo ability copies, three seeded upgrade choices and three-phase bosses.
- CC0 KayKit models with meshopt compression, 256px atlases, same-origin loading,
  animated heroes/enemies, shadows and toon materials; first-load budget enforced.
- Local Echo Road/mastery/collection and promo-compatible rewards; no purchases.
- Normal/Hard/Insane and Singapore-week Nightmare use separate ranking boards.
  Version 3 replays bind canonical options; version 2 remains readable.
- Genuine opt-in friend ghosts, including expiry/removal checks. Live private
  rooms remain disabled: Cloudflare account is connected, but billing access is
  denied and a free relay plan cannot yet be verified. No resource was created.

## Validation

27 unit/API checks passed, including asset hashes/budget, old/new replays,
option binding, score tampering, difficulty separation, ghost removal and Road
idempotency. Browser evidence in this folder records measured request sizes;
Android Chromium, iPhone WebKit and 1280px desktop passed v2 input/persistence
checks. Original Rumble regression passed web, landscape, Chromium/WebKit offline.
Headless CPU render-submit timings are **not physical Android FPS measurements**.
The full web/dist 390px, 844px landscape and 1280px browser matrix passed, including seeded-device parity, deliberate Post, navigation, fair play, rewards and consent gates. Native share payloads and clipboard fallback are tested separately; a headless browser cannot verify the operating system share sheet. Final CI/deployment links are recorded after release.

## UX checklist (playbook section 22)

Checked 1–9, 11–12, 14–19 where applicable: Forkade tokens, 390px/1280px,
44px controls, loading/retry feedback, reserved portrait sizes, reduced motion,
local preferences with save feedback, fixed genuine rewards, keyboard/modal focus,
closed server vocabulary, no paid choices or invented activity. Upgrade choice
pauses the clock and has an explicit Leave run action. Original cosmetic controls
remain in one details section. Items 10/13 have no uploads/account/Me directory;
owner Stats/Moderation/Promo routes retain their existing access controls.

## Third-party approvals

| Connector | Code-requested scopes | App/project actually used | Status | Who must click |
|---|---|---|---|---|
| GitHub | Existing repository/PR/check access; no player OAuth | YouNoui/forkade | Existing authenticated CLI | Nobody |
| Vercel | Existing Git deployment; no new player OAuth/env | forkade / prj_X4jPzrcRewTttJttIkROZfCvlDAj | Existing integration | Nobody |
| Cloudflare relay | No runtime scopes or relay deployed | Account f294bccbb4356f8d259b9c7be5e5344f; no new app | Free-plan billing verification unavailable (403) | Younes: confirm Workers Free plan |

No production sample scores, ghosts, codes or accounts were created.

Candidate gameplay capture: a genuine Hard win using keyboard/mouse inputs, API writes blocked; 4 supers, all 3 boss phases, 3 upgrade picks, Road level 2 and collection. The 115.04-second raw capture is presented at 1.3534× as an 85-second video in the shared process folder. The original capture and metadata are retained.
