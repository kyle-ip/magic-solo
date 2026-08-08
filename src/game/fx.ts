import type { AttackLink, CardInstance, FxPop, FxPulse, GameState } from './types'

function fxId(): string {
  return `fx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function popId(): string {
  return `pop-${Math.random().toString(36).slice(2, 8)}`
}

/** Start or replace the active FX pulse (clears prior pops). */
export function setFx(
  state: GameState,
  kind: FxPulse['kind'],
  opts: {
    amount?: number
    label?: string
    pops?: Omit<FxPop, 'id'>[]
    links?: AttackLink[]
  } = {},
): GameState {
  return {
    ...state,
    fx: {
      id: fxId(),
      kind,
      amount: opts.amount,
      label: opts.label,
      pops: (opts.pops ?? []).map((p) => ({ ...p, id: popId() })),
      links: opts.links,
    },
  }
}

/** Append a floater to the current pulse (or create one). */
export function addFxPop(
  state: GameState,
  pop: Omit<FxPop, 'id'>,
  kind: FxPulse['kind'] = pop.kind === 'heal' ? 'heal' : pop.kind === 'attack' ? 'attack' : 'damage',
): GameState {
  const existing = state.fx
  const pulse: FxPulse = existing
    ? {
        ...existing,
        kind: kind === 'cast' || kind === 'enter' ? existing.kind : kind,
        amount: pop.amount ?? existing.amount,
        pops: [...(existing.pops ?? []), { ...pop, id: popId() }],
      }
    : {
        id: fxId(),
        kind,
        amount: pop.amount,
        pops: [{ ...pop, id: popId() }],
      }
  return { ...state, fx: pulse }
}

export const FX_PLAYER_LIFE = 'player-life'
export const FX_HORDE = 'horde-library'

/** Challenge attackers → blockers, or → player life if unblocked. */
export function challengeAttackLinks(
  attackers: CardInstance[],
  blockAssignments: Record<string, string>,
): AttackLink[] {
  const links: AttackLink[] = []
  for (const atk of attackers) {
    const blockers = Object.entries(blockAssignments)
      .filter(([, attackerId]) => attackerId === atk.instanceId)
      .map(([blockerId]) => blockerId)
    if (blockers.length === 0) {
      links.push({ from: atk.instanceId, to: FX_PLAYER_LIFE, tone: 'challenge' })
    } else {
      for (const blockerId of blockers) {
        links.push({ from: atk.instanceId, to: blockerId, tone: 'challenge' })
      }
    }
  }
  return links
}
