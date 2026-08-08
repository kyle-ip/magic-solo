import type { GameState } from './types'

/** Returns an i18n key under challenge.tip.* for the next suggested action. */
export function coachTipKey(state: GameState): string {
  if (state.status === 'won') return 'won'
  if (state.status === 'lost') return 'lost'
  if (state.status !== 'playing') return 'muster'

  if (state.prompt?.kind === 'choose_blockers') return 'block'
  if (state.awaitingAdvance && state.challengePhase === 'reveal') return 'advance'
  if (state.activeSide === 'challenge') return 'waiting'

  if (state.playerPhase === 'main') {
    const canMuster =
      !state.flags.cannotCastSpells &&
      state.player.muster > 0
    if (state.player.creatures.length === 0 && canMuster) return 'muster'
    if (canMuster) return 'mainReady'
    return 'toCombat'
  }

  if (state.playerPhase === 'combat') {
    if (state.selectedAttackers.length === 0) return 'declareAttackers'
    if (state.code === 'tbth') return 'attackHorde'
    const needsTarget = state.selectedAttackers.some((id) => !state.attackAssignments[id])
    if (needsTarget) return 'assignTargets'
    return 'resolveCombat'
  }

  return 'endTurn'
}
