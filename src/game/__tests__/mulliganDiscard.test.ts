import { describe, expect, it } from 'vitest'
import { endPlayerTurn } from '../challengeTurn'
import { emptyFlags } from '../helpers'
import { emptyManaPool } from '../mana'
import { createInitialSetup, gameReducer } from '../reducer'
import type { GameState, PlayerCardInstance } from '../types'

function stubCard(name: string, id: string): PlayerCardInstance {
  return {
    instanceId: id,
    defId: 'stub',
    name,
    nameZh: name,
    typeLine: 'Land',
    typeLineZh: '',
    oracleText: '',
    oracleTextZh: '',
    manaCost: '',
    cmc: 0,
    power: null,
    toughness: null,
    keywords: [],
    kind: 'land',
    image: '',
    effect: { type: 'none' },
    produces: ['W'],
  }
}

function playingState(overrides: Partial<GameState> = {}): GameState {
  return {
    code: 'tfth',
    theme: 'hydra',
    status: 'playing',
    turnNumber: 1,
    activeSide: 'player',
    phase: 'main',
    playerPhase: 'main',
    challengePhase: 'idle',
    playerDeckId: 'wildfire',
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
    challenge: {
      library: [],
      battlefield: [
        {
          instanceId: 'head-1',
          defId: 'head',
          name: 'Hydra Head',
          typeLine: 'Creature â€?Head',
          oracleText: '',
          power: 0,
          toughness: 3,
          markedDamage: 0,
          tapped: false,
          skipUntap: false,
          indestructible: false,
          keywords: [],
          image: '',
          isHead: true,
          isElite: false,
          isMinotaur: false,
          isReveler: false,
          isArtifact: false,
          isEnchantment: false,
          isGod: false,
        },
      ],
      graveyard: [],
      exile: [],
    },
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
    ...overrides,
  }
}

describe('London mulligan', () => {
  it('opens choose_mulligan after START before turn 1', () => {
    const setup = createInitialSetup('tfth')
    const started = gameReducer(setup, {
      type: 'START',
      config: { code: 'tfth', startingHeads: 2, playerDeckId: 'wildfire' },
    })
    expect(started.status).toBe('playing')
    expect(started.turnNumber).toBe(0)
    expect(started.mulliganCount).toBe(0)
    expect(started.prompt?.kind).toBe('choose_mulligan')
    expect(started.player.hand).toHaveLength(7)
  })

  it('keep begins turn 1 without drawing', () => {
    const setup = createInitialSetup('tfth')
    let state = gameReducer(setup, {
      type: 'START',
      config: { code: 'tfth', startingHeads: 1, playerDeckId: 'burn' },
    })
    const handIds = state.player.hand.map((c) => c.instanceId)
    state = gameReducer(state, { type: 'ANSWER_PROMPT', optionId: 'keep' })
    expect(state.prompt).toBeNull()
    expect(state.turnNumber).toBe(1)
    expect(state.activeSide).toBe('player')
    expect(state.player.hand.map((c) => c.instanceId)).toEqual(handIds)
  })

  it('mulligan shuffles, draws 7, then bottoms N cards', () => {
    const setup = createInitialSetup('tbth')
    let state = gameReducer(setup, {
      type: 'START',
      config: {
        code: 'tbth',
        playerTurnsBeforeHorde: 3,
        playerDeckId: 'skies',
      },
    })
    const opening = new Set(state.player.hand.map((c) => c.instanceId))
    state = gameReducer(state, { type: 'ANSWER_PROMPT', optionId: 'mulligan' })
    expect(state.mulliganCount).toBe(1)
    expect(state.player.hand).toHaveLength(7)
    expect(state.prompt?.kind).toBe('choose_discard_hand')
    expect(state.prompt?.resume).toBe('mulligan_bottom:1')
    // New seven should usually differ after shuffle; library restored to 53.
    expect(state.player.library).toHaveLength(53)
    const bottomId = state.player.hand[0].instanceId
    state = gameReducer(state, { type: 'ANSWER_PROMPT', optionId: bottomId })
    expect(state.player.hand).toHaveLength(6)
    expect(state.player.library).toHaveLength(54)
    expect(state.player.library[state.player.library.length - 1].instanceId).toBe(
      bottomId,
    )
    expect(state.prompt?.kind).toBe('choose_mulligan')
    // Opening ids should no longer be the same ordered hand after a mulligan.
    const keptOverlap = state.player.hand.filter((c) => opening.has(c.instanceId))
    expect(keptOverlap.length).toBeLessThan(7)
  })
})

describe('Cleanup discard to 7', () => {
  it('END_TURN with hand > 7 opens choose_discard_hand before challenge', () => {
    const hand = Array.from({ length: 9 }, (_, i) => stubCard(`Card ${i}`, `h-${i}`))
    let state = playingState({ player: {
      life: 20,
      library: [stubCard('Lib', 'lib-1')],
      hand,
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
    } })
    state = gameReducer(state, { type: 'END_TURN' })
    expect(state.activeSide).toBe('player')
    expect(state.prompt?.kind).toBe('choose_discard_hand')
    expect(state.prompt?.resume).toBe('end_turn')
    expect(state.playerPhase).toBe('end')
  })

  it('discarding down to 7 then continues into challenge turn', () => {
    const hand = Array.from({ length: 9 }, (_, i) => stubCard(`Card ${i}`, `h-${i}`))
    const pendingCast = {
      instanceId: 'hydra-spell',
      defId: 'spell',
      name: 'Disorienting Glower',
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
    let state = playingState({
      player: {
        life: 20,
        library: [],
        hand,
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
      challenge: {
        library: [pendingCast],
        battlefield: playingState().challenge.battlefield,
        graveyard: [],
      },
    })
    state = gameReducer(state, { type: 'END_TURN' })
    expect(state.prompt?.kind).toBe('choose_discard_hand')

    state = gameReducer(state, { type: 'ANSWER_PROMPT', optionId: 'h-0' })
    expect(state.player.hand).toHaveLength(8)
    expect(state.prompt?.kind).toBe('choose_discard_hand')
    expect(state.player.graveyard[0].instanceId).toBe('h-0')

    state = gameReducer(state, { type: 'ANSWER_PROMPT', optionId: 'h-1' })
    expect(state.player.hand).toHaveLength(7)
    expect(state.prompt).toBeNull()
    expect(state.activeSide).toBe('challenge')
    expect(state.awaitingAdvance).toBe(true)
  })

  it('endPlayerTurn with hand â‰?7 skips discard prompt', () => {
    const hand = Array.from({ length: 7 }, (_, i) => stubCard(`Card ${i}`, `h-${i}`))
    const pendingCast = {
      instanceId: 'hydra-spell',
      defId: 'spell',
      name: 'Disorienting Glower',
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
    let state = playingState({
      player: {
        life: 20,
        library: [],
        hand,
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
      challenge: {
        library: [pendingCast],
        battlefield: playingState().challenge.battlefield,
        graveyard: [],
      },
    })
    state = endPlayerTurn(state)
    expect(state.prompt).toBeNull()
    expect(state.activeSide).toBe('challenge')
    expect(state.awaitingAdvance).toBe(true)
  })
})
