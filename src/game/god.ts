import { expandLibrary, makeInstance, resetIdSeq } from './buildDeck'
import {
  baseState,
  beginPlayerTurn,
  creatureToGyCard,
  damagePlayer,
  damagePlayerCreatures,
  destroyChallengePermanent,
  revelersOf,
} from './helpers'
import { challengeAttackLinks, setFx } from './fx'
import { pushLog, resetLogSeq } from './log'
import type { CardDef, CardInstance, GameState, SetupConfig } from './types'

export function startGod(
  defs: CardDef[],
  theme: GameState['theme'],
  config: SetupConfig,
): GameState {
  resetIdSeq()
  resetLogSeq()
  const xenagosDef = defs.find((d) => d.name === 'Xenagos Ascended')
  const throngDef = defs.find((d) => d.name === 'Rollicking Throng')
  if (!xenagosDef || !throngDef) throw new Error('TDAG cards missing')

  const xenagos = makeInstance(xenagosDef)
  const throngs = [makeInstance(throngDef), makeInstance(throngDef)]

  // Library without starting board cards
  let library = expandLibrary(defs)
  let removeX = 1
  let removeT = 2
  library = library.filter((c) => {
    if (c.name === 'Xenagos Ascended' && removeX > 0) {
      removeX -= 1
      return false
    }
    if (c.name === 'Rollicking Throng' && removeT > 0) {
      removeT -= 1
      return false
    }
    return true
  })

  let state: GameState = {
    ...baseState('tdag', theme, config),
    challenge: {
      library,
      battlefield: [xenagos, ...throngs],
      graveyard: [],
    },
  }
  state = pushLog(state, 'godStart', 'info')
  return beginPlayerTurn(state)
}

function enterGodPermanent(state: GameState, card: CardInstance): GameState {
  let next: GameState = {
    ...state,
    challenge: {
      ...state.challenge,
      battlefield: [...state.challenge.battlefield, { ...card, markedDamage: 0 }],
    },
  }
  next = pushLog(next, 'enters', 'bad', { name: card.name })

  if (card.name === 'Rollicking Throng') {
    const top = next.challenge.library[0]
    if (top) {
      next = {
        ...next,
        challenge: { ...next.challenge, library: next.challenge.library.slice(1) },
      }
      next = castGodCard(next, top)
    }
  }
  if (card.name === 'Ecstatic Piper') {
    next = {
      ...next,
      flags: { ...next.flags, xenagosMustAttack: true },
    }
    next = pushLog(next, 'ecstaticPiper', 'bad')
  }
  return next
}

