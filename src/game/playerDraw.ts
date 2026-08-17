import { nextId } from './buildDeck'
import { getDeckCards, type ConstructedCardDef } from './playerDecks'
import { shuffle } from './shuffle'
import type { GameState, PlayerCardInstance } from './types'
import { pushLog } from './log'

export function makePlayerCardInstance(def: ConstructedCardDef): PlayerCardInstance {
  return {
    instanceId: nextId('pl'),
    defId: def.id,
    name: def.name,
    nameZh: def.nameZh,
    typeLine: def.typeLine,
    typeLineZh: def.typeLineZh,
    oracleText: def.oracleText,
    oracleTextZh: def.oracleTextZh,
    manaCost: def.manaCost,
    cmc: def.cmc,
    power: def.power,
    toughness: def.toughness,
    keywords: [...(def.keywords ?? [])],
    kind: def.kind,
    produces: def.produces ? [...def.produces] : undefined,
    effect: def.effect,
    flashback: def.flashback ? { ...def.flashback } : undefined,
    image: def.image,
  }
}

export function buildPlayerLibrary(deckId: string): PlayerCardInstance[] {
  const cards: PlayerCardInstance[] = []
  for (const def of getDeckCards(deckId)) {
    for (let i = 0; i < def.quantity; i += 1) {
      cards.push(makePlayerCardInstance(def))
    }
  }
  return shuffle(cards)
}

export function drawCards(state: GameState, n: number): GameState {
  if (n <= 0) return state
  let next = state
  for (let i = 0; i < n; i += 1) {
    if (next.player.library.length === 0) {
      return {
        ...pushLog(next, 'defeatEmptyLibrary', 'bad'),
        status: 'lost',
        resultKey: 'emptyLibrary',
      }
    }
    const [top, ...rest] = next.player.library
    next = {
      ...next,
      player: {
        ...next.player,
        library: rest,
        hand: [...next.player.hand, top],
      },
    }
  }
  return next
}

export function discardCards(state: GameState, n: number): GameState {
  if (n <= 0) return state
  let next = state
  let remaining = n
  const discarded: string[] = []
  while (remaining > 0 && next.player.hand.length > 0) {
    const hand = [...next.player.hand]
    const card = hand.pop()!
    discarded.push(card.name)
    next = {
      ...next,
      player: {
        ...next.player,
        hand,
        graveyard: [card, ...next.player.graveyard],
      },
    }
    remaining -= 1
  }
  if (discarded.length) {
    next = pushLog(next, 'youDiscard', 'bad', { n: discarded.length })
  }
  if (remaining > 0) {
    next = pushLog(next, 'discardShort', 'info', { n: remaining })
  }
  return next
}
