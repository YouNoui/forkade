# FORKADE — web version (plays in the browser)

Six small games on one grid. Same hero (**ECHO**), same neon look, same twist
(**rewind time** — hold **R** or **Shift**). Pure HTML5 Canvas + JavaScript.
**No database, no backend, no sign-ups** — just static files.

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
    └── drift.js       # 6  asteroids
```

There is also `../dist/forkade.html` — the **entire thing inlined into one
file**. Handy if you just want to drop a single file somewhere.

## Install to your phone (PWA)

This is a Progressive Web App. When you open the hosted `index.html` over
**https**, the browser shows an **Install** button (and ECHO's own icon). Tap it
to add FORKADE to the home screen — it then launches fullscreen, like a native
app, and **works offline** (a service worker, `sw.js`, caches all the files).

- No app store, no accounts, no database.
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
