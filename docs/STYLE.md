# Forkade UI style

The authored source of truth is `web/index.html`: its first `:root` block and `style#ui-kit`. Run `python tools/build_ui.py` to publish `web/ui.css`. Other pages load that generated sheet; the 3D builders inline the same kit so games and the single-file download remain offline. Do not hand-edit generated CSS or game HTML.

- Spacing: `--s1`…`--s7` = 4, 8, 12, 16, 24, 32, 48px. Larger reserved areas may compose those tokens with `calc`. Auto centering and safe-area geometry are layout, not fixed spacing.
- Type: `--t-xs`…`--t-2xl` = 12, 14, 16, 20, 24, 32px. Body leading 1.45, heading/control leading 1.2. Weights 400, 700, 900. Canvas UI text uses the same CSS scale.
- Corners: `--r-sm` 8px for inputs/chips; `--r-md` 12px for controls; `--r-lg` 16px for cards/sheets; `--r-pill` 999px. Zero means square; 50% is only for true circles.
- Controls: `.btn` is at least 48px, `.btn-sm` at least 44px. `.btn-pop` is the one yellow primary action in a screen; `.btn-dark`, `.btn-link` and `.btn-danger` express the other roles. `.card-btn` shares card interaction and layout. Focus is a 2px cyan ring, press is 97%, disabled is 50%; reduced motion removes scaling.
- Keep the approved trio B and system monospace. Game art and launcher game colours retain the approved exception. UI icons use 20px monochrome SVGs, never emoji. The play triangle only marks Play actions.
- Phone/tablet content is a centered column up to 560px with 16px gutters. Desktop retains its grid. Category choices stretch equally and clamp their help to two lines; game descriptions remain complete. Numbers use tabular figures.
- Use sentence case for controls and prose; Title Case for game names. FORKADE is the wordmark. Small eyebrows may be uppercase through CSS. Technical key names, code examples, IDs and user-supplied nicknames are not rewritten.

## Glossary

| Say | Meaning |
|---|---|
| cores | Local reward currency; never money, coins or a round score |
| score | The result of a round; separate from cores and XP |
| Rankings | Opt-in posted scores; “leaderboard” remains an internal API identifier only |
| Locker | Local skins and the prize machine |
| Fair play | Published rules, limits, odds and unlock requirements |
| Make a challenge | Open the preset challenge editor, internally called Forge |
| challenge | A closed-preset custom run; publication is explicit and practice is unranked |
| Echo Road / mastery / XP | Rumble's local progression, with real fixed requirements |
| Post | Explicitly share a score (and a Rumble replay where disclosed) |
| Share | Open the device share sheet or copy a link; does not Post automatically |

Run `node tests/style.cjs` and the full `npm run test:suite`. The style guard covers 390/1280 layouts, six font sizes, corners, 4px spacing, touch targets, overflow and primary-action count. Evidence goes outside git via `STYLE_OUT` / `FORKADE_ARTIFACTS`. It checks visible DOM text; canvas text is tokenized at the engine's text renderer and game simulation tests remain separate. Do not weaken gameplay, privacy, offline or navigation assertions for a cosmetic change.
