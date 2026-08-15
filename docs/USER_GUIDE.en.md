# Magic Solo — User Guide

Fan site for the three *Magic: The Gathering* **Challenge Decks** from Theros-block Game Days, plus browsing tools and an optional AI assistant.

**Live site:** [https://kyle-ip.github.io/magic-solo/](https://kyle-ip.github.io/magic-solo/)

中文版：[用户指南](./USER_GUIDE.zh.md)

---

## Contents

1. [Getting started](#1-getting-started)
2. [Challenge Decks](#2-challenge-decks)
3. [Challenge Experience](#3-challenge-experience)
4. [Game Assistant](#4-game-assistant)
5. [Classic decks](#5-classic-decks)
6. [Set gallery](#6-set-gallery)
7. [Pack open, single draw & collection](#7-pack-open-single-draw--collection)
8. [AI Assistant](#8-ai-assistant)
9. [Notes & attribution](#9-notes--attribution)

---

## 1. Getting started

### Language

Use the header language switch for **English** or **中文**. Challenge Deck cards have no official Chinese printings; Chinese UI uses Magic Simplified Chinese terminology where needed.

### Navigation

| Control | Where | What it does |
| --- | --- | --- |
| Header links | Top | Home, Sets, Classic decks, language, pack / single draw |
| Floating buttons | Right gutter | Up one level (some pages), back to top; AI settings after a key is saved |
| Footer **Help** | Bottom | Open this user guide |
| Footer **AI Assistant** | Bottom | Open optional AI API settings |

Without an AI API key, the site works fully; AI entry points stay hidden except the small footer link used to configure a key.

---

## 2. Challenge Decks

| Deck | Code | Expansion |
| --- | --- | --- |
| Face the Hydra | `tfth` | *Theros* |
| Battle the Horde | `tbth` | *Born of the Gods* |
| Defeat a God | `tdag` | *Journey into Nyx* |

### Home (`/`)

Overview of Challenge Decks and three paths into each deck.

### Deck page (`/decks/:setCode`)

- Rules summary (expandable sections)
- Full card gallery (open a card for art, oracle text, quantity)
- Links to **Challenge Experience** and **Game Assistant**

---

## 3. Challenge Experience

Route: `/challenge/:setCode`

A simplified solo PvE board (Arena-inspired), not a full Comprehensive Rules engine.

### Setup

1. Difficulty options (e.g. starting Hydra Heads, Horde delay)
2. Optional **Hero’s Path** heroes (up to 2 vs Hydra, 3 vs Horde/God)
3. Choose a curated player Constructed list (e.g. Wildfire Host / Terror)
4. Preview the roster, then begin

### During play

- Your hand, lands, creatures, and the challenge half-board
- Challenge reveals/casts cards one by one
- Declare attackers, assign targets (where applicable), resolve combat
- Toggle **coach tips** and a floating **battle log**
- Win / loss **settlement** with match stats

### Experience vs official Challenge Decks

| Official | This Experience |
| --- | --- |
| Any Constructed deck | Curated lists; only implemented abilities fire |
| Full stack / priority | Spells resolve immediately (Fog still stops breath / combat damage) |
| All Theros mechanics | Evergreen + selected effects; monstrosity / bestow omitted |
| Multiplayer variants | Solo only |

For an arbitrary paper deck, use the [Game Assistant](#4-game-assistant) instead.

---

## 4. Game Assistant

Route: `/assistant/:setCode`

Digital **challenge half-board** while you play a physical deck offline. No turn automation.

### Setup

- **Blank library** — full shuffle
- **Rules setup** — official starting permanents (e.g. Heads)

### Controls

- Click library to blind-draw (move the staging card before drawing again)
- Drag cards between library, battlefield, graveyard, exile
- Right-click: tap, notes, library placement
- Double-click library: search / reorder / play
- Named **player values** (e.g. life)

---

## 5. Classic decks

Routes: `/classic-decks`, `/classic-decks/:id`

Curated constructed archetypes with bilingual summary, how-it-wins text, sample list, and Scryfall-backed card art. Open cards from the list for details.

---

## 6. Set gallery

Routes: `/sets`, `/sets/:code`

Browse Magic sets from Scryfall (filter by type, year, search), then open a set’s card gallery (search / rarity filters). Card data is fetched live from Scryfall. With AI configured, tick **AI** on the search field to turn natural language into a filter or Scryfall query.

---

## 7. Pack open, single draw & collection

Header shortcuts:

| Feature | What it does |
| --- | --- |
| **Pack open** | Weighted 3-card “booster” reveal; after details show, use header **Collect** (left of Collection) |
| **Single draw** | One random card flip; same header text link to collect |
| **Collection cabinet** | Save cards locally, filter/sort, import / export JSON, clear; **Collection advice** when AI is on |

Collection is stored in **this browser only** (`localStorage`). It is not synced across devices.

---

## 8. AI Assistant

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
- Answers are grounded in data the site sends (card JSON, rules JSON, board snapshot) plus a short official keyword gloss when relevant. Challenge Experience rules override full Comprehensive Rules when they conflict. Answers can still be wrong—prefer [Wizards Rules](https://magic.wizards.com/en/rules) / printed oracle when it matters.
- You pay your provider for usage; caching reduces repeat cost.

---

## 9. Notes & attribution

- Card data and images © Wizards of the Coast; served via [Scryfall](https://scryfall.com).
- Challenge rules adapted from [MTG Wiki — Challenge Deck](https://mtg.wiki/page/Challenge_Deck) and official Game Day materials.
- Fan project — **not affiliated with Wizards of the Coast**.

For local development and contributing, see the repository [README](../README.md).
