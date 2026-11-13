# Add your game to FORKADE

FORKADE is open source (MIT). Anyone can build a game and send it in.

## The quick way: the Playground
1. Open **https://playforkade.com/playground.html**
2. Edit the starter game (or write your own), press **▶ Run**, and play it right there. Rewind (hold R) works automatically.
3. Press **⬇ Download .js** to save your game file.
4. Go to **https://github.com/YouNoui/forkade/upload/main/web/games** and drop your file in.
   GitHub forks the repo for you and opens a pull request. Describe your game in a line or two.

## The rules for a game
- One file in `web/games/`, a class that `extends Forkade.GameBase` with
  `reset()`, `step(dt)`, `render(ctx)`, `snapshot()`, `restore(s)`.
- End with `Forkade.register("your-id", { title, genre, color, desc }, YourClass)`. The id must be unique.
- `snapshot()` must return everything that changes, so rewind works.
- Use the shared look: `Forkade.palette`, `glowRect`, `glowCircle`, `drawEcho`, `text`, `banner`.
- **Make it your own.** Genres are free to use, but don't copy another game's name, art, characters,
  piece set or exact layout (no Tetris-style 7-tetromino 10×20 well, no brand names).
- No tracking, no network calls, no ads. FORKADE collects no data and games must keep it that way.
- Plain JavaScript, no build step, no external libraries.

## Running locally
```bash
python -m http.server --directory web 8080
```
Open http://localhost:8080. To include your game in the arcade, add a `<script src="games/your-file.js"></script>`
line in `web/index.html`, add the file to `ASSETS` in `web/sw.js` and bump `CACHE`, then run `python web/build_dist.py`.

The owner reviews every pull request before it goes live.
