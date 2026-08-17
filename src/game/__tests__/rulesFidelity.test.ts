import { castGodCard, resolveGodCombat } from '../god'
import { resolvePlayerCombat } from '../combat'
import { resolveHordeCombat } from '../horde'
import { describe, expect, it } from 'vitest'
import type { CardInstance, GameState } from '../types'
import {
  applyHeroReward,
  beginPlayerTurn,
  checkHydraWin,
  clearSwallowWindow,
  dealDamageToChallengeCreature,
  destroyChallengePermanent,
  emptyFlags,
  tickHydraHide,
} from '../helpers'
import { emptyManaPool } from '../mana'
import { castFromHand, playLand, canAfford } from '../playerCast'
import { buildPlayerLibrary, drawCards } from '../playerDraw'
import { gameReducer, createInitialSetup } from '../reducer'
import { makePlayerCardInstance } from '../playerDraw'
import { findCardDef } from '../playerDecks'

function card(partial: Partial<CardInstance> & Pick<CardInstance, 'name'>): CardInstance {
  return {
    instanceId: partial.instanceId ?? `id-${partial.name}`,
    defId: partial.defId ?? 'def',
    name: partial.name,
    typeLine: partial.typeLine ?? 'Creature',
    oracleText: partial.oracleText ?? '',
    power: partial.power !== undefined ? partial.power : 2,
    toughness: partial.toughness !== undefined ? partial.toughness : 3,
    markedDamage: partial.markedDamage ?? 0,
    tapped: partial.tapped ?? false,
    skipUntap: partial.skipUntap ?? false,
    indestructible: partial.indestructible ?? false,
    keywords: partial.keywords ?? [],
    image: '',
    isHead: partial.isHead ?? false,
    isElite: partial.isElite ?? false,
    isMinotaur: partial.isMinotaur ?? false,
    isReveler: partial.isReveler ?? false,
    isArtifact: partial.isArtifact ?? false,
    isEnchantment: partial.isEnchantment ?? false,
    isGod: partial.isGod ?? false,
  }
}

