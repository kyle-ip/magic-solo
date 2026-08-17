import { expandLibrary, resetIdSeq } from './buildDeck'
import {
  baseState,
  beginPlayerTurn,
  checkHordeWin,
  creatureToGyCard,
  damagePlayer,
  destroyChallengePermanent,
  millHorde,
  minotaursOf,
} from './helpers'
import { addFxPop, challengeAttackLinks, setFx } from './fx'
import { pushLog, resetLogSeq } from './log'
import { canBlockAttacker, creatureHasDeathtouch } from './playerAbilities'
import type { CardDef, CardInstance, GameState, SetupConfig } from './types'

export function startHorde(
  defs: CardDef[],
  theme: GameState['theme'],
  config: SetupConfig,
): GameState {
  resetIdSeq()
  resetLogSeq()
  let state: GameState = {
    ...baseState('tbth', theme, config),
    challenge: {
      library: expandLibrary(defs),
      battlefield: [],
      graveyard: [],
    },
  }
  state = pushLog(state, 'hordeStart', 'info', { n: state.flags.playerTurnsRemaining })
  return beginPlayerTurn(state)
}

export function castHordeCard(state: GameState, card: CardInstance): GameState {
  let next = pushLog(state, 'hordeCasts', 'cast', { name: card.name })

  if (card.isMinotaur || (card.power != null && !card.isArtifact)) {
    const entersTapped = card.name === "Mogis's Chosen"
    next = {
      ...next,
      challenge: {
        ...next.challenge,
        battlefield: [
          ...next.challenge.battlefield,
          { ...card, tapped: entersTapped, markedDamage: 0 },
        ],
      },
    }
    return pushLog(next, entersTapped ? 'entersTapped' : 'enters', 'bad', { name: card.name })
  }

  if (card.isArtifact) {
    next = {
      ...next,
      challenge: {
        ...next.challenge,
        battlefield: [...next.challenge.battlefield, { ...card }],
      },
    }
    return pushLog(next, 'artifactEnters', 'bad', { name: card.name })
  }

  switch (card.name) {
    case 'Consuming Rage':
      next = {
        ...next,
        flags: { ...next.flags, consumingRage: true },
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return pushLog(next, 'consumingRage', 'bad')

    case 'Descend on the Prey':
      next = {
        ...next,
        flags: { ...next.flags, descendPrey: true },
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return pushLog(next, 'descendPrey', 'bad')

    case 'Intervention of Keranos':
      next = {
        ...next,
        flags: { ...next.flags, interventionDamage: true },
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return pushLog(next, 'interventionKeranos', 'bad')

    case 'Touch of the Horned God':
      next = {
        ...next,
        flags: { ...next.flags, touchHorned: true },
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return pushLog(next, 'touchHorned', 'bad')

    case 'Unquenchable Fury':
      next = {
        ...next,
        flags: { ...next.flags, unquenchable: true },
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      return pushLog(next, 'unquenchableFury', 'bad')

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

/** @deprecated Live path is `beginChallengeTurn` in challengeTurn.ts. */
export function runHordeTurn(state: GameState): GameState {
  return state
}

export function resolveHordeCombat(state: GameState): GameState {
  let next: GameState = { ...state, prompt: null, phase: 'combat' }
  const attackers = minotaursOf(next).filter((m) => !m.tapped)

  // Descend on the Prey: must be blocked if able
  if (next.flags.descendPrey) {
    let available = next.player.creatures.filter(
      (c) => !c.tapped && !next.blockAssignments[c.instanceId],
    )
    const blockAssignments = { ...next.blockAssignments }
    for (const atk of attackers) {
      const already = Object.values(blockAssignments).includes(atk.instanceId)
      if (already || available.length === 0) continue
      const blocker = available[0]
      available = available.slice(1)
      blockAssignments[blocker.instanceId] = atk.instanceId
    }
    next = { ...next, blockAssignments }
  }

  let totalDamage = 0
  const deadAttackers: string[] = []

  next = setFx(next, 'attack', {
    amount: attackers.length,
    pops: attackers.map((a) => ({
      targetId: a.instanceId,
      kind: 'attack' as const,
      amount: a.power ?? 0,
    })),
    links: challengeAttackLinks(attackers, next.blockAssignments),
  })

  for (const atk of attackers) {
    let power = atk.power ?? 0
    if (next.flags.consumingRage) power += 2

    const blockers = next.player.creatures.filter(
      (c) =>
        next.blockAssignments[c.instanceId] === atk.instanceId &&
        canBlockAttacker(c, atk),
    )

    if (next.flags.unquenchable && blockers.length === 1) {
      // Illegal single block — treat as unblocked
      totalDamage += power
      next = pushLog(next, 'cantBlockAlone', 'bad', { name: atk.name })
    } else if (blockers.length === 0) {
      totalDamage += power
    } else {
      // Simplified combat: blockers absorb, deathtouch/first strike abstracted
      let remaining = power
      const deadBlockers: string[] = []
      for (const b of blockers) {
        const bTough = b.toughness - b.markedDamage
        if (next.flags.touchHorned || next.flags.descendPrey) {
          // deathtouch / first strike → blocker dies if any damage
          deadBlockers.push(b.instanceId)
          remaining -= bTough
        } else {
          if (remaining >= bTough) {
            deadBlockers.push(b.instanceId)
            remaining -= bTough
          } else {
            // survivor marked
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
      }
      if (deadBlockers.length) {
        const dead = next.player.creatures.filter((c) =>
          deadBlockers.includes(c.instanceId),
        )
        for (const b of dead) {
          next = addFxPop(next, { targetId: b.instanceId, kind: 'damage', amount: b.toughness }, 'damage')
        }
        next = {
          ...next,
          player: {
            ...next.player,
            creatures: next.player.creatures.filter(
              (c) => !deadBlockers.includes(c.instanceId),
            ),
            graveyard: [
              ...dead.map((d) => creatureToGyCard(d, next.playerDeckId)),
              ...next.player.graveyard,
            ],
          },
        }
      }
      // Blockers deal damage back (player deathtouch kills with any damage)
      const blockPower = blockers.reduce((s, b) => s + b.power, 0)
      const blockerDeathtouch = blockers.some((b) => creatureHasDeathtouch(b))
      const atkToughLeft = (atk.toughness ?? 0) - atk.markedDamage
      if (
        (blockerDeathtouch && blockPower > 0) ||
        blockPower >= atkToughLeft
      ) {
        deadAttackers.push(atk.instanceId)
      }
      if (remaining > 0) totalDamage += remaining
    }

    if (next.flags.consumingRage) {
      deadAttackers.push(atk.instanceId)
    }
  }

  if (totalDamage > 0) {
    if (next.flags.preventCombatDamageThisTurn) {
      next = pushLog(next, 'fogPreventedCombat', 'good', { n: totalDamage })
    } else {
      next = damagePlayer(next, totalDamage)
    }
  }

  for (const id of [...new Set(deadAttackers)]) {
    next = destroyChallengePermanent(next, id)
  }

  // Reckless Minotaur dies at end step
  for (const m of minotaursOf(next)) {
    if (m.name === 'Reckless Minotaur') {
      next = destroyChallengePermanent(next, m.instanceId)
    }
  }

  next = clearHordeTurnFlags(next)
  next = { ...next, blockAssignments: {}, revealed: [] }
  next = checkHordeWin(next)
  if (next.status !== 'playing') return next
  return beginPlayerTurn(next)
}

function clearHordeTurnFlags(state: GameState): GameState {
  return {
    ...state,
    flags: {
      ...state.flags,
      consumingRage: false,
      descendPrey: false,
      touchHorned: false,
      unquenchable: false,
      interventionDamage: false,
    },
  }
}

export function damageHordeAsPlayer(
  state: GameState,
  amount: number,
): GameState {
  return millHorde(state, amount)
}
