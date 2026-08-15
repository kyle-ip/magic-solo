import type { GameState } from './types'

export function coachTipKey(state: GameState): string {
  if (state.status !== 'playing') return 'cast'
  if (state.pendingCast) {
    if (state.pendingCast.mode === 'damage') return 'targetDamage'
    if (state.pendingCast.mode === 'pump') return 'targetPump'
    if (state.pendingCast.mode === 'fangs') return 'targetFangs'
    if (state.pendingCast.mode === 'destroy') return 'targetDestroy'
    if (state.pendingCast.mode === 'fight_mine') return 'fightMine'
    return 'fightTheirs'
  }
  if (state.activeSide === 'player') {
    const canLand =
      state.playerPhase === 'main' &&
      state.player.landsPlayedThisTurn === 0 &&
      state.player.hand.some((c) => c.kind === 'land')
    if (state.player.lands.length === 0 && canLand) return 'playLand'
    if (state.player.creatures.length === 0 && state.player.hand.some((c) => c.kind === 'creature')) {
      return 'cast'
    }
    if (state.playerPhase === 'main') return 'mainReady'
    if (state.playerPhase === 'combat') {
      if (state.selectedAttackers.length === 0) return 'declareAttackers'
      if (
        state.code !== 'tbth' &&
        state.selectedAttackers.some((id) => !state.attackAssignments[id])
      ) {
        return 'assignTargets'
      }
      return 'resolveCombat'
    }
  }
  if (state.awaitingAdvance) return 'advance'
  return 'theirTurn'
}
