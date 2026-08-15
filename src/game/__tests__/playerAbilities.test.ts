import { describe, expect, it } from 'vitest'
import {
  activateCreature,
  castFlashback,
  castFromHand,
  resolveBrainstormPrompt,
  resolveEdictPrompt,
  resolveScryPrompt,
} from '../playerCast'
import {
  applyProwessPumps,
  canBlockAttacker,
  effectivePower,
} from '../playerAbilities'
import { dealDamageToChallengeCreature } from '../helpers'
import { getDeckCards } from '../playerDecks'
import type { GameState, PlayerCardInstance, PlayerCreature } from '../types'
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
      graveyard: [],
      exile: [],
      heroes: [],
      landsPlayedThisTurn: 0,
      manaPool: emptyManaPool(),
    },
    challenge: { library: [], battlefield: [], graveyard: [] },
    flags: { ...emptyFlags(), playerTurnsRemaining: 0 },
    log: [],
    prompt: null,
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
    typeLine: `Basic Land — ${name}`,
    tapped: false,
    produces: [color] as Array<'R' | 'U' | 'W' | 'B' | 'G'>,
    image: '',
    isLand: true as const,
  }
}

describe('player ability coverage', () => {
  it('applies prowess on noncreature cast', () => {
    let state = baseState('burn')
    const spear = fromDef('Monastery Swiftspear', 'burn')
    state.player.creatures = [
      {
        instanceId: 'sp1',
        defId: spear.defId,
        name: spear.name,
        power: 1,
        toughness: 2,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: ['Haste', 'Prowess'],
        image: '',
        tempPower: 0,
        tempToughness: 0,
      },
    ]
    state = applyProwessPumps(state)
    expect(state.player.creatures[0].power).toBe(2)
    expect(state.player.creatures[0].toughness).toBe(3)
  })

  it('Firebrand activate deals damage and sacrifices', () => {
    let state = baseState('burn')
    const brand = fromDef('Fanatical Firebrand', 'burn')
    state.player.creatures = [
      {
        instanceId: 'fb1',
        defId: brand.defId,
        name: brand.name,
        power: 1,
        toughness: 1,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: ['Haste'],
        image: '',
      },
    ]
    state.challenge.library = Array.from({ length: 5 }, (_, i) => ({
      instanceId: `h${i}`,
      defId: 'x',
      name: 'Minotaur',
      typeLine: 'Creature — Minotaur',
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
      isMinotaur: true,
      isReveler: false,
      isArtifact: false,
      isEnchantment: false,
      isGod: false,
    }))
    state = activateCreature(state, 'fb1', { targetId: 'horde' })
    expect(state.player.creatures).toHaveLength(0)
    expect(state.challenge.library.length).toBe(4)
  })

  it('Opt opens scry prompt then draws', () => {
    let state = baseState('skies')
    state.player.lands = [basicLand('I1', 'Island', 'U')]
    const opt = fromDef('Opt', 'skies')
    state.player.hand = [opt]
    state.player.library = [fromDef('Island', 'skies'), fromDef('Plains', 'skies')]
    state = castFromHand(state, opt.instanceId)
    expect(state.prompt?.kind).toBe('scry')
    state = resolveScryPrompt(state, 'bottom')
    expect(state.prompt).toBeNull()
    expect(state.player.hand.length).toBeGreaterThanOrEqual(1)
  })

  it('Eagle anthem boosts other flyers', () => {
    const state = baseState('skies')
    const hawk = fromDef("Healer's Hawk", 'skies')
    const eagle = fromDef('Empyrean Eagle', 'skies')
    const creatures: PlayerCreature[] = [
      {
        instanceId: 'hk',
        defId: hawk.defId,
        name: hawk.name,
        power: 1,
        toughness: 1,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: ['Flying', 'Lifelink'],
        image: '',
      },
      {
        instanceId: 'eg',
        defId: eagle.defId,
        name: eagle.name,
        power: 2,
        toughness: 3,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: ['Flying'],
        image: '',
      },
    ]
    state.player.creatures = creatures
    expect(effectivePower(state, creatures[0])).toBe(2)
    expect(effectivePower(state, creatures[1])).toBe(2)
  })

  it('flashback Deep Analysis pays life and draws', () => {
    let state = baseState('terror')
    state.player.lands = [
      basicLand('I1', 'Island', 'U'),
      basicLand('I2', 'Island', 'U'),
    ]
    const da = fromDef('Deep Analysis', 'terror')
    state.player.graveyard = [da]
    state.player.library = [
      fromDef('Island', 'terror'),
      fromDef('Swamp', 'terror'),
      fromDef('Island', 'terror'),
    ]
    state = castFlashback(state, da.instanceId)
    expect(state.player.life).toBe(17)
    expect(state.player.exile.some((c) => c.name === 'Deep Analysis')).toBe(true)
    expect(state.player.hand.length).toBe(2)
  })

  it('Journey to Nowhere is castable with Plains and opens destroy targeting', () => {
    let state = baseState('skies')
    state.player.lands = [
      basicLand('P1', 'Plains', 'W'),
      basicLand('P2', 'Plains', 'W'),
    ]
    const journey = fromDef('Journey to Nowhere', 'skies')
    state.player.hand = [journey]
    state = castFromHand(state, journey.instanceId)
    expect(state.pendingCast?.mode).toBe('destroy')
  })

  it('Brainstorm lets the player choose cards to put back', () => {
    let state = baseState('skies')
    state.player.lands = [basicLand('I1', 'Island', 'U')]
    const bs = fromDef('Brainstorm', 'skies')
    const a = fromDef('Opt', 'skies')
    const b = fromDef('Plains', 'skies')
    const c = fromDef('Island', 'skies')
    const d = fromDef("Healer's Hawk", 'skies')
    state.player.hand = [bs]
    state.player.library = [a, b, c, d]
    state = castFromHand(state, bs.instanceId)
    expect(state.prompt?.kind).toBe('brainstorm')
    expect(state.player.hand.length).toBe(3)
    const first = state.player.hand[0].instanceId
    state = resolveBrainstormPrompt(state, first)
    expect(state.prompt?.kind).toBe('brainstorm')
    const second = state.player.hand[0].instanceId
    state = resolveBrainstormPrompt(state, second)
    expect(state.prompt).toBeNull()
    expect(state.player.hand.length).toBe(1)
    expect(state.player.library[0].instanceId).toBe(second)
    expect(state.player.library[1].instanceId).toBe(first)
  })

  it('edict opens a choice when multiple victims exist', () => {
    let state = baseState('terror')
    state.player.lands = [
      basicLand('S1', 'Swamp', 'B'),
      basicLand('I1', 'Island', 'U'),
    ]
    const edict = fromDef("Chainer's Edict", 'terror')
    state.player.hand = [edict]
    state.challenge.battlefield = [
      {
        instanceId: 'm1',
        defId: 'x',
        name: 'Minotaur A',
        typeLine: 'Creature — Minotaur',
        oracleText: '',
        power: 2,
        toughness: 3,
        markedDamage: 0,
        tapped: false,
        skipUntap: false,
        indestructible: false,
        keywords: [],
        image: '',
        isHead: false,
        isElite: false,
        isMinotaur: true,
        isReveler: false,
        isArtifact: false,
        isEnchantment: false,
        isGod: false,
      },
      {
        instanceId: 'm2',
        defId: 'x',
        name: 'Minotaur B',
        typeLine: 'Creature — Minotaur',
        oracleText: '',
        power: 5,
        toughness: 4,
        markedDamage: 0,
        tapped: false,
        skipUntap: false,
        indestructible: false,
        keywords: [],
        image: '',
        isHead: false,
        isElite: false,
        isMinotaur: true,
        isReveler: false,
        isArtifact: false,
        isEnchantment: false,
        isGod: false,
      },
    ]
    state = castFromHand(state, edict.instanceId)
    expect(state.prompt?.kind).toBe('choose_edict')
    state = resolveEdictPrompt(state, 'm2')
    expect(state.challenge.battlefield).toHaveLength(1)
    expect(state.challenge.battlefield[0].instanceId).toBe('m1')
  })

  it('deathtouch damage destroys regardless of toughness', () => {
    let state = baseState('tfth')
    state.challenge.battlefield = [
      {
        instanceId: 'h1',
        defId: 'x',
        name: 'Hydra Head',
        typeLine: 'Creature — Head',
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
    ]
    state = dealDamageToChallengeCreature(state, 'h1', 1, { deathtouch: true })
    expect(state.challenge.battlefield.some((c) => c.instanceId === 'h1')).toBe(
      false,
    )
  })

  it('non-flyers cannot block flyers', () => {
    expect(
      canBlockAttacker(
        { keywords: [] },
        { keywords: ['Flying'] },
      ),
    ).toBe(false)
    expect(
      canBlockAttacker(
        { keywords: ['Reach'] },
        { keywords: ['Flying'] },
      ),
    ).toBe(true)
  })

  it('monstrosity activation grows Ember Swallower once', () => {
    let state = baseState('wildfire')
    const ember = fromDef('Ember Swallower', 'wildfire')
    state.player.creatures = [
      {
        instanceId: 'es1',
        defId: ember.defId,
        name: ember.name,
        power: 4,
        toughness: 5,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
    ]
    state.player.lands = Array.from({ length: 6 }, (_, i) =>
      basicLand(`R${i}`, 'Mountain', 'R'),
    )
    state = activateCreature(state, 'es1')
    expect(state.player.creatures[0].power).toBe(7)
    expect(state.player.creatures[0].toughness).toBe(8)
    expect(state.player.creatures[0].monstrous).toBe(true)
    const again = activateCreature(state, 'es1')
    expect(again.log.some((e) => e.key === 'alreadyMonstrous')).toBe(true)
  })
})
