import { addFxPop, FX_HORDE, setFx } from './fx'
import {
  checkHordeWin,
  dealDamageToChallengeCreature,
  millHorde,
} from './helpers'
import { pushLog } from './log'
import type { AttackLink, GameState, PlayerCreature } from './types'

function attackPower(creature: PlayerCreature): number {
  let power = creature.power
  if (creature.keywords.some((k) => /double strike/i.test(k))) power *= 2
  return power
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

  const powers = attackers.map((a) => attackPower(a))
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
      .reduce((s, a) => s + attackPower(a), 0)
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

  const byTarget: Record<string, number> = {}
  let lifeGain = 0
  for (let i = 0; i < attackers.length; i += 1) {
    const a = attackers[i]
    const target = next.attackAssignments[a.instanceId]
    if (!target) {
      next = pushLog(next, 'attackNoTarget', 'info', { name: a.name })
      continue
    }
    byTarget[target] = (byTarget[target] ?? 0) + powers[i]
    if (a.keywords.some((k) => /lifelink/i.test(k))) lifeGain += powers[i]
  }

  for (const [targetId, dmg] of Object.entries(byTarget)) {
    if (next.code === 'tfth') {
      next = dealDamageToChallengeCreature(next, targetId, dmg)
    } else if (next.code === 'tdag') {
      const target = next.challenge.battlefield.find((c) => c.instanceId === targetId)
      if (!target) continue
      if (target.isGod && next.challenge.battlefield.some((c) => c.isReveler)) {
        const updated = {
          ...target,
          markedDamage: target.markedDamage + dmg,
        }
        next = {
          ...next,
          challenge: {
            ...next.challenge,
            battlefield: next.challenge.battlefield.map((c) =>
              c.instanceId === targetId ? updated : c,
            ),
          },
        }
        next = pushLog(next, 'xenagosDamagedStuck', 'info', { n: dmg })
        next = addFxPop(next, { targetId, kind: 'damage', amount: dmg }, 'damage')
      } else {
        next = dealDamageToChallengeCreature(next, targetId, dmg)
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
