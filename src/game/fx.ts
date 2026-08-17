import type { AttackLink, CardInstance, FxPop, FxPulse, GameState } from './types'

function fxId(): string {
  return `fx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function popId(): string {
  return `pop-${Math.random().toString(36).slice(2, 8)}`
}

function pulseKindForPop(pop: Omit<FxPop, 'id'>): FxPulse['kind'] {
  if (pop.kind === 'heal') return 'heal'
  if (pop.kind === 'attack') return 'attack'
  if (pop.kind === 'buff') return 'buff'
  if (pop.kind === 'debuff') return 'debuff'
  if (pop.kind === 'mill') return 'mill'
  if (pop.kind === 'status') return 'status'
  return 'damage'
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
  kind: FxPulse['kind'] = pulseKindForPop(pop),
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

/** Soft multi-target buff floaters (prowess / battalion / heroic team). */
export function addBuffPops(
  state: GameState,
  targetIds: string[],
  label = '+1/+1',
): GameState {
  let next = state
  for (const targetId of targetIds) {
    next = addFxPop(next, { targetId, kind: 'buff', label }, 'buff')
  }
  return next
}

export const FX_PLAYER_LIFE = 'player-life'
export const FX_HORDE = 'horde-library'
export const FX_PLAYER_LIBRARY = 'player-library'
export const FX_CHALLENGE_LIBRARY = 'challenge-library'

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
