# Magic Solo — Challenge Decks

Solo fan site for the three *Magic: The Gathering* **Challenge Decks** from Theros-block Game Days (Face the Hydra, Battle the Horde, Defeat a God), with simplified PvE **Digital Play** (Challenge), **Paper Play** (challenge half-board for table decks), classic archetypes, Scryfall set gallery, local pack/collection toys, a **Print assistant** for proxy PDFs, and an optional BYO-key **AI Assistant**.

**Live:** [https://kyle-ip.github.io/magic-solo/](https://kyle-ip.github.io/magic-solo/)

**User guides:** [English](docs/USER_GUIDE.en.md) · [中文](docs/USER_GUIDE.zh.md) · in-app `/help`  
**Digital Play status:** [EN](docs/CHALLENGE_IMPLEMENTATION.en.md) · [中文](docs/CHALLENGE_IMPLEMENTATION.zh.md)

## Features

| Area | Routes / entry | Summary |
| --- | --- | --- |
| Challenge Decks | `/`, `/decks/:code` | Rules + card gallery; CTAs to Challenge, Assistant, Print |
| Challenge (Digital Play) | `/challenge/:code` | Automated solo PvE; 10 curated player lists; heroes & difficulty |
| Paper Play | `/assistant/:code` | Challenge half-board for paper decks at the table |
| Classic decks | `/classic-decks` | Curated archetypes + sample lists + print PDF |
| Set gallery | `/sets` | Live Scryfall browsing + print PDF |
| Pack / collection | Header | Weighted pack, single draw, local collection + print PDF |
| Print assistant | Modal | Standard 63×88 mm proxies; auto grid on A4/A3/B4/Letter/6″; editable qty |
| Help | `/help` | In-app copy of the user guide (follows UI language) |
| Card editor | `/editor` | **In development** — nav disabled; URL shows 404 until `CARD_EDITOR_ENABLED` |
| AI Assistant | Optional | User API key: card/rules/coach assists + **Page chat** |

UI: English + 中文. Without an AI key, gameplay and layout match the non-AI site.

## Challenge decks

| Deck | Code | Expansion |
| --- | --- | --- |
| Face the Hydra | `tfth` | *Theros* |
| Battle the Horde | `tbth` | *Born of the Gods* |
| Defeat a God | `tdag` | *Journey into Nyx* |

**Challenge** player lists (curated, not full Constructed): Wildfire Host, UB Terror, Ember Barrage, Azure Skies, Pearl Trident, Akroan Legion, Nessian Wilds, Parish Host, Spectral Chorus, Bloodbraid Barrens. Challenge follows official challenge loops where implemented, but is **not** a full CR engine. Details: [user guide](docs/USER_GUIDE.en.md#3-challenge) · [implementation status](docs/CHALLENGE_IMPLEMENTATION.en.md).

## Stack

Vite 5 · React 19 · TypeScript · React Router 7 · i18next · pdf-lib · GitHub Pages

## Develop

```bash
npm install
npm run fetch:cards      # HD PNG + deck JSON
npm run fetch:display    # UI JPG + covers
npm run fetch:local      # art crops, covers, player images
npm run dev              # http://localhost:5173/magic-solo/
```

```bash
npm run build
npm run preview
npm test
```

| Script | Purpose |
| --- | --- |
| `fetch:cards` | Scryfall PNG fronts/backs → `public/assets/cards/`, manifests → `src/data/decks/` |
| `fetch:display` | Lighter JPG + box covers |
| `fetch:local` | Art crops / player muster paths |
| `fetch:classic-decks` / `generate:classic-decks` | Classic archetype data (optional) |

High-res card PNG/`*-display.jpg` under `public/assets/cards/` are gitignored; CI regenerates on deploy. Player-deck JPG faces under `public/assets/cards/player/` are tracked for Challenge.

### Layout

```
src/pages/        Routes (home, decks, challenge, assistant, sets, classic, help, editor)
src/editor/       Card editor (canvas compositor; gated by CARD_EDITOR_ENABLED)
src/game/         Challenge engine + player abilities
src/assistant/    Game Assistant state
src/print/        Print assistant layout + PDF export
src/llm/          Optional browser LLM client, page chat, cache
src/data/         Cards, rules, classic decks, Scryfall helpers
docs/             User guides (EN / ZH) — also served at /help
```

## Deploy

Repo: [kyle-ip/magic-solo](https://github.com/kyle-ip/magic-solo)

1. GitHub **Settings → Pages → Source → GitHub Actions**
2. Push `main` (or run **Deploy to GitHub Pages**)

Workflow fetches assets, builds with `BASE_PATH=/magic-solo/`, publishes `dist/`.

## Attribution

- Card data/images © Wizards of the Coast; via [Scryfall](https://scryfall.com).
- Rules adapted from [MTG Wiki — Challenge Deck](https://mtg.wiki/page/Challenge_Deck) and official Game Day materials.
- Fan project — **not affiliated with Wizards of the Coast**.
