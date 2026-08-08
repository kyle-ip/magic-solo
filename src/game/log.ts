import type { GameState, LogEntry, LogParams, LogTone } from './types'

let logSeq = 0

export function pushLog(
  state: GameState,
  key: string,
  tone: LogTone = 'info',
  params?: LogParams,
): GameState {
  logSeq += 1
  const entry: LogEntry = { id: `log-${logSeq}`, key, tone }
  if (params) entry.params = params
  return {
    ...state,
    log: [entry, ...state.log].slice(0, 80),
  }
}

export function resetLogSeq(): void {
  logSeq = 0
}
