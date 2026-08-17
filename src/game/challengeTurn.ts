import {
  artifactsOf,
  beginPlayerTurn,
  checkHydraWin,
  checkHordeWin,
  clearChallengeDamage,
  clearSwallowWindow,
  damagePlayer,
  damagePlayerCreatures,
  destroyChallengePermanent,
  headsOf,
  minotaursOf,
  revelersOf,
  tickHydraHide,
} from './helpers'
import { discardCards } from './playerDraw'
import { castHydraCard } from './hydra'
import { castHordeCard, resolveHordeCombat } from './horde'
import { castGodCard, resolveGodCombat } from './god'
import { challengeAttackLinks, setFx } from './fx'
import { pushLog } from './log'
import type { CardInstance, GameState } from './types'

function nextFx(
  state: GameState,
  kind: NonNullable<GameState['fx']>['kind'],
  amount?: number,
  label?: string,
): GameState {
  return setFx(state, kind, { amount, label })
}

/** Begin challenge turn: untap / build cast queue / show first reveal. */
export function beginChallengeTurn(state: GameState): GameState {
  // Cleanup from previous (player) turn
  let next: GameState = clearChallengeDamage(state)
  next = {
    ...next,
    activeSide: 'challenge',
    playerPhase: 'end',
    selectedAttackers: [],
    attackAssignments: {},
    awaitingAdvance: false,
    castQueue: [],
    revealed: [],
    flags: {
      ...next.flags,
      hydraTriggersDone: false,
      hydraBreathDone: false,
    },
    player: {
      ...next.player,
      heroes: next.player.heroes.map((h) => ({ ...h, preventUsedThisTurn: false })),
    },
  }
  next = pushLog(next, 'challengeTurn', 'cast')

  if (next.code === 'tfth') {
    // Swallow window ends at the start of the Hydra's next turn
    next = clearSwallowWindow(next)
    next = {
      ...next,
      flags: {
        ...next.flags,
        cannotCastSpells: false,
        // Do NOT clear Hide here — lasts until end of Hydra's next turn
      },
      challenge: {
        ...next.challenge,
        battlefield: next.challenge.battlefield.map((c) => {
          if (!c.isHead) return c
          if (c.skipUntap) return { ...c, skipUntap: false }
          return { ...c, tapped: false, skipUntap: false }
        }),
      },
    }
    const top = next.challenge.library[0]
    const queue: CardInstance[] = []
    if (top) {
      next = {
        ...next,
        challenge: { ...next.challenge, library: next.challenge.library.slice(1) },
      }
      queue.push(top)
    }
    return presentNextCast({ ...next, castQueue: queue, challengePhase: 'reveal' })
  }

  if (next.code === 'tbth') {
    next = {
      ...next,
      challenge: {
        ...next.challenge,
        battlefield: next.challenge.battlefield.map((c) =>
          c.isMinotaur ? { ...c, tapped: false } : c,
        ),
      },
    }
    const castCount = 2 + artifactsOf(next).length
    const queue: CardInstance[] = []
    for (let i = 0; i < castCount; i += 1) {
      const top = next.challenge.library[0]
      if (!top) break
      next = {
        ...next,
        challenge: { ...next.challenge, library: next.challenge.library.slice(1) },
      }
      queue.push(top)
    }
    next = pushLog(next, 'hordeWillCast', 'info', { n: queue.length })
    return presentNextCast({ ...next, castQueue: queue, challengePhase: 'reveal' })
  }

  next = {
    ...next,
    flags: {
      ...next.flags,
      danceOfFlame: next.challenge.battlefield.some((c) => c.name === 'Dance of Flame'),
      danceOfPanic: next.challenge.battlefield.some((c) => c.name === 'Dance of Panic'),
    },
  }
  const queue: CardInstance[] = []
  for (let i = 0; i < 2; i += 1) {
    const top = next.challenge.library[0]
    if (!top) break
    next = {
      ...next,
      challenge: { ...next.challenge, library: next.challenge.library.slice(1) },
    }
    queue.push(top)
  }
  return presentNextCast({ ...next, castQueue: queue, challengePhase: 'reveal' })
}

