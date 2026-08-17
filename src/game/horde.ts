import { expandLibrary, resetIdSeq } from './buildDeck'
import {
  baseState,
  beginPlayerTurn,
  buryPlayerCreatures,
  checkHordeWin,
  damagePlayer,
  destroyChallengePermanent,
  millHorde,
  minotaursOf,
  offerOpeningMulligan,
} from './helpers'
import { addFxPop, challengeAttackLinks, setFx } from './fx'
import { pushLog, resetLogSeq } from './log'
import {
  canBlockAttacker,
  creatureHasDeathtouch,
  effectivePower,
  effectiveToughness,
  hasDoubleStrike,
  hasFirstStrike,
} from './playerAbilities'
import type {
  CardDef,
  CardInstance,
  GameState,
  PlayerCreature,
  SetupConfig,
} from './types'

/** Challenge attacker strikes in the first-strike damage step. */
function atkStrikesFirst(state: GameState, atk: CardInstance): boolean {
  if (state.flags.descendPrey) return true
  return (
    atk.keywords.some((k) => /first strike|double strike/i.test(k)) ||
    /first strike|double strike/i.test(atk.oracleText)
  )
}

/** Challenge attacker also strikes in the normal damage step. */
function atkStrikesNormal(state: GameState, atk: CardInstance): boolean {
  if (state.flags.descendPrey && !hasDoubleStrikeKw(atk)) {
    // Descend grants first strike only — skip normal unless printed DS.
    return hasDoubleStrikeKw(atk)
  }
  if (hasFirstStrikeKw(atk) && !hasDoubleStrikeKw(atk)) return false
  return true
}

function hasFirstStrikeKw(c: CardInstance): boolean {
  return (
    c.keywords.some((k) => /first strike/i.test(k)) ||
    /first strike/i.test(c.oracleText)
  )
}

function hasDoubleStrikeKw(c: CardInstance): boolean {
  return (
    c.keywords.some((k) => /double strike/i.test(k)) ||
    /double strike/i.test(c.oracleText)
  )
}

function blockerStrikesFirst(b: PlayerCreature): boolean {
  return hasFirstStrike(b) || hasDoubleStrike(b)
}

