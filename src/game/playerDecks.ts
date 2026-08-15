import type { ManaColor } from './mana'
import type { ChallengeCode } from './types'
import wildfire from '../data/cards/player/wildfire.json'
import terror from '../data/cards/player/terror.json'
import burn from '../data/cards/player/burn.json'
import skies from '../data/cards/player/skies.json'

export type PlayerDeckId = 'wildfire' | 'terror' | 'burn' | 'skies'

export type PlayerDeckArchetype = 'aggro' | 'midrange' | 'control' | 'tempo'

export type PlayerCardKind = 'land' | 'creature' | 'instant' | 'sorcery'

export type PlayerEffect =
  | { type: 'none' }
  | { type: 'mana_dork'; color: ManaColor }
  | { type: 'etb_self_pump'; power: number; toughness: number }
  | { type: 'damage_any'; amount: number }
  | { type: 'fog' }
  | { type: 'fight' }
  | { type: 'pump_target'; power: number; toughness: number }
  | { type: 'mill_draw'; mill: number; draw: number; target?: 'self' }
  | { type: 'brainstorm' }
  | { type: 'draw'; amount: number }
  | { type: 'scry_draw'; scry: number; draw: number }
  | { type: 'destroy_creature'; nonlegendary?: boolean }
  | { type: 'edict' }
  | { type: 'fangs' }
  | { type: 'crawl_cellar' }
  | { type: 'etb_mill_loot'; mill: number }
  | { type: 'etb_miscreant_draw' }
  | { type: 'terror_discount' }
  | { type: 'delve' }
  | { type: 'etb_gain_life'; amount: number }
  | { type: 'etb_exile_opp_graveyard' }
  | { type: 'activate_sac_damage'; amount: number }
  | { type: 'activate_draw'; manaCost: string; amount: number }
  | { type: 'anthem_other_flyers'; power: number; toughness: number }
  | { type: 'attack_guide' }

export interface FlashbackSpec {
  manaCost: string
  payLife?: number
}

export interface ConstructedCardDef {
  id: string
  quantity: number
  name: string
  nameZh: string
  typeLine: string
  typeLineZh: string
  oracleText: string
  oracleTextZh: string
  manaCost: string
  cmc: number
  power: number | null
  toughness: number | null
  keywords: string[]
  kind: PlayerCardKind
  produces?: ManaColor[]
  effect: PlayerEffect
  flashback?: FlashbackSpec
  image: string
}

export interface PlayerDeckHintByChallenge {
  en: string
  zh: string
}

export interface PlayerDeckDef {
  id: PlayerDeckId
  name: string
  nameZh: string
  blurb: string
  blurbZh: string
  art: string
  colors: ManaColor[]
  archetype: PlayerDeckArchetype
  hint: string
  hintZh: string
  hintByChallenge?: Partial<Record<ChallengeCode, PlayerDeckHintByChallenge>>
  cards: ConstructedCardDef[]
}

/** Source of truth: `src/data/cards/player/*.json` */
export const PLAYER_DECKS: PlayerDeckDef[] = [
  wildfire as PlayerDeckDef,
  terror as PlayerDeckDef,
  burn as PlayerDeckDef,
  skies as PlayerDeckDef,
]

export const DEFAULT_PLAYER_DECK: PlayerDeckId = 'wildfire'

export function getPlayerDeck(id?: string | null): PlayerDeckDef {
  return PLAYER_DECKS.find((d) => d.id === id) ?? PLAYER_DECKS[0]
}

export function getDeckCards(deckId?: string | null): ConstructedCardDef[] {
  return getPlayerDeck(deckId).cards
}

export function getDeckCardCount(deckId?: string | null): number {
  return getDeckCards(deckId).reduce((s, c) => s + c.quantity, 0)
}

/** Static play tip for the current challenge (no scoring). */
export function getDeckHint(
  deckId: string | null | undefined,
  code: ChallengeCode,
  zh: boolean,
): string {
  const deck = getPlayerDeck(deckId)
  const override = deck.hintByChallenge?.[code]
  if (override) return zh ? override.zh : override.en
  return zh ? deck.hintZh : deck.hint
}

export function findCardDef(
  defId: string,
  deckId?: string | null,
): ConstructedCardDef | undefined {
  const preferred = getDeckCards(deckId).find((c) => c.id === defId)
  if (preferred) return preferred
  for (const deck of PLAYER_DECKS) {
    const hit = deck.cards.find((c) => c.id === defId)
    if (hit) return hit
  }
  return undefined
}

export function findCardDefByName(name: string): ConstructedCardDef | undefined {
  for (const deck of PLAYER_DECKS) {
    const hit = deck.cards.find((c) => c.name === name)
    if (hit) return hit
  }
  return undefined
}

/** Unique card defs in deck order (for setup preview). */
export function getUniqueCards(deckId?: string | null): ConstructedCardDef[] {
  return getDeckCards(deckId)
}

/** Mana curve buckets: cmc 0..6 and 7+ (index 7). Lands excluded. */
export function getManaCurve(deckId?: string | null): number[] {
  const buckets = [0, 0, 0, 0, 0, 0, 0, 0]
  for (const c of getDeckCards(deckId)) {
    if (c.kind === 'land') continue
    const idx = c.cmc >= 7 ? 7 : Math.max(0, Math.floor(c.cmc))
    buckets[idx] += c.quantity
  }
  return buckets
}

export type DeckListGroupId = 'creatures' | 'spells' | 'lands'

export function groupDeckList(deckId?: string | null): {
  id: DeckListGroupId
  cards: ConstructedCardDef[]
}[] {
  const creatures: ConstructedCardDef[] = []
  const spells: ConstructedCardDef[] = []
  const lands: ConstructedCardDef[] = []
  for (const c of getDeckCards(deckId)) {
    if (c.kind === 'land') lands.push(c)
    else if (c.kind === 'creature') creatures.push(c)
    else spells.push(c)
  }
  const byCmcThenName = (a: ConstructedCardDef, b: ConstructedCardDef) =>
    a.cmc - b.cmc || a.name.localeCompare(b.name)
  creatures.sort(byCmcThenName)
  spells.sort(byCmcThenName)
  lands.sort((a, b) => a.name.localeCompare(b.name))
  return [
    { id: 'creatures', cards: creatures },
    { id: 'spells', cards: spells },
    { id: 'lands', cards: lands },
  ]
}

/** Top non-land cards by CMC for a small featured strip. */
export function getFeaturedCards(
  deckId?: string | null,
  limit = 4,
): ConstructedCardDef[] {
  return [...getDeckCards(deckId)]
    .filter((c) => c.kind !== 'land')
    .sort((a, b) => b.cmc - a.cmc || b.quantity - a.quantity)
    .slice(0, limit)
}

/** @deprecated muster roster helpers — use getDeckCards / findCardDef */
export type PlayerTemplate = ConstructedCardDef
export function getRoster(deckId?: string | null): ConstructedCardDef[] {
  return getDeckCards(deckId)
}
export function findTemplate(
  templateId: string,
  deckId?: string | null,
): ConstructedCardDef | undefined {
  return findCardDef(templateId, deckId)
}
export function findTemplateByName(name: string): ConstructedCardDef | undefined {
  return findCardDefByName(name)
}
export function musterForTurn(_turnNumber: number): number {
  return 0
}

/** @deprecated */
export const ROSTER: ConstructedCardDef[] = []
/** @deprecated use getDeckCards(DEFAULT_PLAYER_DECK) */
export const PLAYER_ROSTER: ConstructedCardDef[] = getDeckCards(DEFAULT_PLAYER_DECK)
