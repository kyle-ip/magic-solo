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

export function ensureLogSeqAtLeast(n: number): void {
  if (n > logSeq) logSeq = n
}

/** Parse numeric seq from ids shaped like `log-12`. */
export function maxLogSeqFromIds(ids: Iterable<string>): number {
  let max = 0
  for (const id of ids) {
    if (!id.startsWith('log-')) continue
    const n = Number(id.slice(4))
    if (Number.isFinite(n) && n > max) max = n
  }
  return max
}
