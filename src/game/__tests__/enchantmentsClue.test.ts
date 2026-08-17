import { describe, expect, it } from 'vitest'
import { activateCreature, castFromHand } from '../playerCast'
import { leavePlayerEnchantments } from '../helpers'
import { getDeckCards } from '../playerDecks'
import type { CardInstance, GameState, PlayerCardInstance } from '../types'
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
    image: def.image,
  }
}

function basicLand(
  id: string,
  name: 'Mountain' | 'Island' | 'Plains' | 'Swamp' | 'Forest',
  color: 'R' | 'U' | 'W' | 'B' | 'G',
) {
  return {
    instanceId: id,
    defId: id,
    name,
    typeLine: `Basic Land â€?${name}`,
    tapped: false,
    produces: [color] as Array<'R' | 'U' | 'W' | 'B' | 'G'>,
    image: '',
    isLand: true as const,
  }
}

function foe(partial: Partial<CardInstance> & { instanceId: string; name: string }): CardInstance {
  return {
    defId: 'x',
    typeLine: 'Creature â€?Test',
    oracleText: '',
    power: 2,
    toughness: 2,
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
    ...partial,
  }
}

describe('B3 enchantments + Clue', () => {
  it('Journey to Nowhere exiles a challenge permanent and returns it when the enchantment leaves', () => {
    let state = baseState('skies')
    state.player.lands = [
      basicLand('P1', 'Plains', 'W'),
      basicLand('P2', 'Plains', 'W'),
    ]
    const journey = fromDef('Journey to Nowhere', 'skies')
    journey.instanceId = 'jtn'
    state.player.hand = [journey]
    const enemy = foe({ instanceId: 'enemy1', name: 'Minotaur' })
    state.challenge.battlefield = [enemy]

    state = castFromHand(state, 'jtn')
    expect(state.pendingCast?.mode).toBe('destroy')
    state = castFromHand(state, 'jtn', { targetId: 'enemy1' })

    expect(state.player.enchantments).toHaveLength(1)
    expect(state.player.enchantments[0].exiledInstanceId).toBe('enemy1')
    expect(state.challenge.battlefield.find((c) => c.instanceId === 'enemy1')).toBeUndefined()
    expect(state.challenge.exile.some((c) => c.instanceId === 'enemy1')).toBe(true)

    state = leavePlayerEnchantments(state, [state.player.enchantments[0].instanceId])
    expect(state.player.enchantments).toHaveLength(0)
    expect(state.challenge.exile).toHaveLength(0)
    expect(state.challenge.battlefield.some((c) => c.instanceId === 'enemy1')).toBe(true)
    expect(state.player.graveyard.some((c) => c.name === 'Journey to Nowhere')).toBe(true)
  })

  it('Thraben Inspector investigates into a Clue; activate Clue draws', () => {
    let state = baseState('humans')
    state.player.lands = [
      basicLand('P1', 'Plains', 'W'),
      basicLand('P2', 'Plains', 'W'),
      basicLand('P3', 'Plains', 'W'),
    ]
    const inspector = fromDef('Thraben Inspector', 'humans')
    inspector.instanceId = 'ti'
    state.player.hand = [inspector]
    state.player.library = [
      fromDef('Plains', 'humans'),
      fromDef('Plains', 'humans'),
    ]

    state = castFromHand(state, 'ti')
    expect(state.player.creatures.some((c) => c.instanceId === 'ti')).toBe(true)
    expect(state.player.artifacts).toHaveLength(1)
    expect(state.player.artifacts[0].isClue).toBe(true)
    expect(state.player.hand).toHaveLength(0)

    const clueId = state.player.artifacts[0].instanceId
    state = activateCreature(state, clueId)
    expect(state.player.artifacts).toHaveLength(0)
    expect(state.player.hand).toHaveLength(1)
  })
})
