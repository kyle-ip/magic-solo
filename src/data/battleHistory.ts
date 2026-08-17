import type { ChallengeCode } from '../game/types'

const STORAGE_KEY = 'magic-solo-battle-history'
const MAX_RECORDS = 40

/** In-memory fallback when localStorage is unavailable (tests / private mode). */
let memoryStore: BattleHistoryRecord[] | null = null

export interface BattlePostAsk {
  question: string
  answer: string
}

export interface BattleHistoryRecord {
  id: string
  code: ChallengeCode
  status: 'won' | 'lost'
  resultKey: string | null
  savedAt: number
  updatedAt: number
  playerDeckId: string
  playerDeckName: string
  playerDeckNameZh: string
  /** Optional setup metadata (newer records) */
  heroIds?: string[]
  startingHeads?: number
  playerTurnsBeforeHorde?: number
  turnNumber: number
  life: number
  creaturesAlive: number
  fallen: number
  enemyLibrary: number
  enemyBoard: number
  battleReport: string
  postAsks: BattlePostAsk[]
  lang: 'en' | 'zh'
}

export type BattleHistorySnapshot = Omit<
  BattleHistoryRecord,
  'id' | 'savedAt' | 'updatedAt' | 'battleReport' | 'postAsks'
> & {
  id?: string
  battleReport?: string
  postAsks?: BattlePostAsk[]
}

function readAll(): BattleHistoryRecord[] {
  if (typeof localStorage === 'undefined') {
    return memoryStore ? [...memoryStore] : []
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return memoryStore ? [...memoryStore] : []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeRecord)
      .filter((r): r is BattleHistoryRecord => r != null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return memoryStore ? [...memoryStore] : []
  }
}

function writeAll(records: BattleHistoryRecord[]) {
  const trimmed = records
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_RECORDS)
  memoryStore = trimmed
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // quota / private mode — memory still holds the latest list
  }
}

function normalizeRecord(raw: unknown): BattleHistoryRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<BattleHistoryRecord>
  if (
    typeof r.id !== 'string' ||
    (r.code !== 'tfth' && r.code !== 'tbth' && r.code !== 'tdag') ||
    (r.status !== 'won' && r.status !== 'lost') ||
    typeof r.savedAt !== 'number'
  ) {
    return null
  }
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    resultKey: typeof r.resultKey === 'string' ? r.resultKey : null,
    savedAt: r.savedAt,
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : r.savedAt,
    playerDeckId: typeof r.playerDeckId === 'string' ? r.playerDeckId : '',
    playerDeckName: typeof r.playerDeckName === 'string' ? r.playerDeckName : '',
    playerDeckNameZh:
      typeof r.playerDeckNameZh === 'string' ? r.playerDeckNameZh : r.playerDeckName ?? '',
    turnNumber: Number(r.turnNumber) || 0,
    life: Number(r.life) || 0,
    creaturesAlive: Number(r.creaturesAlive) || 0,
    fallen: Number(r.fallen) || 0,
    enemyLibrary: Number(r.enemyLibrary) || 0,
    enemyBoard: Number(r.enemyBoard) || 0,
    battleReport: typeof r.battleReport === 'string' ? r.battleReport : '',
    postAsks: Array.isArray(r.postAsks)
      ? r.postAsks
          .filter(
            (p): p is BattlePostAsk =>
              !!p &&
              typeof p === 'object' &&
              typeof (p as BattlePostAsk).question === 'string' &&
              typeof (p as BattlePostAsk).answer === 'string',
          )
          .map((p) => ({ question: p.question, answer: p.answer }))
      : [],
    lang: r.lang === 'zh' ? 'zh' : 'en',
  }
}

export function listBattleHistory(code?: ChallengeCode): BattleHistoryRecord[] {
  const all = readAll()
  return code ? all.filter((r) => r.code === code) : all
}

export function getBattleHistory(id: string): BattleHistoryRecord | null {
  return readAll().find((r) => r.id === id) ?? null
}

export function upsertBattleHistory(
  snapshot: BattleHistorySnapshot,
): BattleHistoryRecord {
  const now = Date.now()
  const all = readAll()
  const id = snapshot.id ?? crypto.randomUUID()
  const existing = all.find((r) => r.id === id)
  const next: BattleHistoryRecord = {
    id,
    code: snapshot.code,
    status: snapshot.status,
    resultKey: snapshot.resultKey,
    savedAt: existing?.savedAt ?? now,
    updatedAt: now,
    playerDeckId: snapshot.playerDeckId,
    playerDeckName: snapshot.playerDeckName,
    playerDeckNameZh: snapshot.playerDeckNameZh,
    turnNumber: snapshot.turnNumber,
    life: snapshot.life,
    creaturesAlive: snapshot.creaturesAlive,
    fallen: snapshot.fallen,
    enemyLibrary: snapshot.enemyLibrary,
    enemyBoard: snapshot.enemyBoard,
    battleReport:
      snapshot.battleReport !== undefined
        ? snapshot.battleReport
        : (existing?.battleReport ?? ''),
    postAsks:
      snapshot.postAsks !== undefined
        ? snapshot.postAsks
        : (existing?.postAsks ?? []),
    lang: snapshot.lang,
  }
  writeAll([next, ...all.filter((r) => r.id !== id)])
  return next
}

export function patchBattleHistory(
  id: string,
  patch: Partial<
    Pick<BattleHistoryRecord, 'battleReport' | 'postAsks' | 'lang'>
  >,
): BattleHistoryRecord | null {
  const all = readAll()
  const existing = all.find((r) => r.id === id)
  if (!existing) return null
  const next: BattleHistoryRecord = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  }
  writeAll([next, ...all.filter((r) => r.id !== id)])
  return next
}

export function deleteBattleHistory(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id))
}

export function clearBattleHistory(code?: ChallengeCode): void {
  if (!code) {
    writeAll([])
    return
  }
  writeAll(readAll().filter((r) => r.code !== code))
}
