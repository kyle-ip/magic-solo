import { makeInstance } from './buildDeck'
import {
  beginPlayerTurn,
  checkHydraWin,
  damagePlayer,
  destroyChallengePermanent,
  effectiveToughness,
  headsOf,
} from './helpers'
import { pushLog } from './log'
import type { CardDef, CardInstance, GameState, SetupConfig } from './types'
import { expandLibrary, resetIdSeq } from './buildDeck'
import { baseState } from './helpers'
import { resetLogSeq } from './log'

export function startHydra(
  defs: CardDef[],
  theme: GameState['theme'],
  config: SetupConfig,
): GameState {
  resetIdSeq()
  resetLogSeq()
  const headDef = defs.find((d) => d.name === 'Hydra Head')
  if (!headDef) throw new Error('Hydra Head missing')

  const starting = Math.min(4, Math.max(1, config.startingHeads ?? 2))
  const heads: CardInstance[] = []
  for (let i = 0; i < starting; i += 1) heads.push(makeInstance(headDef))

  // Library: full deck minus starting heads taken from Hydra Head copies
  const library = expandLibrary(defs)
  let removed = 0
  const filtered = library.filter((c) => {
    if (c.name === 'Hydra Head' && removed < starting) {
      removed += 1
      return false
    }
    return true
  })

  let state: GameState = {
    ...baseState('tfth', theme, config),
    challenge: {
      library: filtered,
      battlefield: heads,
      graveyard: [],
    },
  }
  state = pushLog(state, 'hydraStart', 'info', { n: starting })
  state = beginPlayerTurn(state)
  // Official: you go first, don't draw — muster already granted as simplified draw replacement
  return state
}

export function castHydraCard(state: GameState, card: CardInstance): GameState {
  let next = pushLog(state, 'hydraCasts', 'cast', { name: card.name })

  if (card.isHead) {
    next = {
      ...next,
      challenge: {
        ...next.challenge,
        battlefield: [...next.challenge.battlefield, { ...card, markedDamage: 0 }],
      },
    }
    return pushLog(next, 'entersBattlefield', 'bad', { name: card.name })
  }

  // Sorceries
  switch (card.name) {
    case 'Disorienting Glower':
      next = {
        ...next,
        flags: { ...next.flags, cannotCastSpells: true },
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return pushLog(next, 'cannotCastUntilHydra', 'bad')

    case 'Distract the Hydra':
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
        prompt: {
          id: `p-${Date.now()}`,
          kind: 'distract_choice',
          titleKey: 'distractHydra',
          messageKey: 'distractHydraMsg',
          resume: 'distract',
          options: [
            { id: 'sacrifice', labelKey: 'sacrificeCreature' },
            { id: 'life', labelKey: 'lose3Life' },
          ],
        },
      }
      return next

    case 'Grown from the Stump': {
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      const headsInGy = next.challenge.graveyard.filter((c) => c.name === 'Hydra Head')
      if (headsInGy.length >= 2) {
        const revive = headsInGy.slice(0, 2)
        next = {
          ...next,
          challenge: {
            ...next.challenge,
            graveyard: next.challenge.graveyard.filter(
              (c) => !revive.some((r) => r.instanceId === c.instanceId),
            ),
            battlefield: [
              ...next.challenge.battlefield,
              ...revive.map((h) => ({ ...h, markedDamage: 0, tapped: false })),
            ],
          },
        }
        return pushLog(next, 'grownFromStumpTwo', 'bad')
      }
      // Reveal until Head
      const lib = [...next.challenge.library]
      const milled: CardInstance[] = []
      let found: CardInstance | null = null
      while (lib.length) {
        const top = lib.shift()!
        if (top.isHead) {
          found = top
          break
        }
        milled.push(top)
      }
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          library: lib,
          graveyard: [...milled, ...next.challenge.graveyard],
          battlefield: found
            ? [...next.challenge.battlefield, { ...found, markedDamage: 0 }]
            : next.challenge.battlefield,
        },
      }
      return pushLog(next, found ? 'grownFromStumpFinds' : 'grownFromStumpNone', 'bad', found ? { name: found.name } : undefined)
    }

    case "Hydra's Impenetrable Hide":
      next = {
        ...next,
        flags: { ...next.flags, headsIndestructible: true },
        challenge: {
          ...next.challenge,
          battlefield: next.challenge.battlefield.map((c) =>
            c.isHead ? { ...c, indestructible: true } : c,
          ),
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return pushLog(next, 'headsIndestructible', 'bad')

    case 'Neck Tangle': {
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      const heads = headsOf(next)
      if (heads.length >= 5) {
        const tap = heads.slice(0, 2).map((h) => h.instanceId)
        next = {
          ...next,
          challenge: {
            ...next.challenge,
            battlefield: next.challenge.battlefield.map((c) =>
              tap.includes(c.instanceId)
                ? { ...c, tapped: true, skipUntap: true }
                : c,
            ),
          },
        }
        return pushLog(next, 'neckTangleTaps', 'info')
      }
      const top = next.challenge.library[0]
      if (!top) return pushLog(next, 'neckTangleEmpty', 'info')
      next = {
        ...next,
        challenge: { ...next.challenge, library: next.challenge.library.slice(1) },
      }
      return castHydraCard(next, top)
    }

    case 'Noxious Hydra Breath':
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
        prompt: {
          id: `p-${Date.now()}`,
          kind: 'noxious_mode',
          titleKey: 'noxiousBreath',
          messageKey: 'chooseOne',
          resume: 'noxious',
          options: [
            { id: 'damage', labelKey: 'deal5ToYou' },
            { id: 'destroy', labelKey: 'destroyTapped' },
          ],
        },
      }
      return next

    case 'Strike the Weak Spot': {
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      // Hydra casting this against itself per oracle — destroy target Head (player chooses / auto weakest)
      const heads = headsOf(next).sort(
        (a, b) => effectiveToughness(a) - effectiveToughness(b),
      )
      if (!heads.length) return pushLog(next, 'strikeNoHeads', 'info')
      const target = heads[0]
      const elite = target.isElite
      next = destroyChallengePermanent(next, target.instanceId)
      if (elite) {
        next = {
          ...next,
          flags: { ...next.flags, extraChallengeTurn: true },
        }
        next = pushLog(next, 'eliteHeadExtraTurn', 'bad')
      }
      return next
    }

    case 'Swallow the Hero Whole': {
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      if (next.player.creatures.length === 0) {
        return pushLog(next, 'swallowNoCreatures', 'info')
      }
      if (next.player.creatures.length === 1) {
        return exilePlayerCreature(next, next.player.creatures[0].instanceId)
      }
      next = {
        ...next,
        prompt: {
          id: `p-${Date.now()}`,
          kind: 'choose_exile_creature',
          titleKey: 'swallowHero',
          messageKey: 'exileCreatureMsg',
          resume: 'swallow',
          options: next.player.creatures.map((c) => ({
            id: c.instanceId,
            labelKey: 'exileCreatureOpt',
            labelParams: { pt: `${c.power}/${c.toughness}` },
            name: c.name,
          })),
        },
      }
      return next
    }

    case 'Torn Between Heads': {
      const heads = headsOf(next).slice(0, 2).map((h) => h.instanceId)
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          battlefield: next.challenge.battlefield.map((c) =>
            heads.includes(c.instanceId)
              ? { ...c, tapped: true, skipUntap: true }
              : c,
          ),
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      next = pushLog(next, 'tornBetweenHeads', 'info')
      return damagePlayer(next, 5)
    }

    case 'Unified Lunge': {
      const x = headsOf(next).length
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return damagePlayer(next, x)
    }

    default:
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return pushLog(next, 'resolvesGeneric', 'info', { name: card.name })
  }
}

