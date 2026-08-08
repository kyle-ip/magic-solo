import type { PlayerTemplate } from './types'
import akroan from '../data/cards/player/akroan.json'
import nessian from '../data/cards/player/nessian.json'
import meletis from '../data/cards/player/meletis.json'
import forge from '../data/cards/player/forge.json'

export type PlayerDeckId = 'akroan' | 'nessian' | 'meletis' | 'forge'

export interface PlayerDeckDef {
  id: PlayerDeckId
  name: string
  nameZh: string
  blurb: string
  blurbZh: string
  /** Scryfall art_crop for setup tile */
  art: string
  roster: PlayerTemplate[]
}

/** Source of truth: `src/data/cards/player/*.json` — edit card copy & images there. */
export const PLAYER_DECKS: PlayerDeckDef[] = [
  akroan as PlayerDeckDef,
  nessian as PlayerDeckDef,
  meletis as PlayerDeckDef,
  forge as PlayerDeckDef,
]

export const DEFAULT_PLAYER_DECK: PlayerDeckId = 'akroan'

export function getPlayerDeck(id: string | undefined | null): PlayerDeckDef {
  return PLAYER_DECKS.find((d) => d.id === id) ?? PLAYER_DECKS[0]
}

export function getRoster(deckId?: string | null): PlayerTemplate[] {
  return getPlayerDeck(deckId).roster
}

export function findTemplate(
  templateId: string,
  deckId?: string | null,
): PlayerTemplate | undefined {
  const preferred = getRoster(deckId).find((t) => t.id === templateId)
  if (preferred) return preferred
  for (const deck of PLAYER_DECKS) {
    const hit = deck.roster.find((t) => t.id === templateId)
    if (hit) return hit
  }
  return undefined
}

export function findTemplateByName(name: string): PlayerTemplate | undefined {
  for (const deck of PLAYER_DECKS) {
    const hit = deck.roster.find((t) => t.name === name)
    if (hit) return hit
  }
  return undefined
}

export function musterForTurn(turnNumber: number): number {
  return Math.min(10, 3 + Math.floor((turnNumber - 1) / 2))
}

/** @deprecated use getRoster / PLAYER_DECKS — kept for brief compatibility */
export const PLAYER_ROSTER = getRoster(DEFAULT_PLAYER_DECK)
