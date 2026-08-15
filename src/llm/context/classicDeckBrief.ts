import type { ClassicDeck } from '../../types'
import { getClassicDeckText } from '../../data/classicDeckRegistry'

export function classicDeckBrief(deck: ClassicDeck, lang: string) {
  return {
    id: deck.id,
    format: deck.format,
    playstyle: deck.playstyle,
    era: deck.era,
    colors: deck.colors,
    name: getClassicDeckText(deck.name, lang),
    summary: getClassicDeckText(deck.summary, lang),
    howItWins: getClassicDeckText(deck.howItWins, lang),
    keyCards: deck.keyCards,
    sampleList: deck.sampleList.map((e) => ({
      name: e.name,
      qty: e.qty,
      board: e.board,
    })),
  }
}
