import { addFxPop, FX_HORDE, setFx } from './fx'
import {
  checkHordeWin,
  dealDamageToChallengeCreature,
  millHorde,
} from './helpers'
import { pushLog } from './log'
import {
  applyAttackTriggers,
  creatureHasDeathtouch,
  creatureKeywords,
  effectivePower,
  hasDoubleStrike,
  hasFirstStrike,
} from './playerAbilities'
import type { AttackLink, GameState, PlayerCreature } from './types'

/** Power for one combat damage step (no double-strike ×2). */
export function strikePower(state: GameState, creature: PlayerCreature): number {
  return effectivePower(state, creature)
}

export function strikesInFirstStrikeStep(creature: PlayerCreature): boolean {
  return hasFirstStrike(creature) || hasDoubleStrike(creature)
}

/** First-strike-only creatures skip the normal damage step. */
export function strikesInNormalDamageStep(creature: PlayerCreature): boolean {
  return hasDoubleStrike(creature) || !hasFirstStrike(creature)
}

function dealPlayerAttackDamage(
  state: GameState,
  targetId: string,
  amount: number,
  attacker: PlayerCreature,
): GameState {
  return dealDamageToChallengeCreature(state, targetId, amount, {
    deathtouch: creatureHasDeathtouch(attacker),
  })
}

function lethalAbsorb(
  toughnessLeft: number,
  damage: number,
  deathtouch: boolean,
): number {
  if (damage <= 0) return 0
  if (deathtouch) return toughnessLeft
  return Math.min(damage, toughnessLeft)
}

/** Spill trample excess to another Hydra Head, if any. */
function spillTrampleHydra(
  state: GameState,
  fromTargetId: string,
  excess: number,
  attacker: PlayerCreature,
): GameState {
  if (excess <= 0 || state.code !== 'tfth') return state
  const other = state.challenge.battlefield.find(
    (c) => c.isHead && c.instanceId !== fromTargetId,
  )
  if (!other) return state
  return dealPlayerAttackDamage(state, other.instanceId, excess, attacker)
}

/**
 * Apply one attacker's damage for a single combat damage step.
 * Returns life gained from lifelink for this hit.
 */
function resolveOneAttackerHit(
  state: GameState,
  attacker: PlayerCreature,
  power: number,
): { state: GameState; lifeGain: number } {
  let next = state
  let lifeGain = 0
  const target = next.attackAssignments[attacker.instanceId]
  if (!target) {
    next = pushLog(next, 'attackNoTarget', 'info', { name: attacker.name })
    return { state: next, lifeGain: 0 }
  }
  if (power <= 0) return { state: next, lifeGain: 0 }

  if (creatureKeywords(attacker).some((k) => /lifelink/i.test(k))) lifeGain += power

  const enemyBefore = next.challenge.battlefield.find((c) => c.instanceId === target)
  const toughBefore = enemyBefore
    ? Math.max(0, (enemyBefore.toughness ?? 0) - enemyBefore.markedDamage)
    : 0
  const hasTrample = creatureKeywords(attacker).some((k) => /trample/i.test(k))
  const deathtouch = creatureHasDeathtouch(attacker)

  if (next.code === 'tfth') {
    next = dealPlayerAttackDamage(next, target, power, attacker)
    if (hasTrample) {
      const absorbed = lethalAbsorb(toughBefore, power, deathtouch)
      const excess = Math.max(0, power - absorbed)
      next = spillTrampleHydra(next, target, excess, attacker)
    }
    return { state: next, lifeGain }
  }

  if (next.code === 'tdag') {
    const enemy = next.challenge.battlefield.find((c) => c.instanceId === target)
    if (!enemy) return { state: next, lifeGain: 0 }
    if (enemy.isGod && next.challenge.battlefield.some((c) => c.isReveler)) {
      const updated = {
        ...enemy,
        markedDamage: enemy.markedDamage + power,
      }
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          battlefield: next.challenge.battlefield.map((c) =>
            c.instanceId === target ? updated : c,
          ),
        },
      }
      next = pushLog(next, 'xenagosDamagedStuck', 'info', { n: power })
      next = addFxPop(
        next,
        { targetId: target, kind: 'damage', amount: power },
        'damage',
      )
    } else {
      next = dealPlayerAttackDamage(next, target, power, attacker)
      // Trample: excess past lethal on a reveler spills to Xenagos.
      if (hasTrample && !enemy.isGod) {
        const absorbed = lethalAbsorb(toughBefore, power, deathtouch)
        const excess = Math.max(0, power - absorbed)
        if (excess > 0) {
          const xenagos = next.challenge.battlefield.find((c) => c.isGod)
          if (xenagos) {
            if (next.challenge.battlefield.some((c) => c.isReveler)) {
              next = {
                ...next,
                challenge: {
                  ...next.challenge,
                  battlefield: next.challenge.battlefield.map((c) =>
                    c.instanceId === xenagos.instanceId
                      ? { ...c, markedDamage: c.markedDamage + excess }
                      : c,
                  ),
                },
              }
              next = pushLog(next, 'xenagosDamagedStuck', 'info', { n: excess })
              next = addFxPop(
                next,
                { targetId: xenagos.instanceId, kind: 'damage', amount: excess },
                'damage',
              )
            } else {
              next = dealPlayerAttackDamage(next, xenagos.instanceId, excess, attacker)
            }
          }
        }
      }
    }
  }

  return { state: next, lifeGain }
}

