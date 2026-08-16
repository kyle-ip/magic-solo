import type { ChallengeCode, PlayerPhase } from '../game/types'

export type PrimaryActionKind =
  | 'advance'
  | 'enter_combat'
  | 'resolve_combat'
  | 'end_turn'
  | 'none'

export type CombatStep = 'pick' | 'aim' | 'resolve'

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
  /** Combat sub-step for dock hint (aligned with midline combat-steps) */
  combatStep?: CombatStep
}

export interface PrimaryActionResult {
  kind: PrimaryActionKind
  /** i18n key under challenge.* */
  labelKey: string
  disabled: boolean
  /** Short context next to the primary button (i18n key) */
  hintKey: string | null
  /** Secondary actions shown beside/under primary */
  secondaries: Array<'cancel_combat' | 'cancel_target' | 'end_turn'>
}

function combatHintKey(
  code: ChallengeCode,
  step: CombatStep | undefined,
): string | null {
  if (step === 'pick') return 'challenge.combatStep.pick'
  if (step === 'aim') {
    return code === 'tbth' ? 'challenge.combatStep.aimHorde' : 'challenge.combatStep.aim'
  }
  if (step === 'resolve') return 'challenge.combatStep.resolve'
  return null
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
      hintKey: 'challenge.actionHint.continue',
      secondaries,
    }
  }

  if (input.activeSide !== 'player' || input.over) {
    return {
      kind: 'none',
      labelKey: 'challenge.endTurn',
      disabled: true,
      hintKey: null,
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
      hintKey: input.pendingCast
        ? 'challenge.actionHint.chooseTarget'
        : combatHintKey(input.code, input.combatStep),
      secondaries,
    }
  }

  if (input.playerPhase === 'main' && input.attackableCount > 0) {
    secondaries.push('end_turn')
    return {
      kind: 'enter_combat',
      labelKey: 'challenge.enterCombat',
      disabled: false,
      hintKey: input.pendingCast
        ? 'challenge.actionHint.chooseTarget'
        : 'challenge.actionHint.enterCombat',
      secondaries,
    }
  }

  return {
    kind: 'end_turn',
    labelKey: 'challenge.endTurn',
    disabled: false,
    hintKey: input.pendingCast ? 'challenge.actionHint.chooseTarget' : null,
    secondaries,
  }
}