export function castGodCard(state: GameState, card: CardInstance): GameState {
  let next = pushLog(state, 'xenagosCasts', 'cast', { name: card.name })

  if (card.isReveler || card.isGod || (card.power != null && !card.isEnchantment)) {
    return enterGodPermanent(next, card)
  }

  if (card.isEnchantment) {
    next = {
      ...next,
      challenge: {
        ...next.challenge,
        battlefield: [...next.challenge.battlefield, card],
      },
    }
    if (card.name === 'Dance of Flame') {
      next = { ...next, flags: { ...next.flags, danceOfFlame: true } }
    }
    if (card.name === 'Dance of Panic') {
      next = { ...next, flags: { ...next.flags, danceOfPanic: true } }
    }
    return pushLog(next, 'enchantsRevel', 'bad', { name: card.name })
  }

  switch (card.name) {
    case 'Impulsive Charge':
      next = {
        ...next,
        flags: { ...next.flags, impulsiveCharge: true },
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return pushLog(next, 'impulsiveCharge', 'bad')

    case 'Impulsive Destruction':
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
        prompt: {
          id: `p-${Date.now()}`,
          kind: 'impulsive_destruction',
          titleKey: 'impulsiveDestruction',
          messageKey: 'impulsiveDestructionMsg',
          resume: 'impulsive_destruction',
          options: [
            { id: 'damage', labelKey: 'take3Damage' },
            { id: 'skip', labelKey: 'take3Damage' },
          ],
        },
      }
      // Player has no artifacts in simplified mode — always damage unless we add them later
      return damagePlayer(
        { ...next, prompt: null },
        3,
      )

    case 'Impulsive Return': {
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      const pipers = next.challenge.graveyard
        .filter((c) => c.name === 'Ecstatic Piper')
        .slice(0, 2)
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: next.challenge.graveyard.filter(
            (c) => !pipers.some((p) => p.instanceId === c.instanceId),
          ),
        },
        flags: { ...next.flags, impulsiveReturnDamage: true },
      }
      // Return via ETB path so Ecstatic Piper forces Xenagos to attack
      for (const piper of pipers) {
        next = enterGodPermanent(next, { ...piper, markedDamage: 0 })
      }
      return pushLog(next, 'impulsiveReturn', 'bad', { n: pipers.length })
    }

    case 'Rip to Pieces':
      next = {
        ...next,
        flags: { ...next.flags, ripToPieces: true },
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return pushLog(next, 'ripToPieces', 'bad')

    case "Xenagos's Scorn":
      next = {
        ...next,
        flags: { ...next.flags, xenagosMustAttack: true, xenagosTrample: true },
        challenge: {
          ...next.challenge,
          battlefield: next.challenge.battlefield.map((c) =>
            c.isGod
              ? {
                  ...c,
                  keywords: c.keywords.includes('trample')
                    ? c.keywords
                    : [...c.keywords, 'trample'],
                }
              : c,
          ),
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return pushLog(next, 'xenagosScorn', 'bad')

    case "Xenagos's Strike":
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return damagePlayer(next, 4)

    default:
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return pushLog(next, 'resolves', 'info', { name: card.name })
  }
}

export function runGodTurn(state: GameState): GameState {
  let next: GameState = {
    ...state,
    activeSide: 'challenge',
    phase: 'god',
    selectedAttackers: [],
    attackAssignments: {},
  }
  next = pushLog(next, 'xenagosTurn', 'cast')

  // Sync enchantment flags from board
  next = {
    ...next,
    flags: {
      ...next.flags,
      danceOfFlame: next.challenge.battlefield.some((c) => c.name === 'Dance of Flame'),
      danceOfPanic: next.challenge.battlefield.some((c) => c.name === 'Dance of Panic'),
    },
  }

  // Cast top two
  for (let i = 0; i < 2; i += 1) {
    const top = next.challenge.library[0]
    if (!top) break
    next = {
      ...next,
      challenge: { ...next.challenge, library: next.challenge.library.slice(1) },
      revealed: [top],
    }
    next = castGodCard(next, top)
    if (next.prompt) return next
  }

  // Determine attackers
  const revelers = revelersOf(next)
  const revelerCount = revelers.length
  const attackers: CardInstance[] = []

  for (const r of revelers) {
    let must = false
    if (next.flags.impulsiveCharge) must = true
    if (next.flags.danceOfPanic && revelerCount >= 5) must = true
    if (r.name === 'Maddened Oread' && revelerCount >= 5) must = true
    if (must) attackers.push(r)
  }

  const xenagos = next.challenge.battlefield.find((c) => c.isGod)
  if (xenagos && next.flags.xenagosMustAttack) {
    attackers.push(xenagos)
  }

  // Combat start triggers
  if (next.flags.impulsiveReturnDamage) {
    next = damagePlayer(next, revelersOf(next).length)
    next = {
      ...next,
      flags: { ...next.flags, impulsiveReturnDamage: false },
    }
  }
  if (next.flags.ripToPieces) {
    const n = revelersOf(next).length
    next = damagePlayer(next, n)
    next = damagePlayerCreatures(next, n)
    next = {
      ...next,
      flags: { ...next.flags, ripToPieces: false },
    }
  }

  if (attackers.length === 0) {
    next = clearGodCombatFlags(next)
    if (next.status !== 'playing') return next
    return beginPlayerTurn(next)
  }

  next = {
    ...next,
    phase: 'blocks',
    revealed: attackers,
    prompt: {
      id: `p-${Date.now()}`,
      kind: 'choose_blockers',
      titleKey: 'revelAttack',
      messageKey: 'godAttackers',
      messageParams: { n: attackers.length },
      resume: 'god_combat',
      options: [
        { id: 'resolve', labelKey: 'resolveCombat' },
        { id: 'no_blocks', labelKey: 'takeTheDamage' },
      ],
    },
  }
  return next
}

export function resolveGodCombat(state: GameState): GameState {
  let next: GameState = { ...state, prompt: null }
  const attackers = next.revealed.length
    ? next.revealed
    : []

  if (attackers.length) {
    next = setFx(next, 'attack', {
      amount: attackers.length,
      pops: attackers.map((a) => ({
        targetId: a.instanceId,
        kind: 'attack' as const,
        amount: a.power ?? 0,
      })),
      links: challengeAttackLinks(attackers, next.blockAssignments),
    })
  }

  let totalDamage = 0
  for (const atk of attackers) {
    let power = atk.power ?? 0
    const hasTrample =
      (next.flags.xenagosTrample && atk.isGod) ||
      atk.keywords.some((k) => /trample/i.test(k))
    const blockers = next.player.creatures.filter(
      (c) => next.blockAssignments[c.instanceId] === atk.instanceId,
    )

    if (blockers.length === 0) {
      totalDamage += power
      if (next.flags.danceOfFlame && atk.isReveler) {
        totalDamage += 1
      }
    } else {
      const blockPower = blockers.reduce((s, b) => s + b.power, 0)
      const blockToughness = blockers.reduce((s, b) => s + (b.toughness - b.markedDamage), 0)
      if (atk.keywords.some((k) => /deathtouch/i.test(k)) || /deathtouch/i.test(atk.oracleText)) {
        next = {
          ...next,
          player: {
            ...next.player,
            creatures: next.player.creatures.filter(
              (c) => !blockers.some((b) => b.instanceId === c.instanceId),
            ),
            graveyard: [
              ...blockers.map((b) => creatureToGyCard(b, next.playerDeckId)),
              ...next.player.graveyard,
            ],
          },
        }
      } else {
        const dead = blockers.filter((b) => b.toughness <= power)
        next = {
          ...next,
          player: {
            ...next.player,
            creatures: next.player.creatures.filter(
              (c) => !dead.some((d) => d.instanceId === c.instanceId),
            ),
            graveyard: [
              ...dead.map((d) => creatureToGyCard(d, next.playerDeckId)),
              ...next.player.graveyard,
            ],
          },
        }
      }
      // Damage to attacker (not Xenagos if revelers remain — lethal still marks)
      if (!atk.isGod || revelersOf(next).length === 0) {
        if (blockPower >= (atk.toughness ?? 0) - atk.markedDamage) {
          next = destroyChallengePermanent(next, atk.instanceId)
        }
      } else if (atk.isGod) {
        next = {
          ...next,
          challenge: {
            ...next.challenge,
            battlefield: next.challenge.battlefield.map((c) =>
              c.instanceId === atk.instanceId
                ? { ...c, markedDamage: c.markedDamage + blockPower }
                : c,
            ),
          },
        }
      }
      if (hasTrample) {
        const excess = Math.max(0, power - blockToughness)
        totalDamage += excess
      }
      if (next.flags.danceOfFlame && atk.isReveler) {
        totalDamage += 1
      }
    }
  }

  if (totalDamage > 0) {
    if (next.flags.preventCombatDamageThisTurn) {
      next = pushLog(next, 'fogPreventedCombat', 'good', { n: totalDamage })
    } else {
      next = damagePlayer(next, totalDamage)
    }
  }

  next = clearGodCombatFlags(next)
  next = { ...next, blockAssignments: {}, revealed: [] }
  if (next.status !== 'playing') return next
  return beginPlayerTurn(next)
}

function clearGodCombatFlags(state: GameState): GameState {
  return {
    ...state,
    flags: {
      ...state.flags,
      impulsiveCharge: false,
      xenagosMustAttack: false,
      xenagosTrample: false,
    },
    challenge: {
      ...state.challenge,
      battlefield: state.challenge.battlefield.map((c) =>
        c.isGod
          ? { ...c, keywords: c.keywords.filter((k) => !/trample/i.test(k)) }
          : c,
      ),
    },
  }
}
