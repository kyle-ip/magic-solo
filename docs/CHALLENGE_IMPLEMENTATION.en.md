# Digital Play & Player Decks — Implementation Status

> Maintainer snapshot (2026-08). Covers **ten curated player lists** vs the **three Challenge Decks** at `/challenge/:setCode`.  
> Player-facing overview: [User Guide · Challenge](./USER_GUIDE.en.md#3-challenge).  
> 中文：[CHALLENGE_IMPLEMENTATION.zh.md](./CHALLENGE_IMPLEMENTATION.zh.md)

## Product boundary

| In scope | Out of scope |
| --- | --- |
| Official Challenge Deck loops; print-faithful mechanics for curated lists | Full Arena / arbitrary deck import |
| Planeswalkers, enchantments, Clues, limited stack | Full Commander; default multiplayer Challenge |
| Full play without an AI key | Universal oracle interpreter; full layers 1–7 |

Data: `src/data/cards/player/*.json` · Engine: `src/game/` · Challenge half: `hydra.ts` / `horde.ts` / `god.ts`

---

## Player decks

| Id | Name | Colors / role | File |
| --- | --- | --- | --- |
| `wildfire` | Wildfire Host | RG midrange | `player/wildfire.json` |
| `terror` | UB Terror | UB tempo | `player/terror.json` |
| `burn` | Ember Barrage | R aggro / burn | `player/burn.json` |
| `skies` | Azure Skies | WU flyers | `player/skies.json` |
| `merfolk` | Pearl Trident | U Merfolk | `player/merfolk.json` |
| `akroan` | Akroan Legion | WR soldiers | `player/akroan.json` |
| `nessian` | Nessian Wilds | G beasts | `player/nessian.json` |
| `humans` | Parish Host | W Humans | `player/humans.json` |
| `spirits` | Spectral Chorus | WU Spirits | `player/spirits.json` |
| `jund` | Bloodbraid Barrens | BRG midrange | `player/jund.json` |

Selected planeswalkers appear in **all ten** curated lists (at least one each). **Simplified** badges mark remaining honest approximations.

Rebuild: `node scripts/build-player-deck.mjs <id>`

---

## Engine capabilities (implemented)

### Turns & cleanup

- Opening **mulligan** (London rule); end-of-turn discard to **7**
- UI phases remain main / combat / end; FS/DS damage steps internally

### Limited stack

- Challenge spells enter the stack; player priority: **Pass** / **Mausoleum Wanderer counter** / **cast Fog** (auto-resolves when Pass is the only option)
- Not full priority passing; challenge side passes by default

### Evergreen & combat

- Haste, flash, vigilance, lifelink, prowess, deathtouch, reach / flying, islandwalk (keyword; no Island → inert)
- First / double strike steps; trample spill; Horde combat aligned with FS/deathtouch
- Protection from multicolored; temp hexproof (e.g. Rattlechains)

### Permanents

- Land / creature / instant / sorcery / **enchantment** / **artifact (Clue)** / **planeswalker**
- Journey / Banishing: **linked exile**
- Clue: `{2}`, sac, draw
- Planeswalkers: loyalty, one activation/turn, damage → loyalty, ≤0 to GY
- **Legendary rule**; **Goyf** GY-type CDA; **cascade**

### Challenge half-board

| Challenge | Status |
| --- | --- |
| Face the Hydra (`tfth`) | Heads, breath, Hide, Hero's Reward, Swallow, elites |
| Battle the Horde (`tbth`) | Delay, mill; combat with FS/deathtouch steps |
| Defeat a God (`tdag`) | Xenagos / Revelers, blockers & trample |

Tests under `src/game/__tests__/`.

---

## Per-deck coverage & honest gaps

| Deck | Coverage | Typical remaining notes |
| --- | --- | --- |
| Wildfire Host | Solid | Some dragon extras omitted; Polukranos auto-max X |
| UB Terror | Solid | Bounce → challenge library top |
| Ember Barrage | Solid | Guide land → library bottom (no challenge hand) |
| Azure Skies | Solid | — |
| Pearl Trident | Solid | Bounce → library top; Trickster approx |
| Akroan Legion | Solid | — |
| Nessian Wilds | Solid | — |
| Parish Host | Solid | Multicolor cast life trigger weak |
| Spectral Chorus | Solid | Counter only on challenge reveal window |
| Bloodbraid Barrens | Solid | — |

---

## Intentionally not built

- Import `/classic-decks` into Digital Play  
- Full Commander; default multiplayer Challenge  
- Full layers 1–7; universal Counterspell ecology  
- Destructive UI / layout rewrites  

---

## Code map

| Area | Path |
| --- | --- |
| Deck registry / `PlayerEffect` | `src/game/playerDecks.ts` |
| Cast / activate | `src/game/playerCast.ts` |
| Limited stack | `src/game/stack.ts` |
| Cascade / Goyf / legend | `src/game/cascadeGoyf.ts` |
| Horde combat | `src/game/horde.ts` |
| Simplified badge | `src/game/simplifiedOracle.ts` |

---

## Update checklist

When player-visible Challenge behavior changes:

1. Update this file and the ZH twin  
2. Sync USER_GUIDE EN/ZH  
3. README / `src/data/cards/README.md` if needed
