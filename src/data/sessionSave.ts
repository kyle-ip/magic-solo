import type { AssistantState } from '../assistant/types'
import type { ChallengeCode, GameState } from '../game/types'

const CHALLENGE_PREFIX = 'magic-solo-challenge-save-v1:'
const ASSISTANT_PREFIX = 'magic-solo-assistant-save-v1:'
const SCHEMA_V = 1

type ChallengeSnapshot = {
  v: number
  savedAt: number
  state: GameState
}

type AssistantSnapshot = {
  v: number
  savedAt: number
  state: AssistantState
}

const challengeMemory = new Map<string, ChallengeSnapshot>()
const assistantMemory = new Map<string, AssistantSnapshot>()

function challengeKey(code: ChallengeCode): string {
  return `${CHALLENGE_PREFIX}${code}`
}

function assistantKey(code: ChallengeCode): string {
  return `${ASSISTANT_PREFIX}${code}`
}

function isChallengeCode(v: unknown): v is ChallengeCode {
  return v === 'tfth' || v === 'tbth' || v === 'tdag'
}

function looksLikePlayingGame(raw: unknown, code: ChallengeCode): raw is GameState {
  if (!raw || typeof raw !== 'object') return false
  const s = raw as Partial<GameState>
  return (
    s.code === code &&
    s.status === 'playing' &&
    !!s.player &&
    typeof s.player === 'object' &&
    !!s.challenge &&
    typeof s.challenge === 'object' &&
    Array.isArray(s.log)
  )
}

function looksLikePlayingAssistant(
  raw: unknown,
  code: ChallengeCode,
): raw is AssistantState {
  if (!raw || typeof raw !== 'object') return false
  const s = raw as Partial<AssistantState>
  return (
    s.code === code &&
    s.status === 'playing' &&
    Array.isArray(s.library) &&
    Array.isArray(s.boardCells) &&
    Array.isArray(s.battlefield) &&
    Array.isArray(s.graveyard) &&
    Array.isArray(s.exile) &&
    Array.isArray(s.playerValues)
  )
}

function normalizeChallenge(
  raw: unknown,
  code: ChallengeCode,
): ChallengeSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const snap = raw as Partial<ChallengeSnapshot>
  if (snap.v !== SCHEMA_V || typeof snap.savedAt !== 'number') return null
  if (!looksLikePlayingGame(snap.state, code)) return null
  return { v: SCHEMA_V, savedAt: snap.savedAt, state: snap.state }
}

function normalizeAssistant(
  raw: unknown,
  code: ChallengeCode,
): AssistantSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const snap = raw as Partial<AssistantSnapshot>
  if (snap.v !== SCHEMA_V || typeof snap.savedAt !== 'number') return null
  if (!looksLikePlayingAssistant(snap.state, code)) return null
  return { v: SCHEMA_V, savedAt: snap.savedAt, state: snap.state }
}

export function loadChallengeSave(code: ChallengeCode): GameState | null {
  if (!isChallengeCode(code)) return null
  const key = challengeKey(code)
  if (typeof localStorage === 'undefined') {
    return challengeMemory.get(key)?.state ?? null
  }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return challengeMemory.get(key)?.state ?? null
    const parsed = normalizeChallenge(JSON.parse(raw) as unknown, code)
    if (!parsed) {
      localStorage.removeItem(key)
      return null
    }
    challengeMemory.set(key, parsed)
    return parsed.state
  } catch {
    return challengeMemory.get(key)?.state ?? null
  }
}

export function saveChallengeSave(code: ChallengeCode, state: GameState): void {
  if (!isChallengeCode(code) || state.status !== 'playing') return
  const key = challengeKey(code)
  const snap: ChallengeSnapshot = {
    v: SCHEMA_V,
    savedAt: Date.now(),
    state: { ...state, fx: null },
  }
  challengeMemory.set(key, snap)
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(snap))
  } catch {
    // quota / private mode — memory still holds latest
  }
}

export function clearChallengeSave(code: ChallengeCode): void {
  if (!isChallengeCode(code)) return
  const key = challengeKey(code)
  challengeMemory.delete(key)
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function loadAssistantSave(code: ChallengeCode): AssistantState | null {
  if (!isChallengeCode(code)) return null
  const key = assistantKey(code)
  if (typeof localStorage === 'undefined') {
    return assistantMemory.get(key)?.state ?? null
  }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return assistantMemory.get(key)?.state ?? null
    const parsed = normalizeAssistant(JSON.parse(raw) as unknown, code)
    if (!parsed) {
      localStorage.removeItem(key)
      return null
    }
    assistantMemory.set(key, parsed)
    return parsed.state
  } catch {
    return assistantMemory.get(key)?.state ?? null
  }
}

export function saveAssistantSave(code: ChallengeCode, state: AssistantState): void {
  if (!isChallengeCode(code) || state.status !== 'playing') return
  const key = assistantKey(code)
  const snap: AssistantSnapshot = {
    v: SCHEMA_V,
    savedAt: Date.now(),
    state,
  }
  assistantMemory.set(key, snap)
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(snap))
  } catch {
    // quota / private mode — memory still holds latest
  }
}

export function clearAssistantSave(code: ChallengeCode): void {
  if (!isChallengeCode(code)) return
  const key = assistantKey(code)
  assistantMemory.delete(key)
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
