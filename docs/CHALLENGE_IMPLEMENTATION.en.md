# Digital Play & Player Decks — Implementation Status

> Maintainer snapshot (2026-08). Covers **ten curated player lists** vs the **three Challenge Decks** at `/challenge/:setCode`.  
> Player-facing overview: [User Guide · Challenge](./USER_GUIDE.en.md#3-challenge).  
> 中文：[CHALLENGE_IMPLEMENTATION.zh.md](./CHALLENGE_IMPLEMENTATION.zh.md)

## Product boundary

| In scope | Out of scope |
| --- | --- |
| Official Challenge Deck loops (Hydra / Horde / God) | Full Comprehensive Rules / Arena opponent |
| Playable site Constructed lists; abilities as close to print as practical | Import arbitrary classic-deck lists into battle |
| Full play without an AI key | Real stack, priority, continuous layers |

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

All three challenges share these lists. Roster **Simplified** badges mark cards whose print text is approximated (see `(Challenge:…)` notes on the card).

Rebuild: `node scripts/build-player-deck.mjs <id>`

---

## Engine capabilities (implemented)

### Evergreen & combat

- Haste, flash, vigilance, lifelink, prowess, deathtouch, reach / flying blocking  
- **First / double strike** as combat damage steps (not ×2 power)  
- **Trample** (player): excess — Hydra → another Head; God → Xenagos; Horde → continue milling  
- Anthems: flyers, creature type, other creatures  

### Casting & interaction

- Lands, mana pool, auto-tap payment, sorcery-speed limits (simplified timing)  
- Burn-to-any, Fog, fight, pump, destroy, bounce (challenge creature → top of challenge library)  
- Mill / draw, scry, brainstorm, flashback, delve discount, Terror discount  
- Edict, Fangs, Crawl from the Cellar, Fallaji mill-loot (else +1/+1 counter)  

### Theros / Constructed keywords

- **Bestow**: attach + falloff to creature on host death; bestow targets fire **heroic**  
- **Heroic** / **bloodrush** / **battalion** / **Parish counters** / **Human lieutenant**  
- **Monstrosity** (double-click pay; optional destroy flyer / fight)  
- **Persist** (Kitchen Finks)  
- **Scavenging Ooze**: `{G}` activate exile from a graveyard (prefers challenge GY)  
- **Maelstrom Pulse**: same-name wipe on challenge creatures  
- Spirit ETB pump, Spirits-have-flash, Silvergill surcharge, Merfolk lords, etc.  

### Challenge half-board

| Challenge | Status |
| --- | --- |
| Face the Hydra (`tfth`) | Heads, breath, Hide, Hero's Reward, Swallow, elite triggers wired |
| Battle the Horde (`tbth`) | Delay, mill, Horde casts; combat more abstract than player combat |
| Defeat a God (`tdag`) | Xenagos / Revelers, blockers & trample; Impulsive Destruction adapted for Constructed |

Tests: `src/game/__tests__/rulesFidelity.test.ts`, `playerAbilities.test.ts`

---

## Per-deck coverage & honest gaps

Legend: **Solid** ≈ core list effects wired; **Approx** = remaining print approximations (noted on cards).

| Deck | Coverage | Typical remaining approximations |
| --- | --- | --- |
| Wildfire Host | Solid | Fixed monstrosity costs; land-sac / protection triggers omitted on some dragons |
| UB Terror | Solid | Bounce has no challenge “hand” |
| Ember Barrage | Solid | Guide land → library bottom (not hand); burn targeting slightly loose |
| Azure Skies | Solid + approx | Journey / Banishing ≈ destroy; no return-when-leaves |
| Pearl Trident | Solid + approx | Islandwalk omitted; Trickster lose-abilities approx; bounce → library top |
| Akroan Legion | Solid | Bestow / heroic wired; Journey-style still destroy-approx |
| Nessian Wilds | Solid | — |
| Parish Host | Solid + approx | Investigate ≈ ETB draw; protection from multicolored omitted |
| Spectral Chorus | Solid + approx | No stack counter; Rattlechains ETB hexproof omitted |
| Bloodbraid Barrens | Solid + approx | Cascade ≈ ETB draw 1; Goyf sticky +2/+2 CDA approx |

---

## Intentionally not built (needs full CR)

- Real stack, priority, soft-counter windows  
- Full continuous layers / Goyf card-type CDA  
- Full cascade (exile and cast in order)  
- Clue token economy, real protection / hexproof prevention  
- Launching `/classic-decks` lists straight into Digital Play  

---

## Code map

| Area | Path |
| --- | --- |
| Deck registry / `PlayerEffect` | `src/game/playerDecks.ts` |
| Cast & activate | `src/game/playerCast.ts` |
| Anthems / blocking / can-activate | `src/game/playerAbilities.ts` |
| Bestow / heroic helpers | `src/game/playerExtras.ts` |
| Death (bestow falloff, persist) | `src/game/helpers.ts` → `buryPlayerCreatures` |
| Player combat | `src/game/combat.ts` |
| Simplified badge detection | `src/game/simplifiedOracle.ts` |

---

## When updating

If site player lists or Digital Play rules change in a user-visible way:

1. Update this file and the Chinese counterpart  
2. Sync [USER_GUIDE.en.md](./USER_GUIDE.en.md) / [USER_GUIDE.zh.md](./USER_GUIDE.zh.md)  
3. Refresh README blurbs and `src/data/cards/README.md` when needed
