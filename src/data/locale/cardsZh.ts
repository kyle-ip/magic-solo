/** Challenge Deck cards have no official Chinese printing.
 * Localized with official Magic Simplified Chinese terminology.
 * Source of truth: `src/data/cards/challenge/*.json` — edit there.
 */
import tfth from '../cards/challenge/tfth.json'
import tbth from '../cards/challenge/tbth.json'
import tdag from '../cards/challenge/tdag.json'

export interface CardZh {
  name: string
  typeLine: string
  oracleText: string
}

type LocalizedField = { en: string; zh: string }

type ChallengeCardJson = {
  name: LocalizedField
  typeLine: LocalizedField
  oracleText: LocalizedField
}

type ChallengeDeckJson = {
  cards: ChallengeCardJson[]
}

function buildZh(deck: ChallengeDeckJson): Record<string, CardZh> {
  const map: Record<string, CardZh> = {}
  for (const card of deck.cards) {
    map[card.name.en] = {
      name: card.name.zh,
      typeLine: card.typeLine.zh,
      oracleText: card.oracleText.zh,
    }
  }
  return map
}

export const cardsZh: Record<string, Record<string, CardZh>> = {
  tfth: buildZh(tfth as ChallengeDeckJson),
  tbth: buildZh(tbth as ChallengeDeckJson),
  tdag: buildZh(tdag as ChallengeDeckJson),
}

export function getCardZh(setCode: string, englishName: string): CardZh | undefined {
  return cardsZh[setCode]?.[englishName]
}
