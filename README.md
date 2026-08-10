# Magic Solo — Challenge Decks

Solo web recreation of the three *Magic: The Gathering* Challenge Decks from Theros-block Game Days — Face the Hydra (*Theros*), Battle the Horde (*Born of the Gods*), and Defeat a God (*Journey into Nyx*) — with deck archives, card art, rules, a simplified PvE **Challenge Experience**, and a **Game Assistant** for mixed online/offline play.

**Live site:** [https://kyle-ip.github.io/magic-solo/](https://kyle-ip.github.io/magic-solo/)

## Challenge decks

| Deck | Code | Expansion | Card backs |
| --- | --- | --- | --- |
| **Face the Hydra** | `tfth` | *Theros* | Green |
| **Battle the Horde** | `tbth` | *Born of the Gods* | Red |
| **Defeat a God** | `tdag` | *Journey into Nyx* | Indigo |

*Theros Beyond Death* did not include a Challenge Deck ([MTG Wiki](https://mtg.wiki/page/Challenge_Deck)).

Each deck page includes card fronts/backs (via Scryfall), oracle text, decklist quantities, and rules summarized from MTG Wiki and official Wizards Game Day materials.

## Features

- **Home** — hero intro, three challenge paths, shared Challenge Deck overview
- **Deck pages** (`/decks/:setCode`) — rules + card gallery, with entries for **Challenge Experience** and **Game Assistant**
- **Challenge Experience** (`/challenge/:setCode`) — full automated PvE board (see below)
- **Game Assistant** (`/assistant/:setCode`) — challenge half-board for offline player decks (see below)
- **i18n** — English + 中文 (header language switch)
- **Floating nav** — back-to-top (and home on deck pages), parked in the page gutter so it does not cover content

## Challenge Experience

Route: `/challenge/:setCode`

An MTG Arena–inspired board with:

- Mirrored battlefields, life / library chrome, phase strip, and real hand dock
- Challenge turns that reveal and cast cards one-by-one (localized oracle text)
- Click-to-declare combat, attack arrows, and light combat VFX
- Optional **Hero’s Path** heroes at setup (up to 2 vs Hydra, 3 vs Horde/God)
- Optional coach tips and a floating battle log
- Win / loss **settlement screen** (turns, life, board / graveyard summary)

Players use one **Theros-era red-green Constructed deck** (`wildfire` / Wildfire Host) for all three challenges — lands, mana, library, hand, and deck-driven abilities (not a full CR engine). Preview the 60-card list on the setup screen.

### Experience vs official rules

Challenge-side loops (setup, cast cadence, Hydra grow/breath, Horde mill-as-life, God reveler lock, Hero’s Rewards) follow the official Challenge Deck rules summarized under **References**. Intentional Experience differences:

| Official | Experience |
| --- | --- |
| Any Constructed deck | Curated RG 60-card list (abilities implemented only for cards in that list) |
| Full stack / priority | Spells resolve immediately; Fog still stops Hydra breath / combat damage |
| All Theros mechanics | Evergreen + Fog, burn, fight, pumps; monstrosity / bestow omitted |
| Multiplayer variants | Solo only |
| Hero cards optional | Optional curated Hero’s Path set with simplified effects |

Use **Game Assistant** when you want an arbitrary physical player deck with a manual challenge half-board.

## Game Assistant

Route: `/assistant/:setCode`

For players who use a physical deck offline while the Challenge Deck runs online:

- Shows only the **challenge** half-board: library, battlefield, graveyard, exile
- Setup: **blank library** (full shuffle) or **rules setup** (official starting permanents)
- Manual operations via pointer — no turn automation
  - Click library to blind-draw (staging card must be dragged away)
  - Drag between zones (library drop = bottom by default)
  - Right-click for tap / notes / library moves
  - Double-click library to search, reorder, or play any card
- Custom **player values** and per-card **notes**

## Stack

- Vite 5 + React 19 + TypeScript
- React Router 7
- i18next (default English, Chinese UI + rules)

## Project layout

```
src/
  pages/           Home, deck archive, challenge arena, assistant
  components/      Header, rules, cards, floating nav, arena / assistant chrome
  game/            Challenge Experience engine (hydra / horde / god)
  assistant/       Game Assistant state machine (manual zones)
  data/cards/      ★ Edit card copy + image paths here (challenge + player)
  data/decks/      Deck manifests / metadata (from Scryfall fetch)
  data/rules/      EN + ZH rules JSON
  i18n/            UI strings + battle-log messages
scripts/           Scryfall / cover / local asset fetchers
.github/workflows/ GitHub Pages deploy
```

Card text and art paths for challenge decks and muster forces live under [`src/data/cards/`](src/data/cards/README.md).

## Setup

```bash
npm install
npm run fetch:cards     # HD PNG fronts/backs + deck JSON
npm run fetch:display   # lighter JPG for UI + official box covers
npm run fetch:local     # art crops, covers, player muster deck images
npm run dev
```

Open `http://localhost:5173/magic-solo/` (base path matches GitHub Pages).

## Build

```bash
npm run build
npm run preview
```

## Deploy (GitHub Pages)

Repo: [`kyle-ip/magic-solo`](https://github.com/kyle-ip/magic-solo)

1. **Settings → Pages → Source → GitHub Actions**
2. Push to `main` (or run **Deploy to GitHub Pages** from Actions)

The workflow runs `fetch:cards`, `fetch:display`, and `fetch:local`, then builds with `BASE_PATH=/magic-solo/` and publishes `dist/`.

Site URL: `https://kyle-ip.github.io/magic-solo/`

## Assets

| Script | What it does |
| --- | --- |
| `npm run fetch:cards` | Scryfall PNG fronts/backs → `public/assets/cards/{set}/`, manifests → `src/data/decks/` |
| `npm run fetch:display` | Large JPG UI images + official box covers |
| `npm run fetch:local` | Art crops, cover paths, player muster images → local paths |

High-res PNG fronts and `*-display.jpg` under `public/assets/cards/` are gitignored; regenerate locally or let CI fetch them. Art crops and player muster JPGs are committed (or rewritten as local paths in deck JSON / `playerDecks.ts`).

### Language

Default UI is English. Switch to 中文 in the header. Challenge Deck cards have **no official Chinese printing**, so card/rules Chinese uses official Magic Simplified Chinese terminology (e.g. 战场、坟场、英雄赏赐).

## Attribution

- Card data and images © Wizards of the Coast; imagery hosted/served via [Scryfall](https://scryfall.com).
- Rules text adapted from [MTG Wiki — Challenge Deck](https://mtg.wiki/page/Challenge_Deck) and official Challenge Deck / Game Day materials.
- This project is a fan recreation and is not affiliated with Wizards of the Coast.