function presentNextCast(state: GameState): GameState {
  if (state.castQueue.length === 0) {
    return afterCasts(state)
  }
  const [card, ...rest] = state.castQueue
  let next: GameState = {
    ...state,
    castQueue: rest,
    revealed: [card],
    challengePhase: 'reveal',
    awaitingAdvance: true,
  }
  next = nextFx(next, 'cast', undefined, card.name)
  next = pushLog(next, 'reveals', 'cast', { name: card.name })
  return next
}

/** Advance from reveal animation → resolve spell, or continue queue / finish turn. */
export function advanceChallenge(state: GameState): GameState {
  if (state.prompt || state.status !== 'playing') return state

  if (state.challengePhase === 'reveal' && state.revealed[0]) {
    return resolveCurrentReveal(state)
  }

  if (state.castQueue.length) {
    return presentNextCast({ ...state, awaitingAdvance: false })
  }

  return afterCasts(state)
}

function resolveCurrentReveal(state: GameState): GameState {
  const card = state.revealed[0]
  if (!card) return afterCasts(state)

  let next: GameState = {
    ...state,
    awaitingAdvance: false,
    challengePhase: 'resolve',
  }

  if (next.code === 'tfth') next = castHydraCard(next, card)
  else if (next.code === 'tbth') next = castHordeCard(next, card)
  else next = castGodCard(next, card)

  if (next.prompt) return next
  if (next.status !== 'playing') return next

  if (next.castQueue.length > 0) return presentNextCast(next)
  return afterCasts(next)
}

function afterCasts(state: GameState): GameState {
  const next: GameState = {
    ...state,
    revealed: state.challengePhase === 'combat' ? state.revealed : [],
    castQueue: [],
    awaitingAdvance: false,
  }

  if (next.code === 'tfth') return finishHydra(next)
  if (next.code === 'tbth') return startHordeCombat(next)
  return startGodCombat(next)
}

function finishHydra(state: GameState): GameState {
  let next = state

  // Official order: Hydra "combat" breath first, then end-step elite triggers
  if (!next.flags.hydraBreathDone) {
    next = { ...next, challengePhase: 'breath', revealed: [] }
    const untapped = headsOf(next).filter((h) => !h.tapped)
    let breath = 0
    for (const h of untapped) breath += h.isElite ? 2 : 1
    if (breath > 0) {
      if (next.flags.preventCombatDamageThisTurn) {
        next = pushLog(next, 'fogPreventedBreath', 'good', { n: breath })
      } else {
        next = damagePlayer(next, breath)
        next = nextFx(next, 'damage', breath, 'Hydra breath')
        next = pushLog(next, 'hydraBreath', 'bad', { n: breath })
      }
    }
    next = { ...next, flags: { ...next.flags, hydraBreathDone: true } }
    if (next.status !== 'playing') return next
  }

  if (!next.flags.hydraTriggersDone) {
    next = {
      ...next,
      challengePhase: 'triggers',
    }

    // Non-cast triggers first so a Savage cast doesn't skip them
    for (const head of headsOf(next)) {
      if (head.name === 'Shrieking Titan Head') {
        next = discardCards(next, 2)
        next = pushLog(next, 'shriekingDiscard', 'bad')
      }
      if (head.name === 'Snapping Fang Head') {
        next = damagePlayer(next, 1)
        next = nextFx(next, 'damage', 1)
      }
    }

    for (const head of headsOf(next)) {
      if (head.name === 'Savage Vigor Head') {
        const extra = next.challenge.library[0]
        if (extra) {
          next = {
            ...next,
            challenge: { ...next.challenge, library: next.challenge.library.slice(1) },
            castQueue: [extra],
            flags: { ...next.flags, hydraTriggersDone: true },
          }
          return presentNextCast(next)
        }
      }
    }
    next = { ...next, flags: { ...next.flags, hydraTriggersDone: true } }
  }

  if (next.status !== 'playing') return next

  next = tickHydraHide(next)

  if (next.flags.extraChallengeTurn) {
    next = {
      ...next,
      flags: {
        ...next.flags,
        extraChallengeTurn: false,
        hydraTriggersDone: false,
        hydraBreathDone: false,
      },
    }
    next = pushLog(next, 'hydraExtraTurn', 'bad')
    return beginChallengeTurn(next)
  }

  // End of Hydra turn — check win
  next = checkHydraWin(next)
  if (next.status !== 'playing') return next
  next = {
    ...next,
    challengePhase: 'done',
    activeSide: 'player',
    flags: {
      ...next.flags,
      hydraTriggersDone: false,
      hydraBreathDone: false,
    },
  }
  return beginPlayerTurn(next)
}