function blockerStrikesNormal(b: PlayerCreature): boolean {
  return hasDoubleStrike(b) || !hasFirstStrike(b)
}

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
      exile: [],
    },
  }
  state = pushLog(state, 'hordeStart', 'info', { n: state.flags.playerTurnsRemaining })
  return offerOpeningMulligan(state)
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
  const deadAttackerIds = new Set<string>()

  next = setFx(next, 'attack', {
    amount: attackers.length,
    pops: attackers.map((a) => ({
      targetId: a.instanceId,
      kind: 'attack' as const,
      amount: a.power ?? 0,
    })),
    links: challengeAttackLinks(attackers, next.blockAssignments),
  })

  /** Mark damage on a player creature; queue burial if lethal / deathtouch. */
  const markBlockerDamage = (
    blockerId: string,
    amount: number,
    deathtouch: boolean,
    deadBlockers: Set<string>,
  ) => {
    if (amount <= 0) return
    const live = next.player.creatures.find((c) => c.instanceId === blockerId)
    if (!live) return
    next = addFxPop(
      next,
      { targetId: blockerId, kind: 'damage', amount },
      'damage',
    )
    const toughLeft =
      effectiveToughness(next, live) - live.markedDamage
    const lethal = deathtouch || amount >= toughLeft
    if (lethal) {
      deadBlockers.add(blockerId)
    } else {
      next = {
        ...next,
        player: {
          ...next.player,
          creatures: next.player.creatures.map((c) =>
            c.instanceId === blockerId
              ? { ...c, markedDamage: c.markedDamage + amount }
              : c,
          ),
        },
      }
    }
  }

  const markAttackerDamage = (
    atkId: string,
    amount: number,
    deathtouch: boolean,
  ) => {
    if (amount <= 0) return
    const atk = next.challenge.battlefield.find((c) => c.instanceId === atkId)
    if (!atk) return
    next = addFxPop(next, { targetId: atkId, kind: 'damage', amount }, 'damage')
    const toughLeft = (atk.toughness ?? 0) - atk.markedDamage
    if (deathtouch || amount >= toughLeft) {
      deadAttackerIds.add(atkId)
    } else {
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          battlefield: next.challenge.battlefield.map((c) =>
            c.instanceId === atkId
              ? { ...c, markedDamage: c.markedDamage + amount }
              : c,
          ),
        },
      }
    }
  }

  const resolveHordeDamageStep = (step: 'first' | 'normal') => {
    type Hit = {
      kind: 'toBlocker' | 'toAttacker' | 'toPlayer'
      fromId: string
      toId: string
      amount: number
      deathtouch: boolean
    }
    const hits: Hit[] = []

    for (const atk of attackers) {
      if (deadAttackerIds.has(atk.instanceId)) continue
      const liveAtk =
        next.challenge.battlefield.find((c) => c.instanceId === atk.instanceId) ??
        atk

      const strikes =
        step === 'first'
          ? atkStrikesFirst(next, liveAtk)
          : atkStrikesNormal(next, liveAtk)
      if (!strikes) continue

      let power = liveAtk.power ?? 0
      if (next.flags.consumingRage) power += 2
      const atkDeathtouch =
        next.flags.touchHorned ||
        liveAtk.keywords.some((k) => /deathtouch/i.test(k)) ||
        /deathtouch/i.test(liveAtk.oracleText)

      const blockers = next.player.creatures.filter(
        (c) =>
          next.blockAssignments[c.instanceId] === atk.instanceId &&
          canBlockAttacker(c, liveAtk),
      )

      if (next.flags.unquenchable && blockers.length === 1) {
        hits.push({
          kind: 'toPlayer',
          fromId: atk.instanceId,
          toId: 'player',
          amount: power,
          deathtouch: false,
        })
        next = pushLog(next, 'cantBlockAlone', 'bad', { name: liveAtk.name })
        continue
      }

      if (blockers.length === 0) {
        hits.push({
          kind: 'toPlayer',
          fromId: atk.instanceId,
          toId: 'player',
          amount: power,
          deathtouch: false,
        })
        continue
      }

      let remaining = power
      for (const b of blockers) {
        if (remaining <= 0) break
        const liveB =
          next.player.creatures.find((c) => c.instanceId === b.instanceId) ?? b
        const toughLeft = Math.max(
          0,
          effectiveToughness(next, liveB) - liveB.markedDamage,
        )
        if (toughLeft <= 0) continue
        const assign = atkDeathtouch
          ? Math.min(remaining, 1)
          : Math.min(remaining, toughLeft)
        hits.push({
          kind: 'toBlocker',
          fromId: atk.instanceId,
          toId: b.instanceId,
          amount: assign,
          deathtouch: atkDeathtouch,
        })
        remaining -= assign
      }
    }

    for (const atk of attackers) {
      if (deadAttackerIds.has(atk.instanceId)) continue
      const blockers = next.player.creatures.filter(
        (c) =>
          next.blockAssignments[c.instanceId] === atk.instanceId &&
          canBlockAttacker(c, atk),
      )
      for (const b of blockers) {
        const strikes =
          step === 'first' ? blockerStrikesFirst(b) : blockerStrikesNormal(b)
        if (!strikes) continue
        const liveB =
          next.player.creatures.find((c) => c.instanceId === b.instanceId) ?? b
        hits.push({
          kind: 'toAttacker',
          fromId: b.instanceId,
          toId: atk.instanceId,
          amount: effectivePower(next, liveB),
          deathtouch: creatureHasDeathtouch(liveB),
        })
      }
    }

    const deadBlockers = new Set<string>()
    for (const hit of hits) {
      if (hit.kind === 'toPlayer') {
        totalDamage += hit.amount
      } else if (hit.kind === 'toBlocker') {
        markBlockerDamage(hit.toId, hit.amount, hit.deathtouch, deadBlockers)
      } else {
        markAttackerDamage(hit.toId, hit.amount, hit.deathtouch)
      }
    }

    if (deadBlockers.size) {
      next = buryPlayerCreatures(next, [...deadBlockers])
    }
  }

  resolveHordeDamageStep('first')
  resolveHordeDamageStep('normal')

  if (totalDamage > 0) {
    if (next.flags.preventCombatDamageThisTurn) {
      next = pushLog(next, 'fogPreventedCombat', 'good', { n: totalDamage })
    } else {
      next = damagePlayer(next, totalDamage)
    }
  }

  if (next.flags.consumingRage) {
    for (const atk of attackers) {
      deadAttackerIds.add(atk.instanceId)
    }
  }

  for (const id of deadAttackerIds) {
    next = destroyChallengePermanent(next, id)
  }

  // Reckless Minotaur dies at end of combat
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
