# Magic Solo — User Guide

Fan site for the three *Magic: The Gathering* **Challenge Decks** from Theros-block Game Days, plus browsing tools, a print assistant, and an optional AI assistant.

**Live site:** [https://kyle-ip.github.io/magic-solo/](https://kyle-ip.github.io/magic-solo/)

中文版：[用户指南](./USER_GUIDE.zh.md)

---

## Contents

1. [Getting started](#1-getting-started)
2. [Challenge Decks](#2-challenge-decks)
3. [Challenge](#3-challenge)
4. [Game Assistant](#4-game-assistant)
5. [Classic decks](#5-classic-decks)
6. [Set gallery](#6-set-gallery)
7. [Pack open, single draw & collection](#7-pack-open-single-draw--collection)
8. [Print assistant](#8-print-assistant)
9. [Card editor](#9-card-editor)
10. [AI Assistant](#10-ai-assistant)
11. [Notes & attribution](#11-notes--attribution)

Maintainer detail for Digital Play coverage: [Challenge implementation status](./CHALLENGE_IMPLEMENTATION.en.md).

---

## 1. Getting started

### Language

Use the header language switch for **English** or **中文**. Challenge Deck cards have no official Chinese printings; Chinese UI uses Magic Simplified Chinese terminology where needed.

### Navigation

| Control | Where | What it does |
| --- | --- | --- |
| Brand / logo | Header | Home (`/`) |
| Classic decks / Sets | Header | Browse archetypes and Scryfall sets |
| Card editor | Header | Grayed out while in development (see [§9](#9-card-editor)) |
| Challenges | Header | Jump to a Challenge Deck hub (`/decks/:code`) |
| Pack open / Single draw | Header | Local pack and random-card toys; collect from those flows |
| Language | Header | English ↔ 中文 |
| Floating buttons | Right gutter | Up one level (some pages), back to top; after an AI key: settings + **Page chat** |
| Footer **Help** | Bottom | Open this guide in-app (`/help`; follows UI language) |
| Footer **References** | Bottom | Official-source / rules reference modal |
| Footer **AI Assistant** | Bottom | Open optional AI API settings |
| Footer **Chat** | Bottom | **Page chat** (only after a key is saved) |

Without an AI API key, the site works fully; AI entry points stay hidden except the small footer link used to configure a key.

---

## 2. Challenge Decks

| Deck | Code | Expansion |
| --- | --- | --- |
| Face the Hydra | `tfth` | *Theros* |
| Battle the Horde | `tbth` | *Born of the Gods* |
| Defeat a God | `tdag` | *Journey into Nyx* |

### Home (`/`)

Overview of the three Challenge Decks; links go to each deck hub.

### Deck page (`/decks/:setCode`)

- Rules summary (expandable sections)
- Full card gallery (open a card for art, oracle text, quantity)
- Links to **Digital Play** (Challenge) and **Paper Play** (Game Assistant half-board)
- **Print assistant** for the deck catalog, expanding each card by its quantity (see [§8](#8-print-assistant))
- Use the header **Challenges** menu or return to this hub to open a sibling challenge

---

## 3. Challenge

Route: `/challenge/:setCode`

A simplified solo PvE board (Arena-inspired), not a full Comprehensive Rules engine.

### Setup

1. **Difficulty**
   - Hydra: starting Heads **1–4**
   - Horde: delay **2–4** turns before the Horde advances
   - God: no difficulty slider
2. Optional **Hero’s Path** heroes (up to **2** vs Hydra, **3** vs Horde/God): Protector, Warrior, Hunter, Avenger, Slayer, Provider, Vanquisher, Champion
3. Choose a curated player Constructed list (see below)
4. Preview the roster, then begin (optional setup AI advice when configured)

### Player decks

| Id | Name | Colors / role |
| --- | --- | --- |
| `wildfire` | Wildfire Host | RG midrange |
| `terror` | UB Terror | UB tempo (delve / Terror-style removal) |
| `burn` | Ember Barrage | R aggro / burn |
| `skies` | Azure Skies | WU flyers + removal |
| `merfolk` | Pearl Trident | U tribal tempo / lords |
| `akroan` | Akroan Legion | WR soldiers (first strike) |
| `nessian` | Nessian Wilds | G beasts (reach / trample) |
| `humans` | Parish Host | W Human tribal |
| `spirits` | Spectral Chorus | WU Spirit flyers |
| `jund` | Bloodbraid Barrens | BRG midrange |

Only **implemented** abilities fire (supported evergreen today: haste, flash, vigilance, lifelink, prowess, flyer anthem, type anthem, flying/reach blocking, deathtouch, **first / double strike as combat damage steps**; player-side **trample** spills excess — Hydra → another Head, God → Xenagos, Horde → continue milling. Also Fog, fight, burn-to-any, mill/draw, flashback, delve discount, attack-reveal triggers, attack pump per attacker, battalion, Parish counters, limited monstrosity activation, **bestow** (attach + falloff to creature), **heroic** (including spells that bestow onto the creature), Persist, Scavenge Ooze activate, Maelstrom Pulse same-name wipe, and choice prompts). Many printed cards are still approximated (roster **Simplified** badge). Azure Skies uses white removal you can actually pay with W/U mana.

### During play

- Your hand, lands, creatures, and the challenge half-board
- Challenge reveals/casts cards one by one
- Declare attackers, assign targets (where applicable), resolve combat (first-strike step → normal damage step)
- Toggle **coach tips** and a floating **battle log**
- Win / loss **settlement** with match stats (and optional AI battle report)
- Leave to the deck hub or use header **Challenges** (when chrome is visible) to open another challenge

### Challenge vs official Challenge Decks

| Official | This Challenge |
| --- | --- |
| Any Constructed deck | Ten curated lists; only implemented abilities fire |
| Full stack / priority | Spells resolve immediately (Fog still stops breath / combat damage) |
| All Theros mechanics | Evergreen + selected effects (bestow attach/falloff, heroic, limited monstrosity) |
| Multiplayer variants | Solo only |

For an arbitrary paper deck, use the [Game Assistant](#4-game-assistant) instead.

**Implementation inventory** (what each list wires vs still approximates): [CHALLENGE_IMPLEMENTATION.en.md](./CHALLENGE_IMPLEMENTATION.en.md).

---

## 4. Game Assistant (Paper Play)

Route: `/assistant/:setCode`

**Paper Play** mode: digital **challenge half-board** while you play a physical deck at the table. No turn automation. Header/footer chrome is hidden on the play surface.

### Setup

- **Blank library** — full shuffle
- **Rules setup** — official starting permanents (e.g. Heads)

### Controls

- Click library to blind-draw (move the staging card before drawing again)
- Drag cards between library, battlefield, graveyard, exile
- Right-click or long-press: tap, ±damage, ±P/T, notes, zone moves
- Double-click library: search / reorder / play
- Named **player values** (e.g. life)
- Collapsible **Challenge procedure** checklist (no AI required)
- **Reset** returns to setup
- Return to the deck hub or use header **Challenges** to open another mode
- With AI configured: **Suggest next step** from the board + challenge rules (clears when the board changes)

---

## 5. Classic decks

Routes: `/classic-decks`, `/classic-decks/:id`

Curated constructed archetypes (dozens of lists across formats) with bilingual summary, how-it-wins text, sample list, and Scryfall-backed card art. Open cards from the list for details. On a deck detail page, **Print assistant** exports the full sample list (main + side) with each row’s **qty** expanded into separate faces (see [§8](#8-print-assistant)). With AI configured, use the classic-deck assist for deeper overview or comparisons.

---

## 6. Set gallery

Routes: `/sets`, `/sets/:code`

Browse Magic sets from Scryfall (filter by type, year, search), then open a set’s card gallery (search / rarity filters). Card data is fetched live from Scryfall. With AI configured, tick **AI** on the search field to turn natural language into a filter or Scryfall query.

**Print assistant** on a set page exports **all** cards in that set as a PDF (see [§8](#8-print-assistant)).

---

## 7. Pack open, single draw & collection

Header shortcuts:

| Feature | What it does |
| --- | --- |
| **Pack open** | Weighted 3-card “booster” reveal; after details show, use header **Collect** (left of Collection) |
| **Single draw** | One random card flip; same header text link to collect |
| **Collection cabinet** | Opened from pack / single-draw flows: save cards locally, filter/sort, import / export JSON, clear; **Print assistant**; **Collection advice** when AI is on |

Collection is stored in **this browser only** (`localStorage`). It is not synced across devices.

---

## 8. Print assistant

Client-side PDF export for cutting physical-size proxies. Opens from:

| Where | What gets printed |
| --- | --- |
| Challenge deck page (`/decks/:code`) | All cards in that challenge catalog, **expanded by quantity** (e.g. ×4 prints four faces) |
| Classic deck detail (`/classic-decks/:id`) | Full sample list (main + side), **expanded by each row’s qty** |
| Set gallery (`/sets/:code`) | Every card in the set (paginates Scryfall until complete; one face per unique print) |
| Collection cabinet | Every card currently saved in the local collection |

### Paper & layout

| Option | Page size (portrait base) | Layout |
| --- | --- | --- |
| **A4** | 210×297 mm | Auto cols/rows from margins, spacing, and card size; picks portrait or landscape |
| **A3** | 297×420 mm | Same |
| **B4** | 257×364 mm | Same |
| **Letter** | 215.9×279.4 mm | Same |
| **6″ photo** | 102×152 mm (4R) | Same (usually one card per page) |

Default card size is standard MTG **63×88 mm** with **1 mm bleed** (art extends slightly past cut marks for easier trimming). Advanced settings expose width/height (defaulting to 63×88), margins, spacing, bleed, fill empty slots, and **flush cut**. Default **7 mm** paper margins and **0** card gap, centered grid, with **cut marks**. In the modal you can edit quantities, remove cards, and reorder. Front faces only (no automatic backs / double-faced backs).

When printing, use **Actual size / 100%** — **Fit to page** shrinks every card. After export you can **Print** in the browser, **Save** the PDF, or **Share** when the OS supports it.

Images for on-screen preview use Scryfall **normal** (~488×680 JPEG); the exported PDF embeds Scryfall **png** (~745×1040). The modal shows load progress and a live preview of the sheet layout. Paper/layout prefs persist locally; the card list does not.

Large sets take longer (especially 6″ mode). Work stays in the browser; nothing is uploaded to a print server.

---

## 9. Card editor

Route: `/editor`

A visual Magic-style card face compositor (frames, art, bilingual text, PNG / JSON export, print hand-off, Scryfall import) is **under development**.

**Current status:** unavailable in the live UI.

- The header **Card Editor** control is grayed out and not clickable.
- Opening `/editor` directly shows the **404** page (same as other unknown paths).
- When ready to ship, maintainers can flip `CARD_EDITOR_ENABLED` in [`src/features.ts`](../src/features.ts).

---

## 10. AI Assistant

Optional. The site never ships a shared API key. You bring your own OpenAI-compatible endpoint.

### Enable AI

1. Open **AI Assistant** in the site footer (or the key button in the floating nav after a key is saved).
2. Enter:
   - **API base URL** (e.g. `https://api.openai.com/v1` or a CORS-friendly proxy)
   - **API key**
   - **Model** name
3. Save, then optionally **Test connection**.

**Important:** Most official APIs block browser CORS. Use an endpoint that allows browser calls, or your own proxy. The key stays in this browser and is sent only to the URL you enter.

With no key configured, layouts and gameplay match the non-AI site (AI feature chrome is not shown).

### Where AI appears (only after a key is set)

| Area | Capabilities |
| --- | --- |
| **Page chat** | Route-aware Q&A from footer **Chat** or floating nav; uses a short page brief + visible cards |
| **Card details** (decks, sets, pack, collection) | Plain explanation, keywords, ask a question, terminology (ZH UI), collection synergy |
| **Deck rules** | “Explain in 30 seconds”, free-form rules Q&A |
| **Challenge setup** | Advice for difficulty / heroes / deck choice |
| **Challenge play** | Board-aware coach tips (when Tips are on) |
| **Settlement** | Battle report (+ regenerate), ask about the match |
| **Game Assistant** | “Suggest next step” from board + challenge rules |
| **Classic deck detail** | Deeper overview, compare with another archetype |
| **Sets / set gallery** | Optional **AI** on the shared search field → filter or Scryfall query (+ card results in gallery) |
| **Collection cabinet** | Whole-collection advice (same row as export / import / clear) |

### Caching

Stable answers (card text, rules, archetypes, same question, etc.) are **cached on this device** with no expiry, keyed by content + model/API base. Changing model or base URL uses a separate cache. Clear cache from AI settings. **Regenerate battle report** forces a fresh request.

### Limits

- AI does **not** replace the game rules engine or auto-play turns.
- Answers are grounded in data the site sends (card JSON, rules JSON, board snapshot, page brief) plus a short official keyword gloss when relevant. Challenge rules override full Comprehensive Rules when they conflict. Answers can still be wrong—prefer [Wizards Rules](https://magic.wizards.com/en/rules) / printed oracle when it matters.
- You pay your provider for usage; caching reduces repeat cost.

---

## 11. Notes & attribution

- Card data and images © Wizards of the Coast; served via [Scryfall](https://scryfall.com).
- Challenge rules adapted from [MTG Wiki — Challenge Deck](https://mtg.wiki/page/Challenge_Deck) and official Game Day materials.
- Fan project — **not affiliated with Wizards of the Coast**.

For local development and contributing, see the repository [README](../README.md).