function exilePlayerCreature(state: GameState, id: string): GameState {
  const creature = state.player.creatures.find((c) => c.instanceId === id)
  if (!creature) return state
  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      creatures: state.player.creatures.filter((c) => c.instanceId !== id),
      exile: [...state.player.exile, creature],
    },
    flags: { ...state.flags, swallowExileActive: true },
  }
  return pushLog(next, 'exiledSwallow', 'bad', { name: creature.name })
}

export function resolveHydraPrompt(
  state: GameState,
  optionId: string,
): GameState {
  if (!state.prompt) return state
  const kind = state.prompt.kind
  let next: GameState = { ...state, prompt: null }

  if (kind === 'distract_choice') {
    if (optionId === 'life' || next.player.creatures.length === 0) {
      return damagePlayer(next, 3)
    }
    // Sacrifice first creature, tap a head
    const [sac, ...rest] = next.player.creatures
    next = {
      ...next,
      player: {
        ...next.player,
        creatures: rest,
        graveyard: [sac, ...next.player.graveyard],
      },
    }
    next = pushLog(next, 'youSacrifice', 'info', { name: sac.name })
    const head = headsOf(next)[0]
    if (head) {
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          battlefield: next.challenge.battlefield.map((c) =>
            c.instanceId === head.instanceId ? { ...c, tapped: true } : c,
          ),
        },
      }
      next = pushLog(next, 'headTapped', 'good', { name: head.name })
    }
    return next
  }

  if (kind === 'noxious_mode') {
    if (optionId === 'destroy') {
      const tapped = next.player.creatures.filter((c) => c.tapped)
      next = {
        ...next,
        player: {
          ...next.player,
          creatures: next.player.creatures.filter((c) => !c.tapped),
          graveyard: [...tapped, ...next.player.graveyard],
        },
      }
      return pushLog(next, 'noxiousBreath', 'bad', { n: tapped.length })
    }
    return damagePlayer(next, 5)
  }

  if (kind === 'choose_exile_creature') {
    return exilePlayerCreature(next, optionId)
  }

  if (kind === 'choose_head_damage' && next.prompt?.amount) {
    // handled in reducer with amount — fallthrough
  }

  return next
}

