import { expandLibrary, makeInstance, resetIdSeq } from './buildDeck'
import {
  baseState,
  beginPlayerTurn,
  buryPlayerCreatures,
  damagePlayer,
  destroyChallengePermanent,
  offerOpeningMulligan,
  revelersOf,
} from './helpers'
import { challengeAttackLinks, setFx } from './fx'
import { pushLog, resetLogSeq } from './log'
import { canBlockAttacker, creatureHasDeathtouch } from './playerAbilities'
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
      exile: [],
    },
  }
  state = pushLog(state, 'godStart', 'info')
  return offerOpeningMulligan(state)
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

    case 'Impulsive Destruction': {
      // Official: sac an artifact or enchantment, or take 3.
      const options: Array<{
        id: string
        labelKey: 'take3Damage' | 'sacEnchantment' | 'sacArtifact'
        name?: string
      }> = [{ id: 'damage', labelKey: 'take3Damage' }]
      for (const e of next.player.enchantments) {
        options.push({
          id: `ench:${e.instanceId}`,
          labelKey: 'sacEnchantment',
          name: e.name,
        })
      }
      for (const a of next.player.artifacts) {
        options.push({
          id: `art:${a.instanceId}`,
          labelKey: 'sacArtifact',
          name: a.name,
        })
      }
      const hasPerms =
        next.player.enchantments.length > 0 || next.player.artifacts.length > 0
      return {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
        prompt: {
          id: `p-${Date.now()}`,
          kind: 'impulsive_destruction',
          titleKey: 'impulsiveDestruction',
          messageKey: hasPerms
            ? 'impulsiveDestructionChoiceMsg'
            : 'impulsiveDestructionMsg',
          resume: 'impulsive_destruction',
          options,
        },
      }
    }

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

/** @deprecated Live path is \eginChallengeTurn\ in challengeTurn.ts. */
export function runGodTurn(state: GameState): GameState {
  return state
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
      (c) =>
        next.blockAssignments[c.instanceId] === atk.instanceId &&
        canBlockAttacker(c, atk),
    )

    if (blockers.length === 0) {
      totalDamage += power
      if (next.flags.danceOfFlame && atk.isReveler) {
        totalDamage += 1
      }
    } else {
      const blockPower = blockers.reduce((s, b) => s + b.power, 0)
      const blockToughness = blockers.reduce((s, b) => s + (b.toughness - b.markedDamage), 0)
      const blockerDeathtouch = blockers.some((b) => creatureHasDeathtouch(b))
      if (atk.keywords.some((k) => /deathtouch/i.test(k)) || /deathtouch/i.test(atk.oracleText)) {
        next = buryPlayerCreatures(
          next,
          blockers.map((b) => b.instanceId),
        )
      } else {
        // Assign attacker damage across blockers (remaining toughness), like Horde.
        let remaining = power
        const deadIds: string[] = []
        for (const b of blockers) {
          const bTough = b.toughness - b.markedDamage
          if (remaining <= 0) break
          if (remaining >= bTough) {
            deadIds.push(b.instanceId)
            remaining -= bTough
          } else {
            next = {
              ...next,
              player: {
                ...next.player,
                creatures: next.player.creatures.map((c) =>
                  c.instanceId === b.instanceId
                    ? { ...c, markedDamage: c.markedDamage + remaining }
                    : c,
                ),
              },
            }
            remaining = 0
          }
        }
        if (deadIds.length) {
          next = buryPlayerCreatures(next, deadIds)
        }
      }
      // Damage to attacker (not Xenagos if revelers remain — lethal still marks)
      const atkToughLeft = (atk.toughness ?? 0) - atk.markedDamage
      const killsAttacker =
        (blockerDeathtouch && blockPower > 0) || blockPower >= atkToughLeft
      if (!atk.isGod || revelersOf(next).length === 0) {
        if (killsAttacker) {
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
