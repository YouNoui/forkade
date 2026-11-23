# FORKADE — web version (plays in the browser)

ECHO RUMBLE beta leads the grid: seven seeded toy stages, three bosses, replayed echo squads and 48 free avatar choices. Post optionally shares a validated ghost; Forge publishes preset-only practice codes. Offline play remains local.

Thirteen classic games remain: eleven 2D games plus ECHO 3D and RAMPAGE 3D. Same hero (**ECHO**), same neon look, same twist
(**rewind time** — hold **R** or **Shift**). Pure HTML5 Canvas + JavaScript.
**No sign-ups. Casual play is local-first and works offline.** Optional rankings and anonymous usage counts use Vercel functions and Upstash; ranked runs are opt-in and anonymous counts default on with a Settings opt-out. Rumble replays upload only after explicit Post; anonymous round tokens contain no player ID.

All thirteen classic games now include refreshed procedural graphics, shared audio/feedback and rewind-safe goals or powers. Seven 2D games support portrait: Sky Hop, Neon Swarm, Sky Striker, Pulse Breaker, Core Match, ECHO Trail and Prism Stacks. Reduced motion and colour-blind symbols remain available.

## Files

```
web/
├── index.html        # the grid + the game canvas (open this)
├── engine.js         # shared toolkit: ECHO, glow, particles, rewind, loop
└── games/
    ├── skyhop.js      # 1  platformer
    ├── swarm.js       # 2  survival shooter
    ├── striker.js     # 3  airplane shmup
    ├── breaker.js     # 4  brick-breaker
    ├── trail.js       # 5  snake
    ├── drift.js       # 6  space rocks
    ├── prism.js       # 7  colour-burst stacker (Prism Stacks)
    ├── match.js       # 8  match-3
    ├── wrecker.js     # 9  destruction (Tower Wrecker)
    ├── glass.js       # 10 run & smash (Glass City)
    └── demo.js        # 11 blast puzzle (Demolition Chain)
```

There is also `../dist/forkade.html` — the **entire thing inlined into one
file**. Handy if you just want to drop a single file somewhere.

## Install to your phone (PWA)

This is a Progressive Web App. When you open the hosted `index.html` over
**https**, the browser shows an **Install** button (and ECHO's own icon). Tap it
to add FORKADE to the home screen — it then launches fullscreen, like a native
app, and **works offline** (a service worker, `sw.js`, caches all the files).

- No app store or accounts. Online rankings are optional.
- On iPhone/Safari: use Share &rarr; "Add to Home Screen".
- On-screen **touch controls** (d-pad + FIRE + REW) appear automatically on
  phones; keyboard/mouse is used on desktop.
- After you change any game, bump `CACHE` in `sw.js` so installed users update.

> PWA install needs the multi-file `web/` version served over http(s). The
> single-file `dist/forkade.html` still plays (touch included) but isn't
> installable on its own.

## Run it locally

Because browsers restrict `file://`, serve the folder over http:

```bash
cd web
python -m http.server 8000
# open http://localhost:8000
```

(The one-file `dist/forkade.html` also opens by double-click, no server.)

## Put it on iamynoui.com

**Do I need a database?** No. These are self-contained client-side games —
nothing is stored on a server, so there's no database and no backend to run.
You'd only need one later if you add online leaderboards or accounts.

Just upload static files to any static host (your site, GitHub Pages, Netlify,
Cloudflare Pages, Vercel). Two ways to embed:

1. **Whole page:** upload the `web/` folder and link to `index.html`.
2. **Inside an existing page:** host the games on a subpath (e.g.
   `/games/`) and embed with an iframe:
   ```html
   <iframe src="/games/index.html" width="960" height="680"
           style="border:0;border-radius:14px" allow="fullscreen"></iframe>
   ```

## Extend it — add a 7th game

Copy any file in `games/`, then:

```js
class MyGame extends NeonEcho.GameBase {
  reset()      { /* set up state */ }
  step(dt)     { /* one frame of logic; read this.input */ }
  render(ctx)  { /* draw with NeonEcho.glow* and NeonEcho.drawEcho */ }
  snapshot()   { return {...this state...}; }   // enables rewind for free
  restore(s)   { /* put state back */ }
}
NeonEcho.register("mygame",
  { title:"MY GAME", genre:"...", color:NeonEcho.palette.cyan, desc:"..." },
  MyGame);
```

Add one `<script src="games/mygame.js"></script>` line to `index.html` and it
shows up on the grid automatically — with the shared neon look **and the rewind
mechanic already working**, because the engine rewinds anything `snapshot()`
returns.

MIT licensed — do whatever you like.
```

## Upgrade systems

- `daily.js`: shared Singapore dates and six seeded daily games. Daily layouts are identical across screens. RNG state rewinds with game state.
- `settings.js` / `features.js`: local settings, explicit privacy opt-ins, sharing, daily card, bonus claims and deep-link startup.
- `entries/` and `og/`: generated per-game launcher pages and 1200×630 preview images. Generate with `python tools/build_previews.py` from the repo root. Unknown paths return the grid.
- Portrait: Sky Hop, Sky Striker and Pulse Breaker use 560×900 in upright phones; other games retain landscape. Daily Sky Hop uses 560×900 for everybody.
- `games3d/rampage.js`: giant ECHO destroys a neon city. Run `python tools/build_rampage.py` to embed the existing licensed THREE r128 bundle. Both 3D pages are also embedded in the single-file distribution.
- Run tokens expire in two hours and cannot be reused. Owner moderation handles pending jumps over 10× a previous best. Preview data uses a separate branch prefix.
- Regenerate legal pages, previews and distribution after relevant edits; bump `sw.js` CACHE. Run `npm test` and the Chromium/WebKit browser matrix before a PR. See `../docs/upgrade-validation.md`.

## Local rewards and honest rules

Free gifts use stored deadlines, three welcome rewards and disclosed 80/15/5 regular chances. The optional prize machine has six exclusive skins, fixed collection-based chances, duplicate refunds and a guaranteed second re-roll. Assist is offered after three losses and enabled only by choice; it never affects Daily, rankings or badges. Singapore-day round cores pay full for 40 rounds, half through 80, then a quarter. Weekly social proof is server-calculated and hidden below 20 players. Anonymous A/B groups change only the Start here card; opt-out, DNT and GPC disable counting.

Fair play reads rules directly from shared constants. Everything earned stays on this device. No ads, payments, accounts or third-party trackers. Additional tests: `node tests/growth.cjs`, `node tests/assist.cjs`, `node tests/bonus.cjs`, `node tests/experiment.cjs`, `node tests/fair.cjs`.

Owner admin: /admin (old /stats.html redirects), STATS_KEY header and tab-session storage only. Promo codes: Settings or ?code= links; local receipt ledger, no ranking/badge/rank effects. Server-only stable PROMO_SALT; maximum 1000 codes, 100,000 cores each, max uses 1/10/100/unlimited, Singapore expiry. Existing 48 Rumble choices remain free; gifted parts appear in Locker. No cookies or trackers.
