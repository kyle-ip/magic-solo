const STORAGE_KEY = 'magic-solo:llm-cache-v1'
const MAX_ENTRIES = 240

export type LlmCachePolicy = {
  /** Logical feature name, e.g. `card.plain`. */
  scope: string
  /** Inputs that uniquely determine the answer. */
  payload: unknown
  /**
   * Time-to-live from write time.
   * `null` / omitted = never expire (stable content like card explanations).
   */
  ttlMs?: number | null
}

interface CacheEntry {
  scope: string
  value: string
  savedAt: number
  /** null = permanent */
  expiresAt: number | null
}

type CacheStore = Record<string, CacheEntry>

function readStore(): CacheStore {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as CacheStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: CacheStore): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota: drop oldest half and retry once
    try {
      const entries = Object.entries(store).sort(
        (a, b) => a[1].savedAt - b[1].savedAt,
      )
      const kept = Object.fromEntries(entries.slice(Math.floor(entries.length / 2)))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept))
    } catch {
      /* give up */
    }
  }
}

/** Stable-ish JSON for hashing (sorted object keys). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

function djb2(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i)
  }
  return (h >>> 0).toString(36)
}

export function buildLlmCacheKey(
  scope: string,
  payload: unknown,
  modelKey: string,
): string {
  return `${scope}:${modelKey}:${djb2(stableStringify(payload))}`
}

function isExpired(entry: CacheEntry, now = Date.now()): boolean {
  return entry.expiresAt != null && entry.expiresAt <= now
}

export function readLlmCache(
  key: string,
): string | null {
  const store = readStore()
  const entry = store[key]
  if (!entry) return null
  if (isExpired(entry)) {
    delete store[key]
    writeStore(store)
    return null
  }
  // Touch for LRU-ish ordering
  entry.savedAt = Date.now()
  store[key] = entry
  writeStore(store)
  return entry.value
}

export function writeLlmCache(
  key: string,
  scope: string,
  value: string,
  ttlMs: number | null | undefined,
): void {
  const now = Date.now()
  const store = readStore()
  store[key] = {
    scope,
    value,
    savedAt: now,
    expiresAt:
      ttlMs == null || ttlMs <= 0 ? null : now + ttlMs,
  }

  const keys = Object.keys(store)
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys.sort(
      (a, b) => store[a]!.savedAt - store[b]!.savedAt,
    )
    const drop = sorted.slice(0, keys.length - MAX_ENTRIES)
    for (const k of drop) delete store[k]
  }
  writeStore(store)
}

export function clearLlmCache(): number {
  const store = readStore()
  const n = Object.keys(store).length
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  return n
}

export function llmCacheStats(): { entries: number; permanent: number } {
  const store = readStore()
  const now = Date.now()
  let permanent = 0
  let entries = 0
  for (const entry of Object.values(store)) {
    if (isExpired(entry, now)) continue
    entries++
    if (entry.expiresAt == null) permanent++
  }
  return { entries, permanent }
}