function basePlaying(code: GameState['code'] = 'tfth'): GameState {
  return {
    code,
    theme: code === 'tfth' ? 'hydra' : code === 'tbth' ? 'horde' : 'god',
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

describe('A1 challenge damage cleanup', () => {
  it('clears marked damage on challenge creatures at beginPlayerTurn', () => {
    let state = basePlaying()
    const head = card({
      name: 'Hydra Head',
      isHead: true,
      power: 0,
      toughness: 3,
      markedDamage: 2,
    })
    state.challenge.battlefield = [head]
    state = beginPlayerTurn(state)
    expect(state.challenge.battlefield[0].markedDamage).toBe(0)
  })
})

describe('A2 Impenetrable Hide', () => {
  it('allows damage but blocks destroy while indestructible', () => {
    let state = basePlaying()
    const head = card({
      name: 'Hydra Head',
      isHead: true,
      power: 0,
      toughness: 3,
      indestructible: true,
    })
    state.challenge.battlefield = [head]
    state.flags.headsIndestructible = true
    state = dealDamageToChallengeCreature(state, head.instanceId, 2)
    expect(state.challenge.battlefield).toHaveLength(1)
    expect(state.challenge.battlefield[0].markedDamage).toBe(2)
    state = destroyChallengePermanent(state, head.instanceId)
    expect(state.challenge.battlefield).toHaveLength(1)
  })

  it('expires after two Hydra turn-ends', () => {
    let state = basePlaying()
    state.flags.headsIndestructible = true
    state.flags.hideExpiresInHydraEnds = 2
    state.challenge.battlefield = [
      card({ name: 'Hydra Head', isHead: true, indestructible: true, power: 0, toughness: 3 }),
    ]
    state = tickHydraHide(state)
    expect(state.flags.headsIndestructible).toBe(true)
    expect(state.flags.hideExpiresInHydraEnds).toBe(1)
    state = tickHydraHide(state)
    expect(state.flags.headsIndestructible).toBe(false)
    expect(state.challenge.battlefield[0].indestructible).toBe(false)
  })
})

describe('A3/A4 Heroâ€™s Reward', () => {
  it('Refreshing Elixir grants 5 life once', () => {
    let state = basePlaying('tbth')
    const elixir = card({
      name: 'Refreshing Elixir',
      isArtifact: true,
      power: null,
      toughness: null,
      oracleText:
        "Hero's Reward â€?When Refreshing Elixir is put into a graveyard from anywhere, each player gains 5 life.",
    })
    state = applyHeroReward(state, elixir)
    expect(state.player.life).toBe(25)
  })

  it('Plundered Statue draws a card once', () => {
    let state = basePlaying('tbth')
    const forest = findCardDef('dce15387-4114-4b3e-91aa-5b42b45c44ac')!
    state.player.library = [makePlayerCardInstance(forest)]
    const statue = card({
      name: 'Plundered Statue',
      isArtifact: true,
      power: null,
      toughness: null,
      oracleText:
        "Hero's Reward â€?When Plundered Statue is put into a graveyard from anywhere, each player draws a card.",
    })
    state = applyHeroReward(state, statue)
    expect(state.player.hand).toHaveLength(1)
    expect(state.player.library).toHaveLength(0)
  })

  it('Massacre Totem mills with nested artifact rewards', () => {
    let state = basePlaying('tbth')
    const elixir = card({
      name: 'Refreshing Elixir',
      instanceId: 'elixir-1',
      isArtifact: true,
      power: null,
      toughness: null,
      oracleText:
        "Hero's Reward â€?When Refreshing Elixir is put into a graveyard from anywhere, each player gains 5 life.",
    })
    const fillers = Array.from({ length: 6 }, (_, i) =>
      card({ name: `Filler ${i}`, instanceId: `f-${i}`, isMinotaur: true }),
    )
    state.challenge.library = [elixir, ...fillers]
    const totem = card({
      name: 'Massacre Totem',
      isArtifact: true,
      power: null,
      toughness: null,
      oracleText:
        "Hero's Reward â€?When Massacre Totem is put into a graveyard from anywhere, put the top seven cards of the Horde's library into its graveyard.",
    })
    state = applyHeroReward(state, totem)
    expect(state.challenge.library).toHaveLength(0)
    expect(state.player.life).toBe(25)
  })
})

describe('B2 Swallow window', () => {
  it('expires at start of next Hydra turn without returning creatures', () => {
    let state = basePlaying()
    state.flags.swallowExileActive = true
    state.player.exile = [
      {
        instanceId: 'pl-1',
        defId: 'x',
        name: 'Soldier',
        power: 2,
        toughness: 2,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
    ]
    state = clearSwallowWindow(state)
    expect(state.flags.swallowExileActive).toBe(false)
    expect(state.player.exile).toHaveLength(1)
    expect(state.player.creatures).toHaveLength(0)
  })
})

describe('B3 Xenagos SBA', () => {
  it('destroys Xenagos with lethal damage when last reveler leaves', () => {
    let state = basePlaying('tdag')
    const god = card({
      name: 'Xenagos Ascended',
      isGod: true,
      power: 8,
      toughness: 8,
      markedDamage: 8,
    })
    const reveler = card({
      name: 'Rollicking Throng',
      isReveler: true,
      power: 1,
      toughness: 1,
    })
    state.challenge.battlefield = [god, reveler]
    state = destroyChallengePermanent(state, reveler.instanceId)
    expect(state.status).toBe('won')
  })
})

describe('C Hydra win timing', () => {
  it('checkHydraWin only when no heads', () => {
    let state = basePlaying()
    state.challenge.battlefield = [
      card({ name: 'Hydra Head', isHead: true, power: 0, toughness: 3 }),
    ]
    state = checkHydraWin(state)
    expect(state.status).toBe('playing')
    state.challenge.battlefield = []
    state = checkHydraWin(state)
    expect(state.status).toBe('won')
  })
})

describe('Constructed player deck', () => {
  it('starts with 60-card library then 7-card hand', () => {
    const setup = createInitialSetup('tfth')
    let started = gameReducer(setup, {
      type: 'START',
      config: { code: 'tfth', startingHeads: 2, playerDeckId: 'wildfire' },
    })
    expect(started.prompt?.kind).toBe('choose_mulligan')
    expect(started.player.hand).toHaveLength(7)
    expect(started.player.library).toHaveLength(53)
    expect(started.turnNumber).toBe(0)
    started = gameReducer(started, { type: 'ANSWER_PROMPT', optionId: 'keep' })
    expect(started.prompt).toBeNull()
    expect(started.turnNumber).toBe(1)
    expect(started.player.hand).toHaveLength(7)
  })

  it.each(['merfolk', 'akroan', 'nessian', 'humans', 'spirits', 'jund'] as const)(
    'starts %s deck on each challenge',
    (deckId) => {
      for (const code of ['tfth', 'tbth', 'tdag'] as const) {
        const setup = createInitialSetup(code)
        let started = gameReducer(setup, {
          type: 'START',
          config: {
            code,
            startingHeads: 1,
            playerTurnsBeforeHorde: 3,
            playerDeckId: deckId,
          },
        })
        expect(started.status).toBe('playing')
        expect(started.prompt?.kind).toBe('choose_mulligan')
        started = gameReducer(started, { type: 'ANSWER_PROMPT', optionId: 'keep' })
        expect(started.playerDeckId).toBe(deckId)
        expect(started.player.hand).toHaveLength(7)
        expect(started.player.library).toHaveLength(53)
        expect(started.turnNumber).toBe(1)
      }
    },
  )

  it('skips draw on turn 1 then draws on turn 2', () => {
    let state = basePlaying()
    state.turnNumber = 0
    state.player.library = buildPlayerLibrary('wildfire').slice(0, 5)
    state = beginPlayerTurn(state)
    expect(state.turnNumber).toBe(1)
    expect(state.player.hand).toHaveLength(0)
    state = beginPlayerTurn(state)
    expect(state.turnNumber).toBe(2)
    expect(state.player.hand).toHaveLength(1)
  })

  it('plays a land and casts a creature with auto-tap mana', () => {
    let state = basePlaying()
    const forest = findCardDef('dce15387-4114-4b3e-91aa-5b42b45c44ac')!
    const mystic = findCardDef('08b9a296-3b76-4f8f-9d71-7c9af92bb3b4')!
    const f1 = makePlayerCardInstance(forest)
    const m1 = makePlayerCardInstance(mystic)
    state.player.hand = [f1, m1]
    state = playLand(state, f1.instanceId)
    expect(state.player.lands).toHaveLength(1)
    expect(canAfford(state, '{G}')).toBe(true)
    state = castFromHand(state, m1.instanceId)
    expect(state.player.creatures).toHaveLength(1)
    expect(state.player.creatures[0].name).toBe('Elvish Mystic')
    expect(state.player.lands[0].tapped).toBe(true)
  })

  it('Fog prevents combat damage flag', () => {
    let state = basePlaying()
    const fog = findCardDef('bbc3152e-7b3b-4ac6-8b33-abfebde216aa')!
    const forest = findCardDef('dce15387-4114-4b3e-91aa-5b42b45c44ac')!
    const f = makePlayerCardInstance(forest)
    const g = makePlayerCardInstance(fog)
    state.player.hand = [f, g]
    state = playLand(state, f.instanceId)
    state = castFromHand(state, g.instanceId)
    expect(state.flags.preventCombatDamageThisTurn).toBe(true)
    expect(state.player.graveyard.some((c) => c.name === 'Fog')).toBe(true)
  })

  it('decks out when drawing from empty library', () => {
    let state = basePlaying()
    state.player.library = []
    state = drawCards(state, 1)
    expect(state.status).toBe('lost')
    expect(state.resultKey).toBe('emptyLibrary')
  })

  it('Lightning Strike mills the Horde', () => {
    let state = basePlaying('tbth')
    const strike = findCardDef('88b13bc0-da54-4c3b-917c-7c8345a329f5')!
    const mountain = findCardDef('2a844b96-6616-4c39-8f4f-5d14a3b2bd55')!
    const m1 = makePlayerCardInstance(mountain)
    const m2 = makePlayerCardInstance(mountain)
    const s1 = makePlayerCardInstance(strike)
    state.player.hand = [m1, m2, s1]
    state = playLand(state, m1.instanceId)
    state.player.landsPlayedThisTurn = 0
    state = playLand(state, m2.instanceId)
    state.challenge.library = [
      card({ name: 'Minotaur', instanceId: 'h1' }),
      card({ name: 'Minotaur', instanceId: 'h2' }),
      card({ name: 'Minotaur', instanceId: 'h3' }),
    ]
    state = castFromHand(state, s1.instanceId, { targetId: 'horde' })
    expect(state.challenge.library).toHaveLength(0)
  })
})

describe('Impulsive Destruction', () => {
  it('pauses on a damage prompt instead of auto-damaging', () => {
    let state = basePlaying('tdag')
    state.activeSide = 'challenge'
    state = castGodCard(
      state,
      card({
        name: 'Impulsive Destruction',
        typeLine: 'Sorcery',
        power: null,
        toughness: null,
        isEnchantment: false,
      }),
    )
    expect(state.prompt?.kind).toBe('impulsive_destruction')
    expect(state.player.life).toBe(20)
    expect(state.prompt?.options).toEqual([
      { id: 'damage', labelKey: 'take3Damage' },
    ])
  })

  it('deals 3 after answering the prompt', () => {
    let state = basePlaying('tdag')
    state.activeSide = 'challenge'
    state = castGodCard(
      state,
      card({
        name: 'Impulsive Destruction',
        typeLine: 'Sorcery',
        power: null,
        toughness: null,
      }),
    )
    state = gameReducer(state, { type: 'ANSWER_PROMPT', optionId: 'damage' })
    expect(state.prompt).toBeNull()
    expect(state.player.life).toBe(17)
  })
})

describe('God combat blocker damage', () => {
  it('uses remaining toughness and marks survivors', () => {
    let state = basePlaying('tdag')
    state.activeSide = 'challenge'
    const attacker = card({
      name: 'Rollicking Throng',
      instanceId: 'atk',
      isReveler: true,
      power: 3,
      toughness: 3,
    })
    state.revealed = [attacker]
    state.challenge.battlefield = [attacker]
    state.player.creatures = [
      {
        instanceId: 'b1',
        defId: 'b1',
        name: 'Wall',
        power: 0,
        toughness: 4,
        markedDamage: 2,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
    ]
    state.blockAssignments = { b1: 'atk' }
    state = resolveGodCombat(state)
    // 3 damage into 2 remaining toughness â†?blocker dies
    expect(state.player.creatures).toHaveLength(0)
    expect(state.player.graveyard.some((c) => c.name === 'Wall')).toBe(true)
  })

  it('does not kill a blocker when power is below remaining toughness', () => {
    let state = basePlaying('tdag')
    state.activeSide = 'challenge'
    const attacker = card({
      name: 'Rollicking Throng',
      instanceId: 'atk',
      isReveler: true,
      power: 2,
      toughness: 2,
    })
    state.revealed = [attacker]
    state.challenge.battlefield = [attacker]
    state.player.creatures = [
      {
        instanceId: 'b1',
        defId: 'b1',
        name: 'Wall',
        power: 0,
        toughness: 5,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
    ]
    state.blockAssignments = { b1: 'atk' }
    state = resolveGodCombat(state)
    expect(state.player.creatures).toHaveLength(1)
    // beginPlayerTurn at end of God combat clears marked damage
    expect(state.player.creatures[0].name).toBe('Wall')
    expect(state.player.life).toBe(20)
  })
})

describe('Player combat first/double strike and trample', () => {
  it('first strike deals damage once (not doubled)', () => {
    let state = basePlaying('tfth')
    const head = card({
      name: 'Hydra Head',
      instanceId: 'h1',
      isHead: true,
      power: 0,
      toughness: 4,
    })
    state.challenge.battlefield = [head]
    state.player.creatures = [
      {
        instanceId: 'a1',
        defId: 'a1',
        name: 'Swiftclaw',
        power: 3,
        toughness: 1,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: ['first strike'],
        image: '',
      },
    ]
    state.selectedAttackers = ['a1']
    state.attackAssignments = { a1: 'h1' }
    state = resolvePlayerCombat(state)
    expect(state.challenge.battlefield[0]?.markedDamage ?? 0).toBe(3)
  })

  it('double strike deals damage in both steps', () => {
    let state = basePlaying('tfth')
    const head = card({
      name: 'Hydra Head',
      instanceId: 'h1',
      isHead: true,
      power: 0,
      toughness: 8,
    })
    state.challenge.battlefield = [head]
    state.player.creatures = [
      {
        instanceId: 'a1',
        defId: 'a1',
        name: 'Doubler',
        power: 2,
        toughness: 2,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: ['double strike'],
        image: '',
      },
    ]
    state.selectedAttackers = ['a1']
    state.attackAssignments = { a1: 'h1' }
    state = resolvePlayerCombat(state)
    expect(state.challenge.battlefield[0]?.markedDamage ?? 0).toBe(4)
  })

  it('trample excess spills to another Hydra Head', () => {
    let state = basePlaying('tfth')
    const h1 = card({
      name: 'Hydra Head',
      instanceId: 'h1',
      isHead: true,
      power: 0,
      toughness: 2,
    })
    const h2 = card({
      name: 'Hydra Head',
      instanceId: 'h2',
      isHead: true,
      power: 0,
      toughness: 5,
    })
    state.challenge.battlefield = [h1, h2]
    state.player.creatures = [
      {
        instanceId: 'a1',
        defId: 'a1',
        name: 'Beast',
        power: 5,
        toughness: 3,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: ['trample'],
        image: '',
      },
    ]
    state.selectedAttackers = ['a1']
    state.attackAssignments = { a1: 'h1' }
    state = resolvePlayerCombat(state)
    const remaining = state.challenge.battlefield
    // h1 lethal (2) â†?destroyed; excess 3 on h2
    expect(remaining.find((c) => c.instanceId === 'h1')).toBeUndefined()
    expect(remaining.find((c) => c.instanceId === 'h2')?.markedDamage).toBe(3)
  })

  it('trample excess spills to Xenagos without Champion', () => {
    let state = basePlaying('tdag')
    const reveler = card({
      name: 'Rollicking Throng',
      instanceId: 'r1',
      isReveler: true,
      power: 2,
      toughness: 2,
    })
    const xenagos = card({
      name: 'Xenagos Ascended',
      instanceId: 'x1',
      isGod: true,
      power: 0,
      toughness: 7,
      indestructible: true,
    })
    state.challenge.battlefield = [reveler, xenagos]
    state.player.creatures = [
      {
        instanceId: 'a1',
        defId: 'a1',
        name: 'Slaughterhorn',
        power: 5,
        toughness: 2,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: ['trample'],
        image: '',
      },
    ]
    state.selectedAttackers = ['a1']
    state.attackAssignments = { a1: 'r1' }
    state = resolvePlayerCombat(state)
    expect(state.challenge.battlefield.find((c) => c.instanceId === 'r1')).toBeUndefined()
    expect(state.challenge.battlefield.find((c) => c.instanceId === 'x1')?.markedDamage).toBe(3)
  })
})

describe('Horde combat first strike and deathtouch', () => {
  it('Descend first strike kills a blocker before it deals damage back', () => {
    let state = basePlaying('tbth')
    state.activeSide = 'challenge'
    state.flags = { ...state.flags, descendPrey: true }
    const atk = card({
      name: 'Minotaur',
      instanceId: 'm1',
      isMinotaur: true,
      power: 2,
      toughness: 3,
    })
    state.challenge.battlefield = [atk]
    state.player.creatures = [
      {
        instanceId: 'b1',
        defId: 'b1',
        name: 'Bear',
        power: 5,
        toughness: 2,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
    ]
    state.blockAssignments = { b1: 'm1' }
    state = resolveHordeCombat(state)
    expect(state.player.creatures).toHaveLength(0)
    expect(state.challenge.battlefield.some((c) => c.instanceId === 'm1')).toBe(
      true,
    )
    expect(state.player.life).toBe(20)
  })

  it('Touch deathtouch kills a larger blocker with 1 damage assigned', () => {
    let state = basePlaying('tbth')
    state.activeSide = 'challenge'
    state.flags = { ...state.flags, touchHorned: true }
    const atk = card({
      name: 'Minotaur',
      instanceId: 'm1',
      isMinotaur: true,
      power: 1,
      toughness: 3,
    })
    state.challenge.battlefield = [atk]
    state.player.creatures = [
      {
        instanceId: 'b1',
        defId: 'b1',
        name: 'Wall',
        power: 0,
        toughness: 5,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: [],
        image: '',
      },
    ]
    state.blockAssignments = { b1: 'm1' }
    state = resolveHordeCombat(state)
    expect(state.player.creatures).toHaveLength(0)
    expect(state.challenge.battlefield.some((c) => c.instanceId === 'm1')).toBe(
      true,
    )
  })

  it('blocker first strike can kill the Minotaur before normal damage', () => {
    let state = basePlaying('tbth')
    state.activeSide = 'challenge'
    const atk = card({
      name: 'Minotaur',
      instanceId: 'm1',
      isMinotaur: true,
      power: 4,
      toughness: 2,
    })
    state.challenge.battlefield = [atk]
    state.player.creatures = [
      {
        instanceId: 'b1',
        defId: 'b1',
        name: 'Spear',
        power: 2,
        toughness: 1,
        markedDamage: 0,
        tapped: false,
        summoningSickness: false,
        keywords: ['first strike'],
        image: '',
      },
    ]
    state.blockAssignments = { b1: 'm1' }
    state = resolveHordeCombat(state)
    expect(state.challenge.battlefield.find((c) => c.instanceId === 'm1')).toBeUndefined()
    expect(state.player.creatures).toHaveLength(1)
    expect(state.player.life).toBe(20)
  })
})