function resolveDamageStep(
  state: GameState,
  attackers: PlayerCreature[],
  step: 'first' | 'normal',
): { state: GameState; lifeGain: number; stepDamage: number } {
  let next = state
  let lifeGain = 0
  let stepDamage = 0
  const eligible = attackers.filter((a) =>
    step === 'first' ? strikesInFirstStrikeStep(a) : strikesInNormalDamageStep(a),
  )
  for (const a of eligible) {
    // Re-read creature in case pumps applied; power from current state.
    const live =
      next.player.creatures.find((c) => c.instanceId === a.instanceId) ?? a
    const power = strikePower(next, live)
    stepDamage += power
    const hit = resolveOneAttackerHit(next, live, power)
    next = hit.state
    lifeGain += hit.lifeGain
  }
  return { state: next, lifeGain, stepDamage }
}

/** Resolve player attacks based on selectedAttackers + attackAssignments. */
export function resolvePlayerCombat(state: GameState): GameState {
  let next = state
  const attackers = next.player.creatures.filter((c) =>
    next.selectedAttackers.includes(c.instanceId),
  )

  if (attackers.length === 0) {
    return pushLog(next, 'noAttackers', 'info')
  }

  next = applyAttackTriggers(next, attackers)

  // Re-read attackers after attack triggers (e.g. Hoplite pump).
  const afterTriggers = next.player.creatures.filter((c) =>
    next.selectedAttackers.includes(c.instanceId),
  )

  const links: AttackLink[] = []
  if (next.code === 'tbth') {
    for (const a of afterTriggers) {
      links.push({ from: a.instanceId, to: FX_HORDE, tone: 'player' })
    }
  } else {
    for (const a of afterTriggers) {
      const to = next.attackAssignments[a.instanceId]
      if (to) links.push({ from: a.instanceId, to, tone: 'player' })
    }
  }

  // Display total damage across both combat damage steps.
  const displayPowers = afterTriggers.map((a) => {
    const p = strikePower(next, a)
    let steps = 0
    if (strikesInFirstStrikeStep(a)) steps += 1
    if (strikesInNormalDamageStep(a)) steps += 1
    return p * Math.max(1, steps)
  })
  next = setFx(next, 'attack', {
    amount: displayPowers.reduce((s, p) => s + p, 0),
    pops: afterTriggers.map((a, i) => ({
      targetId: a.instanceId,
      kind: 'attack' as const,
      amount: displayPowers[i],
    })),
    links,
  })

  next = {
    ...next,
    player: {
      ...next.player,
      creatures: next.player.creatures.map((c) =>
        next.selectedAttackers.includes(c.instanceId) &&
        !c.keywords.some((k) => /vigilance/i.test(k))
          ? { ...c, tapped: true }
          : c,
      ),
    },
  }

  if (next.code === 'tbth') {
    // Horde: each damage step mills by strike power (double strike mills twice).
    let totalMill = 0
    let lifeGain = 0
    for (const step of ['first', 'normal'] as const) {
      const eligible = afterTriggers.filter((a) =>
        step === 'first' ? strikesInFirstStrikeStep(a) : strikesInNormalDamageStep(a),
      )
      for (const a of eligible) {
        const live =
          next.player.creatures.find((c) => c.instanceId === a.instanceId) ?? a
        const power = strikePower(next, live)
        totalMill += power
        if (creatureKeywords(live).some((k) => /lifelink/i.test(k))) lifeGain += power
      }
    }
    next = millHorde(next, totalMill)
    if (lifeGain > 0) {
      next = {
        ...next,
        player: { ...next.player, life: next.player.life + lifeGain },
      }
      next = pushLog(next, 'lifelinkGain', 'good', { n: lifeGain })
    }
    next = {
      ...next,
      selectedAttackers: [],
      attackAssignments: {},
      phase: 'main',
    }
    return checkHordeWin(next)
  }

  let lifeGain = 0
  const first = resolveDamageStep(next, afterTriggers, 'first')
  next = first.state
  lifeGain += first.lifeGain
  const normal = resolveDamageStep(next, afterTriggers, 'normal')
  next = normal.state
  lifeGain += normal.lifeGain

  if (lifeGain > 0) {
    next = {
      ...next,
      player: { ...next.player, life: next.player.life + lifeGain },
    }
    next = pushLog(next, 'lifelinkGain', 'good', { n: lifeGain })
  }

  next = {
    ...next,
    selectedAttackers: [],
    attackAssignments: {},
    phase: 'main',
  }
  return next
}