function startHordeCombat(state: GameState): GameState {
  let next: GameState = { ...state, challengePhase: 'combat', revealed: [] }

  if (next.flags.interventionDamage) {
    next = damagePlayerCreatures(next, 3)
    next = {
      ...next,
      challenge: {
        ...next.challenge,
        battlefield: next.challenge.battlefield.map((c) =>
          c.power != null ? { ...c, markedDamage: c.markedDamage + 3 } : c,
        ),
      },
      flags: { ...next.flags, interventionDamage: false },
    }
    for (const c of [...next.challenge.battlefield]) {
      if (c.power != null && (c.toughness ?? 0) - c.markedDamage <= 0) {
        next = destroyChallengePermanent(next, c.instanceId)
      }
    }
  }

  const attackers = minotaursOf(next).filter((m) => !m.tapped)
  if (attackers.length === 0) {
    next = clearHordeFlags(next)
    next = checkHordeWin(next)
    if (next.status !== 'playing') return next
    return beginPlayerTurn({ ...next, challengePhase: 'done', activeSide: 'player' })
  }

  next = {
    ...next,
    revealed: attackers,
    awaitingAdvance: false,
    prompt: {
      id: `p-${Date.now()}`,
      kind: 'choose_blockers',
      titleKey: 'declareBlockers',
      messageKey: 'hordeAttackers',
      messageParams: { n: attackers.length },
      resume: 'horde_combat',
      options: [
        { id: 'resolve', labelKey: 'resolveCombat' },
        { id: 'no_blocks', labelKey: 'takeDamage' },
      ],
    },
  }
  return setFx(next, 'attack', {
    amount: attackers.length,
    pops: attackers.map((a) => ({
      targetId: a.instanceId,
      kind: 'attack' as const,
      amount: a.power ?? 0,
    })),
    links: challengeAttackLinks(attackers, next.blockAssignments),
  })
}

function startGodCombat(state: GameState): GameState {
  let next: GameState = { ...state, challengePhase: 'combat', revealed: [] }
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
  if (xenagos && next.flags.xenagosMustAttack) attackers.push(xenagos)

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
    next = { ...next, flags: { ...next.flags, ripToPieces: false } }
  }

  if (attackers.length === 0) {
    next = clearGodFlags(next)
    if (next.status !== 'playing') return next
    return beginPlayerTurn({ ...next, challengePhase: 'done', activeSide: 'player' })
  }

  next = {
    ...next,
    revealed: attackers,
    prompt: {
      id: `p-${Date.now()}`,
      kind: 'choose_blockers',
      titleKey: 'declareBlockers',
      messageKey: 'godAttackers',
      messageParams: { n: attackers.length },
      resume: 'god_combat',
      options: [
        { id: 'resolve', labelKey: 'resolveCombat' },
        { id: 'no_blocks', labelKey: 'takeDamage' },
      ],
    },
  }
  return setFx(next, 'attack', {
    amount: attackers.length,
    pops: attackers.map((a) => ({
      targetId: a.instanceId,
      kind: 'attack' as const,
      amount: a.power ?? 0,
    })),
    links: challengeAttackLinks(attackers, next.blockAssignments),
  })
}

function clearHordeFlags(state: GameState): GameState {
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

function clearGodFlags(state: GameState): GameState {
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

export function continueAfterPrompt(state: GameState): GameState {
  if (state.castQueue.length > 0) return presentNextCast(state)
  if (state.code === 'tfth' && state.activeSide === 'challenge') {
    return finishHydra(state)
  }
  if (state.activeSide === 'challenge' && state.challengePhase === 'resolve') {
    return afterCasts(state)
  }
  return state
}

export { resolveHordeCombat, resolveGodCombat }
