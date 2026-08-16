import type { ChallengeCode, PlayerPhase } from '../game/types'

export type PrimaryActionKind =
  | 'advance'
  | 'enter_combat'
  | 'resolve_combat'
  | 'end_turn'
  | 'none'

export interface PrimaryActionInput {
  activeSide: 'player' | 'challenge'
  over: boolean
  awaitingAdvance: boolean
  playerPhase: PlayerPhase
  attackableCount: number
  selectedAttackerCount: number
  /** True when every selected attacker has a target (always true for tbth) */
  allAttackersAimed: boolean
  code: ChallengeCode
  pendingCast: boolean
}

export interface PrimaryActionResult {
  kind: PrimaryActionKind
  /** i18n key under challenge.* */
  labelKey: string
  disabled: boolean
  /** Secondary actions shown beside/under primary */
  secondaries: Array<'cancel_combat' | 'cancel_target' | 'end_turn'>
}

/** Resolve the Arena-style primary dock button from simplified game state. */
export function resolvePrimaryAction(input: PrimaryActionInput): PrimaryActionResult {
  const secondaries: Array<'cancel_combat' | 'cancel_target' | 'end_turn'> = []
  if (input.pendingCast) secondaries.push('cancel_target')

  if (input.awaitingAdvance && !input.over) {
    return {
      kind: 'advance',
      labelKey: 'challenge.castContinue',
      disabled: false,
      secondaries,
    }
  }

  if (input.activeSide !== 'player' || input.over) {
    return {
      kind: 'none',
      labelKey: 'challenge.endTurn',
      disabled: true,
      secondaries,
    }
  }

  if (input.playerPhase === 'combat') {
    secondaries.unshift('cancel_combat')
    const labelKey =
      input.code === 'tbth' ? 'challenge.attackHorde' : 'challenge.resolveCombat'
    const disabled =
      input.selectedAttackerCount === 0 ||
      (input.code !== 'tbth' && !input.allAttackersAimed)
    return {
      kind: 'resolve_combat',
      labelKey,
      disabled,
      secondaries,
    }
  }

  if (input.playerPhase === 'main' && input.attackableCount > 0) {
    secondaries.push('end_turn')
    return {
      kind: 'enter_combat',
      labelKey: 'challenge.enterCombat',
      disabled: false,
      secondaries,
    }
  }

  return {
    kind: 'end_turn',
    labelKey: 'challenge.endTurn',
    disabled: false,
    secondaries,
  }
}
