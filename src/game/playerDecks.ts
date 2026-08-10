import type { ManaColor } from './mana'
import wildfire from '../data/cards/player/wildfire.json'

export type PlayerDeckId = 'wildfire'

export type PlayerCardKind = 'land' | 'creature' | 'instant' | 'sorcery'

export type PlayerEffect =
  | { type: 'none' }
  | { type: 'mana_dork'; color: ManaColor }
  | { type: 'etb_self_pump'; power: number; toughness: number }
  | { type: 'damage_any'; amount: number }
  | { type: 'fog' }
  | { type: 'fight' }
  | { type: 'pump_target'; power: number; toughness: number }

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
  image: string
}

export interface PlayerDeckDef {
  id: PlayerDeckId
  name: string
  nameZh: string
  blurb: string
  blurbZh: string
  art: string
  cards: ConstructedCardDef[]
}

/** Source of truth: `src/data/cards/player/*.json` */
export const PLAYER_DECKS: PlayerDeckDef[] = [wildfire as PlayerDeckDef]

export const DEFAULT_PLAYER_DECK: PlayerDeckId = 'wildfire'

export function getPlayerDeck(id?: string | null): PlayerDeckDef {
  return PLAYER_DECKS.find((d) => d.id === id) ?? PLAYER_DECKS[0]
}

export function getDeckCards(deckId?: string | null): ConstructedCardDef[] {
  return getPlayerDeck(deckId).cards
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
export const PLAYER_ROSTER = getDeckCards(DEFAULT_PLAYER_DECK)
