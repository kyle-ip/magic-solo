/**
 * Full deck payloads (challenge catalogs + deck meta).
 * Import from Deck / Challenge / Assistant / pack / reducer — not home chrome.
 */
import type { DeckData } from '../types'
import { loadChallengeCards } from './cards/loadChallengeCards'
import tfth from './decks/tfth.json'
import tbth from './decks/tbth.json'
import tdag from './decks/tdag.json'

type DeckMetaJson = Omit<DeckData, 'cards'> & { cards?: DeckData['cards'] }

function withCatalogCards(deck: DeckMetaJson): DeckData {
  const cards = loadChallengeCards(deck.code) ?? deck.cards ?? []
  return { ...deck, cards }
}

const decksByCode: Record<string, DeckData> = {
  tfth: withCatalogCards(tfth as DeckMetaJson),
  tbth: withCatalogCards(tbth as DeckMetaJson),
  tdag: withCatalogCards(tdag as DeckMetaJson),
}

export function getDeck(code: string): DeckData | undefined {
  return decksByCode[code]
}
