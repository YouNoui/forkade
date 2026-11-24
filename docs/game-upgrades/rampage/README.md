> Historical release record. For current behavior and commands, see the root README. Screenshot evidence was archived outside git on 24 Nov 2026; see docs/cleanup-2026-11-24.md.

# RAMPAGE 3D: reactor rush

Instanced city floors, window strips and skyline add depth with fewer draw calls. ECHO has brighter materials and animated arms; shared-master procedural music, optional haptics and a brief stomp stop respect accessibility settings.

Every third demolished building grants six seconds of wider, faster Power Stomp. Five buildings award +600 once. At 30 seconds the crossroads reactor opens: six stomps (+100 each), then +1,200 and eight seconds of power. Results show real buildings destroyed and best chain. State, deterministic debris RNG, powers, goals and reactor progression all rewind. Caps and badge tiers increased; old scores retained.

Tests cover a 30-second input sequence, seeded replay equality, three-second restore, reactor and goal rewards, powers/RNG restore, actual pause/movement/stomp/rewind/joystick controls in the regression matrix, phone 390 Chromium/WebKit, desktop 1280 and the offline download. No physical-device GPU or haptics claim. The 15-second before/after clip is saved outside git in shared process/forkade-games-before-after/rampage.mp4.

UX: readable hero and material shapes, 44px controls, existing safe areas, real goal/time values, local-only progress, no new login, scopes, connector or external submission. Cached update recovery still passes from v40 without clearing storage.

Headless render/step CPU after 20 warm-up frames: 0.32ms versus baseline render 1.25ms. Source 9,816 to 14,062 bytes; generated HTML 616,120 to 620,513 bytes (git blobs).
