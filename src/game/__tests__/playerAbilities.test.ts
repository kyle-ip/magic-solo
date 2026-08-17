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
import { resolvePlayerCombat } from '../combat'
import { buryPlayerCreatures, dealDamageToChallengeCreature } from '../helpers'
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

  it('Merfolk lord anthem pumps other Merfolk', () => {
    let state = baseState('merfolk')
    const lord = fromDef('Lord of Atlantis', 'merfolk')
    const body = fromDef('Coral Merfolk', 'merfolk')
    state.player.creatures = [
      {
        instanceId: 'lord',
        defId: lord.defId,
        name: lord.name,
        power: lord.power ?? 2,
        toughness: lord.toughness ?? 2,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
      {
        instanceId: 'body',
        defId: body.defId,
        name: body.name,
        power: body.power ?? 2,
        toughness: body.toughness ?? 1,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
    ]
    const bodyC = state.player.creatures[1]
    expect(effectivePower(state, bodyC)).toBe((body.power ?? 2) + 1)
  })

  it('Akroan Hoplite pumps per attacker on attack', () => {
    let state = baseState('akroan')
    state.code = 'tfth'
    state.theme = 'hydra'
    const hop = fromDef('Akroan Hoplite', 'akroan')
    const claw = fromDef('Oreskos Swiftclaw', 'akroan')
    state.player.creatures = [
      {
        instanceId: 'h1',
        defId: hop.defId,
        name: hop.name,
        power: hop.power ?? 1,
        toughness: hop.toughness ?? 2,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
      {
        instanceId: 'c1',
        defId: claw.defId,
        name: claw.name,
        power: claw.power ?? 3,
        toughness: claw.toughness ?? 1,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: ['First strike'],
        image: '',
      },
    ]
    state.challenge.battlefield = [
      {
        instanceId: 'head',
        defId: 'x',
        name: 'Hydra Head',
        typeLine: 'Creature — Head',
        oracleText: '',
        power: 0,
        toughness: 10,
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
    state.selectedAttackers = ['h1', 'c1']
    state.attackAssignments = { h1: 'head', c1: 'head' }
    state = resolvePlayerCombat(state)
    // Hoplite base +2 for 2 attackers in first (only) normal step; claw first strike 3
    expect(state.challenge.battlefield[0]?.markedDamage).toBeGreaterThanOrEqual(
      (hop.power ?? 1) + 2 + (claw.power ?? 3),
    )
  })

  it('Boros Elite battalion pumps when three attack', () => {
    let state = baseState('akroan')
    state.code = 'tfth'
    state.theme = 'hydra'
    const elite = fromDef('Boros Elite', 'akroan')
    const mk = (id: string, defId: string, name: string, power: number) => ({
      instanceId: id,
      defId,
      name,
      power,
      toughness: 1,
      markedDamage: 0,
      tapped: false,
      summoningSickness: false,
      keywords: [] as string[],
      image: '',
    })
    state.player.creatures = [
      mk('e1', elite.defId, elite.name, 1),
      mk('a2', elite.defId, 'Ally A', 1),
      mk('a3', elite.defId, 'Ally B', 1),
    ]
    state.challenge.battlefield = [
      {
        instanceId: 'head',
        defId: 'x',
        name: 'Hydra Head',
        typeLine: 'Creature — Head',
        oracleText: '',
        power: 0,
        toughness: 20,
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
    state.selectedAttackers = ['e1', 'a2', 'a3']
    state.attackAssignments = { e1: 'head', a2: 'head', a3: 'head' }
    state = resolvePlayerCombat(state)
    // Each elite gets +2/+2 from battalion → 3 power each ×3 = 9
    expect(state.challenge.battlefield[0]?.markedDamage).toBe(9)
  })

  it('Champion of the Parish grows when another Human enters', () => {
    let state = baseState('humans')
    const champ = fromDef('Champion of the Parish', 'humans')
    const body = fromDef('Elite Vanguard', 'humans')
    state.player.creatures = [
      {
        instanceId: 'ch',
        defId: champ.defId,
        name: champ.name,
        power: 1,
        toughness: 1,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
    ]
    state.player.hand = [fromDef('Elite Vanguard', 'humans')]
    state.player.hand[0].instanceId = 'hv'
    state.player.lands = Array.from({ length: 1 }, (_, i) =>
      basicLand(`W${i}`, 'Plains', 'W'),
    )
    state = castFromHand(state, 'hv')
    const grown = state.player.creatures.find((c) => c.instanceId === 'ch')
    expect(grown?.power).toBe(2)
    expect(grown?.toughness).toBe(2)
    expect(state.player.creatures.some((c) => c.name === body.name)).toBe(true)
  })

  it('Fallaji Archaeologist gets +1/+1 when mill finds no loot', () => {
    let state = baseState('terror')
    const fallaji = fromDef('Fallaji Archaeologist', 'terror')
    state.player.hand = [fallaji]
    fallaji.instanceId = 'fa'
    state.player.library = [
      fromDef('Island', 'terror'),
      fromDef('Island', 'terror'),
      fromDef('Tolarian Terror', 'terror'),
    ]
    state.player.lands = Array.from({ length: 2 }, (_, i) =>
      basicLand(`U${i}`, 'Island', 'U'),
    )
    state = castFromHand(state, 'fa')
    const body = state.player.creatures.find((c) => c.instanceId === 'fa')
    expect(body?.power).toBe(1)
    expect(body?.toughness).toBe(4)
    expect(state.player.hand.some((c) => c.instanceId === 'fa')).toBe(false)
  })

  it('Tarmogoyf sticky pump survives EOT clear', () => {
    let state = baseState('jund')
    const goyf = fromDef('Tarmogoyf', 'jund')
    state.player.hand = [goyf]
    goyf.instanceId = 'tg'
    state.player.lands = [
      basicLand('G0', 'Forest', 'G'),
      basicLand('G1', 'Forest', 'G'),
    ]
    state = castFromHand(state, 'tg')
    let body = state.player.creatures.find((c) => c.instanceId === 'tg')
    expect(body?.power).toBe(4)
    expect(body?.toughness).toBe(5)
    // Simulate EOT clear used by beginPlayerTurn helpers
    state = {
      ...state,
      player: {
        ...state.player,
        creatures: state.player.creatures.map((c) => ({
          ...c,
          power: Math.max(0, c.power - (c.tempPower ?? 0)),
          toughness: Math.max(0, c.toughness - (c.tempToughness ?? 0)),
          tempPower: 0,
          tempToughness: 0,
        })),
      },
    }
    body = state.player.creatures.find((c) => c.instanceId === 'tg')
    expect(body?.power).toBe(4)
    expect(body?.toughness).toBe(5)
  })

  it('bestow triggers heroic and falloff returns aura as creature', () => {
    let state = baseState('akroan')
    const rider = fromDef('Wingsteed Rider', 'akroan')
    const alseid = fromDef('Observant Alseid', 'akroan')
    state.player.creatures = [
      {
        instanceId: 'wr',
        defId: rider.defId,
        name: rider.name,
        power: 2,
        toughness: 2,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [...rider.keywords],
        image: '',
      },
    ]
    state.player.hand = [alseid]
    alseid.instanceId = 'oa'
    state.player.lands = Array.from({ length: 5 }, (_, i) =>
      basicLand(`W${i}`, 'Plains', 'W'),
    )
    state = castFromHand(state, 'oa', { targetId: 'wr' })
    const enchanted = state.player.creatures.find((c) => c.instanceId === 'wr')
    expect(enchanted?.bestowed?.name).toBe('Observant Alseid')
    expect(enchanted?.power).toBe(3) // heroic sticky +1
    expect(enchanted?.toughness).toBe(3)
    expect(effectivePower(state, enchanted!)).toBe(5) // +2 from bestow

    state = buryPlayerCreatures(state, ['wr'])
    expect(state.player.creatures.some((c) => c.name === 'Observant Alseid')).toBe(
      true,
    )
    expect(state.player.creatures.some((c) => c.instanceId === 'wr')).toBe(false)
  })

  it('Kitchen Finks persist returns with -1/-1', () => {
    let state = baseState('jund')
    const finks = fromDef('Kitchen Finks', 'jund')
    state.player.creatures = [
      {
        instanceId: 'kf',
        defId: finks.defId,
        name: finks.name,
        power: 3,
        toughness: 2,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
    ]
    state = buryPlayerCreatures(state, ['kf'])
    const back = state.player.creatures.find((c) => c.instanceId === 'kf')
    expect(back?.power).toBe(2)
    expect(back?.toughness).toBe(1)
    expect(back?.minusOneCounters).toBe(1)
    state = buryPlayerCreatures(state, ['kf'])
    expect(state.player.creatures.some((c) => c.instanceId === 'kf')).toBe(false)
    expect(state.player.graveyard.some((c) => c.instanceId === 'kf')).toBe(true)
  })

  it('Maelstrom Pulse wipes same-name challenge creatures', () => {
    let state = baseState('jund')
    const pulse = fromDef('Maelstrom Pulse', 'jund')
    state.player.hand = [pulse]
    pulse.instanceId = 'mp'
    state.player.lands = [
      basicLand('B0', 'Swamp', 'B'),
      basicLand('G0', 'Forest', 'G'),
      basicLand('G1', 'Forest', 'G'),
    ]
    const mk = (id: string) => ({
      instanceId: id,
      defId: 'r',
      name: 'Rollicking Throng',
      typeLine: 'Creature — Satyr',
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
      isReveler: true,
      isArtifact: false,
      isEnchantment: false,
      isGod: false,
    })
    state.challenge.battlefield = [mk('r1'), mk('r2'), mk('r3')]
    state = castFromHand(state, 'mp', { targetId: 'r1' })
    expect(state.challenge.battlefield.length).toBe(0)
  })
})
