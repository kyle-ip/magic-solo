# Card copy & art paths

Edit **this folder** when you need to change card text or image paths. The app reads challenge and player cards from here.

## Challenge decks

| File | Deck |
| --- | --- |
| `challenge/tfth.json` | Face the Hydra |
| `challenge/tbth.json` | Battle the Horde |
| `challenge/tdag.json` | Defeat a God |

Each card entry has bilingual copy and asset paths under `images` (relative to `public/` via `assetUrl`).

## Player Constructed deck (Challenge Experience)

| File | Deck |
| --- | --- |
| `player/wildfire.json` | Wildfire Host — RG midrange (60 cards) |
| `player/terror.json` | UB Terror — Dimir Tolarian Terror (60 cards) |

Setup lets you pick either list for all three challenges. Each entry includes `quantity`, `manaCost`, `kind`, `effect` hooks the engine resolves, and `image`.

**Oracle policy:** only listed keywords and `effect` hooks resolve. Monstrosity / protection-from-white on printed Stormbreath / Ember Swallower / Polukranos are noted as omitted.

Legacy muster roster files (`akroan.json`, etc.) are unused by the Experience engine.

## Related (not card faces)

- Deck blurbs on the home/deck pages: `src/data/locale/deckMeta.ts`
- Rules text: `src/data/rules/`
- UI chrome strings: `src/i18n/`
- Site logo / favicon: `public/mtg-logo.svg`, `public/favicon.svg`
- Home page blurred backdrop: `public/assets/home/atmosphere.jpg`

After running `npm run fetch:cards`, re-check `challenge/*.json` if Scryfall paths or English oracle text changed — the app prefers this folder over the raw deck manifests.
