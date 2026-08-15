# Card copy & art paths

Edit **this folder** when you need to change card text or image paths. The app reads challenge and player cards from here.

## Challenge decks

| File | Deck |
| --- | --- |
| `challenge/tfth.json` | Face the Hydra |
| `challenge/tbth.json` | Battle the Horde |
| `challenge/tdag.json` | Defeat a God |

Each card entry has bilingual copy and asset paths under `images` (relative to `public/`). At runtime the UI prefers **remote CDN** URLs (see mapping below) and falls back to these local paths.

## Player Constructed decks (Challenge Experience)

| File | Deck |
| --- | --- |
| `player/wildfire.json` | Wildfire Host — RG midrange (60 cards) |
| `player/terror.json` | UB Terror — Dimir Tolarian Terror (60 cards) |
| `player/burn.json` | Challenge Burn — mono-red aggro/burn (60 cards) |
| `player/skies.json` | Azure Skies — WU flyers + removal (60 cards) |

Setup lets you pick any list for all three challenges. Each deck includes `colors`, `archetype`, static `hint` / `hintZh` (optional `hintByChallenge`), plus card `quantity`, `manaCost`, `kind`, `effect` hooks, and `image`.

Rebuild or refresh lists from Scryfall:

```bash
node scripts/build-player-deck.mjs burn
node scripts/build-player-deck.mjs skies
node scripts/build-player-deck.mjs terror
```

**Oracle policy:** only listed keywords and `effect` hooks resolve. Monstrosity / protection-from-white on printed Stormbreath / Ember Swallower / Polukranos are noted as omitted. Soft counters are not used in Challenge Experience lists.

## Local ↔ remote image mapping

Canonical table: [`../cardImageMap.json`](../cardImageMap.json) (generated — do not hand-edit).

```bash
npm run generate:card-image-map
```

Re-run after `fetch:cards` / `fetch:local` / `fetch:mana-symbols` when asset paths change.

Lookup helpers: [`../cardImageMap.ts`](../cardImageMap.ts) — `lookupByLocalPath`, `lookupByCardId`, `listMappedCardImages`.

Runtime strategies ([`../../utils/remoteAsset.ts`](../../utils/remoteAsset.ts)):

| Strategy | When |
| --- | --- |
| `remote-first` (default) | Online / GitHub Pages: try Scryfall (or Wikia for covers) first, then local |
| `local-first` | Offline-first experiments: try local, then remote |

CDN size convention (containers / layout unchanged):

- Lists, battlefield, hand → `normal`
- Modal / inspect → `large`
- Hero / atmosphere art → `art_crop`

**UI constraint:** swapping URL sources must not change layout, CSS, or interaction.

## Related (not card faces)

- Deck blurbs on the home/deck pages: `src/data/locale/deckMeta.ts`
- Rules text: `src/data/rules/`
- UI chrome strings: `src/i18n/`
- Site logo / favicon: `public/mtg-logo.svg`, `public/favicon.svg`
- Home page blurred backdrop: `public/assets/home/atmosphere.jpg`

After running `npm run fetch:cards`, re-check `challenge/*.json` if Scryfall paths or English oracle text changed — the app prefers this folder over the raw deck manifests. Then run `npm run generate:card-image-map`.

Note: `src/data/decks/*.json` hold **meta only** (no `cards[]`); card faces live in this catalog folder and are loaded via `deckStore` on Deck/Challenge/Assistant routes.
