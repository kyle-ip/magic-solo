import { makeInstance } from './buildDeck'
import {
  beginPlayerTurn,
  buryPlayerCreatures,
  checkHydraWin,
  damagePlayer,
  destroyChallengePermanent,
  effectiveToughness,
  headsOf,
  isIndestructible,
} from './helpers'
import { pushLog } from './log'
import type { CardDef, CardInstance, GameState, PlayerCreature, SetupConfig } from './types'
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
  if (state.player.heroes.length) {
    state = pushLog(state, 'heroesReady', 'info', { n: state.player.heroes.length })
  }
  state = beginPlayerTurn(state)
  return state
}

export function castHydraCard(state: GameState, card: CardInstance): GameState {
  let next = pushLog(state, 'hydraCasts', 'cast', { name: card.name })

  if (card.isHead) {
    next = {
      ...next,
      challenge: {
        ...next.challenge,
        battlefield: [
          ...next.challenge.battlefield,
          {
            ...card,
            markedDamage: 0,
            indestructible: next.flags.headsIndestructible,
          },
        ],
      },
    }
    return pushLog(next, 'entersBattlefield', 'bad', { name: card.name })
  }

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
              ...revive.map((h) => ({
                ...h,
                markedDamage: 0,
                tapped: false,
                indestructible: next.flags.headsIndestructible,
              })),
            ],
          },
        }
        return pushLog(next, 'grownFromStumpTwo', 'bad')
      }
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
            ? [
                ...next.challenge.battlefield,
                {
                  ...found,
                  markedDamage: 0,
                  indestructible: next.flags.headsIndestructible,
                },
              ]
            : next.challenge.battlefield,
        },
      }
      return pushLog(
        next,
        found ? 'grownFromStumpFinds' : 'grownFromStumpNone',
        'bad',
        found ? { name: found.name } : undefined,
      )
    }

    case "Hydra's Impenetrable Hide":
      next = {
        ...next,
        flags: {
          ...next.flags,
          headsIndestructible: true,
          // Survives through this Hydra turn-end and the next (official: until end of Hydra's next turn)
          hideExpiresInHydraEnds: 2,
        },
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
      const heads = headsOf(next)
      if (!heads.length) return pushLog(next, 'strikeNoHeads', 'info')
      if (heads.length === 1) {
        return resolveStrikeHead(next, heads[0].instanceId)
      }
      next = {
        ...next,
        prompt: {
          id: `p-${Date.now()}`,
          kind: 'choose_strike_head',
          titleKey: 'strikeWeakSpot',
          messageKey: 'chooseHeadDestroy',
          resume: 'strike_head',
          options: heads.map((h) => ({
            id: h.instanceId,
            labelKey: 'chooseHeadOpt',
            labelParams: {
              pt: `${h.power ?? 0}/${effectiveToughness(h)}`,
            },
            name: h.name,
          })),
        },
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

export function resolveStrikeHead(state: GameState, headId: string): GameState {
  let next: GameState = { ...state, prompt: null }
  const target = next.challenge.battlefield.find((c) => c.instanceId === headId)
  if (!target || !target.isHead) return pushLog(next, 'strikeNoHeads', 'info')
  const elite = target.isElite
  next = destroyChallengePermanent(next, target.instanceId)
  if (elite && next.status === 'playing') {
    // Only if destroy succeeded (not prevented by indestructible)
    const stillThere = next.challenge.battlefield.some((c) => c.instanceId === headId)
    if (!stillThere) {
      next = {
        ...next,
        flags: { ...next.flags, extraChallengeTurn: true },
      }
      next = pushLog(next, 'eliteHeadExtraTurn', 'bad')
    }
  }
  return next
}

function exilePlayerCreature(state: GameState, id: string): GameState {
  const creature = state.player.creatures.find((c) => c.instanceId === id)
  if (!creature) return state
  // Ward {2}: challenge side has no mana — ability is countered for this target.
  if (creature.keywords.some((k) => /ward/i.test(k))) {
    return pushLog(state, 'wardBlocked', 'good', { name: creature.name })
  }
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

function tapHead(state: GameState, headId: string): GameState {
  let next: GameState = {
    ...state,
    challenge: {
      ...state.challenge,
      battlefield: state.challenge.battlefield.map((c) =>
        c.instanceId === headId ? { ...c, tapped: true } : c,
      ),
    },
  }
  const head = next.challenge.battlefield.find((c) => c.instanceId === headId)
  if (head) next = pushLog(next, 'headTapped', 'good', { name: head.name })
  return next
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
    if (next.player.creatures.length === 1) {
      return afterDistractSacrifice(next, next.player.creatures[0].instanceId)
    }
    return {
      ...next,
      prompt: {
        id: `p-${Date.now()}`,
        kind: 'choose_distract_creature',
        titleKey: 'distractHydra',
        messageKey: 'chooseSacrificeCreature',
        resume: 'distract_creature',
        options: next.player.creatures.map((c) => ({
          id: c.instanceId,
          labelKey: 'sacrificeCreatureOpt',
          labelParams: { pt: `${c.power}/${c.toughness}` },
          name: c.name,
        })),
      },
    }
  }

  if (kind === 'choose_distract_creature') {
    return afterDistractSacrifice(next, optionId)
  }

  if (kind === 'choose_distract_head') {
    return tapHead(next, optionId)
  }

  if (kind === 'choose_strike_head') {
    return resolveStrikeHead(next, optionId)
  }

  if (kind === 'noxious_mode') {
    if (optionId === 'destroy') {
      const tapped = next.player.creatures.filter((c) => c.tapped)
      next = buryPlayerCreatures(
        next,
        tapped.map((c) => c.instanceId),
      )
      return pushLog(next, 'noxiousBreath', 'bad', { n: tapped.length })
    }
    return damagePlayer(next, 5)
  }

  if (kind === 'choose_exile_creature') {
    return exilePlayerCreature(next, optionId)
  }

  return next
}

function afterDistractSacrifice(state: GameState, creatureId: string): GameState {
  const sac = state.player.creatures.find((c) => c.instanceId === creatureId)
  if (!sac) return damagePlayer(state, 3)
  let next = buryPlayerCreatures(state, [creatureId])
  next = pushLog(next, 'youSacrifice', 'info', { name: sac.name })
  const heads = headsOf(next)
  if (heads.length === 0) return next
  if (heads.length === 1) return tapHead(next, heads[0].instanceId)
  return {
    ...next,
    prompt: {
      id: `p-${Date.now()}`,
      kind: 'choose_distract_head',
      titleKey: 'distractHydra',
      messageKey: 'chooseHeadTap',
      resume: 'distract_head',
      options: heads.map((h) => ({
        id: h.instanceId,
        labelKey: 'chooseHeadOpt',
        labelParams: { pt: `${h.power ?? 0}/${effectiveToughness(h)}` },
        name: h.name,
      })),
    },
  }
}

export function applyHeadDamageChoice(
  state: GameState,
  headId: string,
  amount: number,
): GameState {
  let next: GameState = { ...state, prompt: null }
  const card = next.challenge.battlefield.find((c) => c.instanceId === headId)
  if (!card) return next
  // Indestructible does not prevent damage
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
  if (effectiveToughness(updated) <= 0 && !isIndestructible(next, updated)) {
    next = destroyChallengePermanent(next, headId)
  }
  return next
}

/** Legacy bulk turn — Challenge uses challengeTurn.ts instead. */
export function runHydraTurn(state: GameState): GameState {
  return beginPlayerTurn(checkHydraWin(state))
}

export function maybeReturnSwallow(state: GameState): GameState {
  if (!state.flags.swallowExileActive || !state.player.exile.length) return state
  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      creatures: [
        ...state.player.exile
          .filter((c): c is PlayerCreature => 'markedDamage' in c)
          .map((c) => ({
          ...c,
          summoningSickness: true,
          tapped: false,
          markedDamage: 0,
        })),
        ...state.player.creatures,
      ],
      exile: state.player.exile.filter((c) => !('markedDamage' in c)),
    },
    flags: { ...state.flags, swallowExileActive: false },
  }
  return pushLog(next, 'swallowReturn', 'good')
}
