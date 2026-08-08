import { addFxPop, FX_HORDE, setFx } from './fx'
import {
  checkHordeWin,
  checkHydraWin,
  dealDamageToChallengeCreature,
  destroyChallengePermanent,
  millHorde,
} from './helpers'
import { pushLog } from './log'
import type { AttackLink, GameState } from './types'

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

  // Attack lunge FX on each attacker (+ arrows during resolve)
  next = setFx(next, 'attack', {
    amount: attackers.reduce((s, a) => s + a.power, 0),
    pops: attackers.map((a) => ({
      targetId: a.instanceId,
      kind: 'attack' as const,
      amount: a.power,
    })),
    links,
  })

  // Tap attackers
  next = {
    ...next,
    player: {
      ...next.player,
      creatures: next.player.creatures.map((c) =>
        next.selectedAttackers.includes(c.instanceId)
          ? { ...c, tapped: true }
          : c,
      ),
    },
  }

  if (next.code === 'tbth') {
    const total = attackers.reduce((s, a) => s + a.power, 0)
    next = millHorde(next, total)
    next = {
      ...next,
      selectedAttackers: [],
      attackAssignments: {},
      phase: 'main',
    }
    return checkHordeWin(next)
  }

  const byTarget: Record<string, number> = {}
  for (const a of attackers) {
    const target = next.attackAssignments[a.instanceId]
    if (!target) {
      next = pushLog(next, 'attackNoTarget', 'info', { name: a.name })
      continue
    }
    byTarget[target] = (byTarget[target] ?? 0) + a.power
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
        if (
          (updated.toughness ?? 0) - updated.markedDamage <= 0 &&
          !next.challenge.battlefield.some((c) => c.isReveler)
        ) {
          next = destroyChallengePermanent(next, targetId)
        }
      } else {
        next = dealDamageToChallengeCreature(next, targetId, dmg)
      }
    }
  }

  next = {
    ...next,
    selectedAttackers: [],
    attackAssignments: {},
    phase: 'main',
  }

  if (next.code === 'tfth') next = checkHydraWin(next)
  return next
}
