Describe the player-visible change and why it helps.

## Validation

List the commands, browser sizes, web/offline builds tested, and any limitations. Include desktop and phone screenshots for visual changes.

## Game checklist (from CONTRIBUTING.md)

- [ ] Original name, art, characters, piece set and layouts; MIT-compatible rights and retained notices.
- [ ] One file in `web/games/`, extends `Forkade.GameBase`, implements `reset`, `step`, `render`, `snapshot`, `restore`, and registers a unique ID (document the standalone iframe integration for 3D games).
- [ ] Snapshots restore every gameplay value; rewind works without duplicating rewards.
- [ ] Uses ECHO and shared palette/drawing helpers; touch and keyboard controls work.
- [ ] No tracking, ads, remote dependencies or game-initiated network calls. Only the shared, optional ranking/counting flows may contact the server.
- [ ] Add score tiers, caps, run-rate bounds, stats name, grid entry and service-worker assets.
- [ ] Update legal copy when data behavior changes; regenerate previews and distribution; bump service-worker cache.
- [ ] Test desktop, portrait and landscape, web and dist; no console errors.
- [ ] Update the app registry when public features change. Owner reviews before merge.
