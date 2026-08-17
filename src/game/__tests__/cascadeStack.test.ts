import { describe, expect, it } from 'vitest'
import {
  checkLegendarySba,
  graveyardTypeCount,
  resolveCascade,
} from '../cascadeGoyf'
import { emptyFlags } from '../helpers'
import { emptyManaPool } from '../mana'
import { getPlayerDeck, findCardDef } from '../playerDecks'
import { makePlayerCardInstance } from '../playerDraw'
import { castHordeCard } from '../horde'
import { offerStackPriority, resolveStackPriorityAnswer } from '../stack'
import type { CardInstance, GameState, PlayerCardInstance } from '../types'

function base(deckId = 'jund'): GameState {
  return {
    code: 'tbth',
    theme: 'horde',
    status: 'playing',
    turnNumber: 1,
    activeSide: 'challenge',
    phase: 'resolve',
    playerPhase: 'end',
    challengePhase: 'resolve',
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
    flags: { ...emptyFlags() },
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

function fromName(name: string, deckId: string): PlayerCardInstance {
  const def = getPlayerDeck(deckId).cards.find((c) => c.name === name)
  if (!def) throw new Error(name)
  return makePlayerCardInstance(findCardDef(def.id, deckId)!)
}

function challengeSpell(name: string): CardInstance {
  return {
    instanceId: 'c1',
    defId: 'c',
    name,
    typeLine: 'Sorcery',
    oracleText: '',
    power: null,
    toughness: null,
    markedDamage: 0,
    tapped: false,
    skipUntap: false,
    indestructible: false,
    keywords: [],
    image: '',
    isHead: false,
    isElite: false,
    isMinotaur: false,
    isReveler: false,
    isArtifact: false,
    isEnchantment: false,
    isGod: false,
  }
}

describe('cascade / goyf / legend / stack', () => {
  it('counts graveyard types', () => {
    const state = base()
    state.player.graveyard = [
      fromName('Lightning Bolt', 'jund'),
      fromName('Tarmogoyf', 'jund'),
    ]
    expect(graveyardTypeCount(state)).toBe(2)
  })

  it('cascade casts a cheaper nonland from library', () => {
    let state = base()
    const bolt = fromName('Lightning Bolt', 'jund')
    const land = fromName(
      getPlayerDeck('jund').cards.find((c) => c.kind === 'land')!.name,
      'jund',
    )
    state.player.library = [land, bolt]
    state = resolveCascade(state, 4, (s, free) => ({
      ...s,
      player: {
        ...s.player,
        graveyard: [free, ...s.player.graveyard],
      },
    }))
    expect(state.player.graveyard.some((c) => c.name === 'Lightning Bolt')).toBe(
      true,
    )
  })

  it('legendary rule buries the older duplicate', () => {
    let state = base('wildfire')
    const pol = fromName('Polukranos, World Eater', 'wildfire')
    state.player.creatures = [
      {
        instanceId: 'a',
        defId: pol.defId,
        name: pol.name,
        power: 5,
        toughness: 5,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
      {
        instanceId: 'b',
        defId: pol.defId,
        name: pol.name,
        power: 5,
        toughness: 5,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
    ]
    state = checkLegendarySba(state)
    expect(state.player.creatures).toHaveLength(1)
    expect(state.player.creatures[0].instanceId).toBe('b')
  })

  it('stack priority can counter with Wanderer', () => {
    let state = base('spirits')
    const wDef = fromName('Mausoleum Wanderer', 'spirits')
    state.player.creatures = [
      {
        instanceId: 'w1',
        defId: wDef.defId,
        name: 'Mausoleum Wanderer',
        power: 1,
        toughness: 1,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: ['Flying'],
        image: '',
      },
    ]
    state = offerStackPriority(state, challengeSpell('Consuming Rage'))
    expect(state.prompt?.kind).toBe('choose_stack_priority')
    expect(state.prompt?.messageKey).toBe('stackPriorityMsgCounter')
    expect(state.prompt?.options?.map((o) => o.id)).toEqual([
      'pass',
      'counter:w1',
    ])
    state = resolveStackPriorityAnswer(state, 'counter:w1', castHordeCard)
    expect(
      state.challenge.graveyard.some((c) => c.name === 'Consuming Rage'),
    ).toBe(true)
    expect(state.player.creatures).toHaveLength(0)
  })

  it('stack priority auto-passes when Pass is the only option', () => {
    let state = base('akroan')
    state = offerStackPriority(
      state,
      challengeSpell('Consuming Rage'),
      castHordeCard,
    )
    expect(state.prompt).toBeNull()
    expect(state.stack ?? []).toHaveLength(0)
  })

  it('stack priority offers Fog only when Fog is in hand', () => {
    let state = base('nessian')
    state.player.hand = [fromName('Fog', 'nessian')]
    state = offerStackPriority(state, challengeSpell('Consuming Rage'))
    expect(state.prompt?.messageKey).toBe('stackPriorityMsgFog')
    expect(state.prompt?.options?.some((o) => o.id.startsWith('fog:'))).toBe(
      true,
    )

    state = base('nessian')
    state.flags.preventCombatDamageThisTurn = true
    state.player.hand = [fromName('Fog', 'nessian')]
    state = offerStackPriority(
      state,
      challengeSpell('Consuming Rage'),
      castHordeCard,
    )
    expect(state.prompt).toBeNull()
  })
})
