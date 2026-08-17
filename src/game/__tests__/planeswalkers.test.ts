import { describe, expect, it } from 'vitest'
import {
  activatePlaneswalker,
  castFromHand,
} from '../playerCast'
import { beginPlayerTurn, checkPlaneswalkerSba } from '../helpers'
import { getDeckCards } from '../playerDecks'
import type { GameState, PlayerCardInstance } from '../types'
import { emptyManaPool } from '../mana'
import { emptyFlags } from '../helpers'

function baseState(deckId: string): GameState {
  return {
    code: 'tbth',
    theme: 'horde',
    status: 'playing',
    turnNumber: 1,
    activeSide: 'player',
    phase: 'main',
    playerPhase: 'main',
    challengePhase: 'idle',
    playerDeckId: deckId,
    castQueue: [],
    awaitingAdvance: false,
    pendingCast: null,
    player: {
      life: 20,
      library: [],
      hand: [],
      lands: [],
      creatures: [],
      planeswalkers: [],
      enchantments: [],
      artifacts: [],
      graveyard: [],
      exile: [],
      heroes: [],
      landsPlayedThisTurn: 0,
      manaPool: emptyManaPool(),
    },
    challenge: { library: [], battlefield: [], graveyard: [], exile: [] },
    flags: { ...emptyFlags(), playerTurnsRemaining: 0 },
    log: [],
    prompt: null,
    mulliganCount: 0,
    stack: [],
    selectedAttackers: [],
    attackAssignments: {},
    blockAssignments: {},
    revealed: [],
    fx: null,
    resultKey: null,
  }
}

function fromDef(name: string, deckId: string): PlayerCardInstance {
  const def = getDeckCards(deckId).find((c) => c.name === name)
  if (!def) throw new Error(`missing ${name} in ${deckId}`)
  return {
    instanceId: `c-${name}-${Math.random().toString(36).slice(2, 7)}`,
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
    keywords: [...def.keywords],
    kind: def.kind,
    produces: def.produces ? [...def.produces] : undefined,
    effect: def.effect,
    flashback: def.flashback ? { ...def.flashback } : undefined,
    startingLoyalty: def.startingLoyalty,
    loyaltyAbilities: def.loyaltyAbilities
      ? def.loyaltyAbilities.map((a) => ({ ...a, effect: { ...a.effect } }))
      : undefined,
    image: def.image,
  }
}

function mountains(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    instanceId: `m${i}`,
    defId: 'mountain',
    name: 'Mountain' as const,
    typeLine: 'Basic Land â€?Mountain',
    tapped: false,
    produces: ['R' as const],
    image: '',
    isLand: true as const,
  }))
}

describe('B3.5 planeswalkers', () => {
  it('casts a planeswalker with starting loyalty', () => {
    let state = baseState('burn')
    const card = fromDef('Chandra, Torch of Defiance', 'burn')
    state = {
      ...state,
      player: {
        ...state.player,
        hand: [card],
        lands: mountains(4),
        library: [fromDef('Lightning Bolt', 'burn')],
      },
    }
    state = castFromHand(state, card.instanceId)
    expect(state.player.planeswalkers).toHaveLength(1)
    expect(state.player.planeswalkers[0].loyalty).toBe(4)
    expect(state.player.planeswalkers[0].loyaltyActivatedThisTurn).toBe(false)
    expect(state.player.hand).toHaveLength(0)
  })

  it('activates +1 loyalty ability (draw)', () => {
    let state = baseState('burn')
    const card = fromDef('Chandra, Torch of Defiance', 'burn')
    state = {
      ...state,
      player: {
        ...state.player,
        hand: [card],
        lands: mountains(4),
        library: [
          fromDef('Lightning Bolt', 'burn'),
          fromDef('Lightning Bolt', 'burn'),
        ],
      },
    }
    state = castFromHand(state, card.instanceId)
    const pwId = state.player.planeswalkers[0].instanceId
    const handBefore = state.player.hand.length
    state = activatePlaneswalker(state, pwId, { abilityIndex: 0 })
    expect(state.player.planeswalkers[0].loyalty).toBe(5)
    expect(state.player.planeswalkers[0].loyaltyActivatedThisTurn).toBe(true)
    expect(state.player.hand.length).toBe(handBefore + 1)
    const again = activatePlaneswalker(state, pwId, { abilityIndex: 0 })
    expect(again.player.planeswalkers[0].loyalty).toBe(5)
  })

  it('damage_any reduces planeswalker loyalty', () => {
    let state = baseState('burn')
    const bolt = fromDef('Lightning Bolt', 'burn')
    state = {
      ...state,
      player: {
        ...state.player,
        hand: [bolt],
        lands: mountains(1),
        planeswalkers: [
          {
            instanceId: 'pw1',
            defId: '40cb22c8-cb03-45c9-bb0e-b8cabdcc43cd',
            name: 'Chandra, Torch of Defiance',
            loyalty: 4,
            loyaltyActivatedThisTurn: false,
            image: '',
            keywords: [],
            effect: { type: 'none' },
            loyaltyAbilities: [
              { cost: 1, effect: { type: 'draw', amount: 1 } },
              { cost: -2, effect: { type: 'damage_any', amount: 2 } },
            ],
          },
        ],
      },
    }
    state = castFromHand(state, bolt.instanceId, { targetId: 'pw1' })
    expect(state.player.planeswalkers[0].loyalty).toBe(1)
  })

  it('SBA sends loyalty â‰?0 planeswalkers to the graveyard', () => {
    let state = baseState('burn')
    state = {
      ...state,
      player: {
        ...state.player,
        planeswalkers: [
          {
            instanceId: 'pw1',
            defId: '40cb22c8-cb03-45c9-bb0e-b8cabdcc43cd',
            name: 'Chandra, Torch of Defiance',
            loyalty: 0,
            loyaltyActivatedThisTurn: false,
            image: '',
            keywords: [],
            effect: { type: 'none' },
            loyaltyAbilities: [],
          },
        ],
      },
    }
    state = checkPlaneswalkerSba(state)
    expect(state.player.planeswalkers).toHaveLength(0)
    expect(state.player.graveyard.some((c) => c.instanceId === 'pw1')).toBe(
      true,
    )
  })

  it('clears loyaltyActivatedThisTurn on beginPlayerTurn', () => {
    let state = baseState('burn')
    state = {
      ...state,
      turnNumber: 2,
      player: {
        ...state.player,
        library: [fromDef('Lightning Bolt', 'burn')],
        planeswalkers: [
          {
            instanceId: 'pw1',
            defId: '40cb22c8-cb03-45c9-bb0e-b8cabdcc43cd',
            name: 'Chandra, Torch of Defiance',
            loyalty: 4,
            loyaltyActivatedThisTurn: true,
            image: '',
            keywords: [],
            effect: { type: 'none' },
            loyaltyAbilities: [
              { cost: 1, effect: { type: 'draw', amount: 1 } },
            ],
          },
        ],
      },
    }
    state = beginPlayerTurn(state)
    expect(state.player.planeswalkers[0].loyaltyActivatedThisTurn).toBe(false)
  })
})