export function applyHeadDamageChoice(
  state: GameState,
  headId: string,
  amount: number,
): GameState {
  let next: GameState = { ...state, prompt: null }
  const card = next.challenge.battlefield.find((c) => c.instanceId === headId)
  if (!card) return next
  if (card.indestructible || next.flags.headsIndestructible) {
    return pushLog(next, 'damagePrevented', 'info')
  }
  const updated = { ...card, markedDamage: card.markedDamage + amount }
  next = {
    ...next,
    challenge: {
      ...next.challenge,
      battlefield: next.challenge.battlefield.map((c) =>
        c.instanceId === headId ? updated : c,
      ),
    },
  }
  next = pushLog(next, 'takesDamage', 'info', { name: card.name, n: amount })
  if (effectiveToughness(updated) <= 0) {
    next = destroyChallengePermanent(next, headId)
  }
  return next
}

export function runHydraTurn(state: GameState): GameState {
  let next: GameState = {
    ...state,
    activeSide: 'challenge',
    phase: 'hydra',
    selectedAttackers: [],
    attackAssignments: {},
  }
  next = pushLog(next, 'hydraTurn', 'cast')

  // Clear cannot cast from previous glower at start of hydra turn (after player's restricted turn)
  // Rules: until Hydra's next turn — so clear at beginning of this hydra turn
  next = {
    ...next,
    flags: {
      ...next.flags,
      cannotCastSpells: false,
      headsIndestructible: false,
    },
    challenge: {
      ...next.challenge,
      battlefield: next.challenge.battlefield.map((c) => ({
        ...c,
        indestructible: false,
        tapped: c.skipUntap ? c.tapped : false,
        skipUntap: false,
        // Untap heads that aren't skipUntap
      })),
    },
  }
  // Proper untap
  next = {
    ...next,
    challenge: {
      ...next.challenge,
      battlefield: next.challenge.battlefield.map((c) => {
        if (!c.isHead) return c
        if (c.skipUntap) return { ...c, skipUntap: false }
        return { ...c, tapped: false }
      }),
    },
  }

  // Return swallowed creatures if any when a head left — handled on destroy; at hydra turn clear flag returns
  if (next.flags.swallowExileActive && next.player.exile.length) {
    // Keep until a head leaves — already returned in destroyChallengePermanent? Add return on head leave in helpers
  }

  // Cast top card
  const top = next.challenge.library[0]
  if (top) {
    next = {
      ...next,
      challenge: { ...next.challenge, library: next.challenge.library.slice(1) },
      revealed: [top],
    }
    next = castHydraCard(next, top)
    if (next.prompt) return next
  } else {
    next = pushLog(next, 'hydraLibraryEmpty', 'info')
  }

  // End step head triggers
  for (const head of headsOf(next)) {
    if (head.name === 'Savage Vigor Head') {
      const extra = next.challenge.library[0]
      if (extra) {
        next = {
          ...next,
          challenge: { ...next.challenge, library: next.challenge.library.slice(1) },
        }
        next = castHydraCard(next, extra)
        if (next.prompt) return next
      }
    }
    if (head.name === 'Shrieking Titan Head') {
      // Discard → lose 2 life as simplified
      next = damagePlayer(next, 2)
      next = pushLog(next, 'shriekingDiscard', 'bad')
    }
    if (head.name === 'Snapping Fang Head') {
      next = damagePlayer(next, 1)
    }
  }

  // Breath damage from untapped heads
  const untapped = headsOf(next).filter((h) => !h.tapped)
  let breath = 0
  for (const h of untapped) {
    breath += h.isElite ? 2 : 1
  }
  if (breath > 0) {
    next = damagePlayer(next, breath)
    next = pushLog(next, 'hydraBreathHeads', 'bad', { n: breath })
  }

  if (next.status !== 'playing') return next

  // Extra turn?
  if (next.flags.extraChallengeTurn) {
    next = {
      ...next,
      flags: { ...next.flags, extraChallengeTurn: false },
    }
    next = pushLog(next, 'hydraExtraTurn', 'bad')
    return runHydraTurn(next)
  }

  next = checkHydraWin(next)
  if (next.status !== 'playing') return next
  return beginPlayerTurn(next)
}

/** When a head leaves and swallow is active, return exiled creatures */
export function maybeReturnSwallow(state: GameState): GameState {
  if (!state.flags.swallowExileActive || !state.player.exile.length) return state
  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      creatures: [
        ...state.player.exile.map((c) => ({
          ...c,
          summoningSickness: true,
          tapped: false,
          markedDamage: 0,
        })),
        ...state.player.creatures,
      ],
      exile: [],
    },
    flags: { ...state.flags, swallowExileActive: false },
  }
  return pushLog(next, 'swallowReturn', 'good')
}
