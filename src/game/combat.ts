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
  effectivePower,
} from './playerAbilities'
import type { AttackLink, GameState, PlayerCreature } from './types'

function attackPower(state: GameState, creature: PlayerCreature): number {
  let power = effectivePower(state, creature)
  if (creature.keywords.some((k) => /double strike/i.test(k))) power *= 2
  return power
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

  const links: AttackLink[] = []
  if (next.code === 'tbth') {
    for (const a of attackers) {
      links.push({ from: a.instanceId, to: FX_HORDE, tone: 'player' })
    }
  } else {
    for (const a of attackers) {
      const to = next.attackAssignments[a.instanceId]
      if (to) links.push({ from: a.instanceId, to, tone: 'player' })
    }
  }

  const powers = attackers.map((a) => attackPower(next, a))
  next = setFx(next, 'attack', {
    amount: powers.reduce((s, p) => s + p, 0),
    pops: attackers.map((a, i) => ({
      targetId: a.instanceId,
      kind: 'attack' as const,
      amount: powers[i],
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
    const total = powers.reduce((s, p) => s + p, 0)
    const lifeGain = attackers
      .filter((a) => a.keywords.some((k) => /lifelink/i.test(k)))
      .reduce((s, a) => s + attackPower(next, a), 0)
    next = millHorde(next, total)
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

  // Per-attacker damage so deathtouch applies per source (not merged).
  let lifeGain = 0
  for (let i = 0; i < attackers.length; i += 1) {
    const a = attackers[i]
    const target = next.attackAssignments[a.instanceId]
    if (!target) {
      next = pushLog(next, 'attackNoTarget', 'info', { name: a.name })
      continue
    }
    if (a.keywords.some((k) => /lifelink/i.test(k))) lifeGain += powers[i]

    if (next.code === 'tfth') {
      next = dealPlayerAttackDamage(next, target, powers[i], a)
    } else if (next.code === 'tdag') {
      const enemy = next.challenge.battlefield.find((c) => c.instanceId === target)
      if (!enemy) continue
      if (enemy.isGod && next.challenge.battlefield.some((c) => c.isReveler)) {
        const updated = {
          ...enemy,
          markedDamage: enemy.markedDamage + powers[i],
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
        next = pushLog(next, 'xenagosDamagedStuck', 'info', { n: powers[i] })
        next = addFxPop(
          next,
          { targetId: target, kind: 'damage', amount: powers[i] },
          'damage',
        )
      } else {
        next = dealPlayerAttackDamage(next, target, powers[i], a)
      }
    }
  }

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
