# Card copy & art paths

Edit **this folder** when you need to change card text or image paths. The app reads challenge and player cards from here.

## Challenge decks

| File | Deck |
| --- | --- |
| `challenge/tfth.json` | Face the Hydra |
| `challenge/tbth.json` | Battle the Horde |
| `challenge/tdag.json` | Defeat a God |

Each card entry has bilingual copy and asset paths:

```json
{
  "id": "…",
  "collectorNumber": "1",
  "quantity": 11,
  "name": { "en": "Hydra Head", "zh": "多头龙头颅" },
  "typeLine": { "en": "…", "zh": "…" },
  "oracleText": { "en": "…", "zh": "…" },
  "images": {
    "front": "assets/cards/tfth/1-hydra-head-front.png",
    "back": "assets/cards/tfth/back.png",
    "artCrop": "assets/cards/tfth/1-hydra-head-art.jpg"
  }
}
```

Image paths are relative to `public/` (via `assetUrl`).

## Player muster decks (Challenge Experience)

| File | Force |
| --- | --- |
| `player/akroan.json` | Akroan Legion |
| `player/nessian.json` | Nessian Wilds |
| `player/meletis.json` | Meletis Tide |
| `player/forge.json` | Forge of Purphoros |

Roster cards include `name` / `nameZh`, `typeLine` / `typeLineZh`, `oracleText` / `oracleTextZh`, and `image`.

## Related (not card faces)

- Deck blurbs on the home/deck pages: `src/data/locale/deckMeta.ts`
- Rules text: `src/data/rules/`
- UI chrome strings: `src/i18n/`
- Site logo / favicon: `public/mtg-logo.svg`, `public/favicon.svg`
- Home page blurred backdrop: `public/assets/home/atmosphere.jpg`

After running `npm run fetch:cards`, re-check `challenge/*.json` if Scryfall paths or English oracle text changed — the app prefers this folder over the raw deck manifests.
