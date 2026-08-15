import type { GameState, LogEntry } from '../../game/types'

export function battleReportContext(
  state: GameState,
  formatLog: (entry: LogEntry) => string,
  maxLogLines = 40,
) {
  const recent = state.log.slice(-maxLogLines).map(formatLog)
  return {
    challenge: state.code,
    outcome: state.status,
    resultKey: state.resultKey,
    turnNumber: state.turnNumber,
    playerLife: state.player.life,
    playerCreatures: state.player.creatures.map((c) => c.name),
    playerGraveyardCount: state.player.graveyard.length,
    challengeBattlefield: state.challenge.battlefield.map((c) => c.name),
    challengeLibraryLeft: state.challenge.library.length,
    recentLog: recent,
  }
}
