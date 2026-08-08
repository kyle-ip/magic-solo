import { expandLibrary, resetIdSeq } from './buildDeck'
import {
  baseState,
  beginPlayerTurn,
  checkHordeWin,
  damagePlayer,
  damagePlayerCreatures,
  destroyChallengePermanent,
  millHorde,
  minotaursOf,
  artifactsOf,
} from './helpers'
import { addFxPop, challengeAttackLinks, setFx } from './fx'
import { pushLog, resetLogSeq } from './log'
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

export function runHordeTurn(state: GameState): GameState {
  let next: GameState = {
    ...state,
    activeSide: 'challenge',
    phase: 'horde',
    selectedAttackers: [],
    attackAssignments: {},
  }
  next = pushLog(next, 'hordeTurn', 'cast')

  // Untap minotaurs
  next = {
    ...next,
    challenge: {
      ...next.challenge,
      battlefield: next.challenge.battlefield.map((c) =>
        c.isMinotaur ? { ...c, tapped: false } : c,
      ),
    },
  }

  // Cast 2 + artifacts
  const extra = artifactsOf(next).length
  const castCount = 2 + extra
  next = pushLog(next, 'revealAndCast', 'info', { n: castCount })

  for (let i = 0; i < castCount; i += 1) {
    const top = next.challenge.library[0]
    if (!top) {
      next = pushLog(next, 'hordeLibraryEmpty', 'info')
      break
    }
    next = {
      ...next,
      challenge: { ...next.challenge, library: next.challenge.library.slice(1) },
      revealed: [top],
    }
    next = castHordeCard(next, top)
  }

  // Combat
  if (next.flags.interventionDamage) {
    next = damagePlayerCreatures(next, 3)
    // Also damage horde creatures? "each creature" — yes both
    next = {
      ...next,
      challenge: {
        ...next.challenge,
        battlefield: next.challenge.battlefield.map((c) => {
          if (c.power == null) return c
          return { ...c, markedDamage: c.markedDamage + 3 }
        }),
      },
    }
    // Remove dead minotaurs
    for (const c of [...next.challenge.battlefield]) {
      if (c.power != null && (c.toughness ?? 0) - c.markedDamage <= 0) {
        next = destroyChallengePermanent(next, c.instanceId)
      }
    }
    next = {
      ...next,
      flags: { ...next.flags, interventionDamage: false },
    }
  }

  const attackers = minotaursOf(next).filter((m) => {
    // attacks each turn if able — Mogis's Chosen enters tapped so may not attack first turn
    return !m.tapped
  })

  if (attackers.length === 0) {
    next = clearHordeTurnFlags(next)
    next = checkHordeWin(next)
    if (next.status !== 'playing') return next
    return beginPlayerTurn(next)
  }

  // Prompt for blockers
  next = {
    ...next,
    phase: 'blocks',
    prompt: {
      id: `p-${Date.now()}`,
      kind: 'choose_blockers',
      titleKey: 'hordeAttack',
      messageKey: 'hordeAttackersContinue',
      messageParams: { n: attackers.length },
      resume: 'horde_combat',
      options: [
        { id: 'resolve', labelKey: 'resolveCombat' },
        { id: 'no_blocks', labelKey: 'takeDamageNoBlocks' },
      ],
    },
  }
  // Store attackers in revealed for UI
  next = { ...next, revealed: attackers }
  return next
}

export function resolveHordeCombat(state: GameState): GameState {
  let next: GameState = { ...state, prompt: null, phase: 'combat' }
  const attackers = minotaursOf(next).filter((m) => !m.tapped)
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
      (c) => next.blockAssignments[c.instanceId] === atk.instanceId,
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
            graveyard: [...dead, ...next.player.graveyard],
          },
        }
      }
      // Blockers deal damage back
      const blockPower = blockers.reduce((s, b) => s + b.power, 0)
      if (blockPower >= (atk.toughness ?? 0) - atk.markedDamage || next.flags.touchHorned) {
        // touch is on minotaur not blockers — minotaur dies if lethal from blockers
        if (blockPower >= (atk.toughness ?? 0) - atk.markedDamage) {
          deadAttackers.push(atk.instanceId)
        }
      }
      if (remaining > 0) totalDamage += remaining
    }

    if (next.flags.consumingRage) {
      deadAttackers.push(atk.instanceId)
    }
  }

  if (totalDamage > 0) {
    next = damagePlayer(next, totalDamage)
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
