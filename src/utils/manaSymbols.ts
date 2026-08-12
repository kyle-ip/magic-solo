/** Scryfall card-symbol SVGs: https://svgs.scryfall.io/card-symbols/{CODE}.svg */

const SYMBOL_BASE = 'https://svgs.scryfall.io/card-symbols'
const CACHE_NAME = 'scryfall-mana-symbols-v1'

/** In-memory: normalized code → local blob:/data: URL (or CDN fallback). */
const memory = new Map<string, string>()
/** Deduplicate concurrent fetches for the same code. */
const inflight = new Map<string, Promise<string>>()

/** Subscribers notified when a symbol resolves (for mounted <ManaSymbol>s). */
const listeners = new Set<() => void>()

function notify() {
  for (const fn of listeners) fn()
}

export function subscribeManaSymbols(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function normalizeManaCode(braceContent: string): string {
  return braceContent.replace(/\//g, '').toUpperCase()
}

/** Raw CDN URL — prefer `getCachedManaSymbolUrl` / `loadManaSymbol` for reuse. */
export function manaSymbolCdnUrl(braceContent: string): string {
  const code = normalizeManaCode(braceContent)
  return `${SYMBOL_BASE}/${encodeURIComponent(code)}.svg`
}

/** @deprecated Use manaSymbolCdnUrl or the cache helpers. Kept for call sites expecting a sync URL. */
export function manaSymbolUrl(braceContent: string): string {
  const code = normalizeManaCode(braceContent)
  return memory.get(code) ?? manaSymbolCdnUrl(code)
}

/** Sync peek — blob URL if already loaded this session. */
export function getCachedManaSymbolUrl(braceContent: string): string | null {
  return memory.get(normalizeManaCode(braceContent)) ?? null
}

async function readFromCacheApi(cdnUrl: string): Promise<Response | null> {
  if (typeof caches === 'undefined') return null
  try {
    const cache = await caches.open(CACHE_NAME)
    return (await cache.match(cdnUrl)) ?? null
  } catch {
    return null
  }
}

async function writeToCacheApi(cdnUrl: string, response: Response): Promise<void> {
  if (typeof caches === 'undefined') return
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(cdnUrl, response)
  } catch {
    // Quota / private mode — memory cache still works.
  }
}

async function blobUrlFromResponse(response: Response): Promise<string> {
  const blob = await response.blob()
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(blob)
  }
  // Extremely old environments: data URL fallback
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return `data:${blob.type || 'image/svg+xml'};base64,${btoa(binary)}`
}

/**
 * Fetch a symbol at most once (memory + Cache Storage). Concurrent callers share
 * one network request. Returns a same-origin blob: URL safe to reuse on many <img>s.
 */
export function loadManaSymbol(braceContent: string): Promise<string> {
  const code = normalizeManaCode(braceContent)
  const hit = memory.get(code)
  if (hit) return Promise.resolve(hit)

  const pending = inflight.get(code)
  if (pending) return pending

  const cdnUrl = manaSymbolCdnUrl(code)
  const task = (async () => {
    try {
      let response = await readFromCacheApi(cdnUrl)
      if (!response || !response.ok) {
        response = await fetch(cdnUrl, { mode: 'cors', credentials: 'omit' })
        if (!response.ok) {
          throw new Error(`Mana symbol HTTP ${response.status}: ${code}`)
        }
        await writeToCacheApi(cdnUrl, response.clone())
      }
      const objectUrl = await blobUrlFromResponse(response)
      memory.set(code, objectUrl)
      notify()
      return objectUrl
    } catch {
      // Network / CORS failure — fall back to CDN so <img> can still try.
      memory.set(code, cdnUrl)
      notify()
      return cdnUrl
    } finally {
      inflight.delete(code)
    }
  })()

  inflight.set(code, task)
  return task
}

/** Common symbols seen in costs / oracle — warm cache on app start. */
export const COMMON_MANA_SYMBOLS = [
  'W',
  'U',
  'B',
  'R',
  'G',
  'C',
  'S',
  'X',
  'Y',
  'Z',
  'T',
  'Q',
  'E',
  'P',
  'PW',
  'CHAOS',
  ...Array.from({ length: 21 }, (_, i) => String(i)),
  'WUBRG',
  'WU',
  'UB',
  'BR',
  'RG',
  'GW',
  'WB',
  'UR',
  'BG',
  'RW',
  'GU',
  '2W',
  '2U',
  '2B',
  '2R',
  '2G',
  'WP',
  'UP',
  'BP',
  'RP',
  'GP',
] as const

/** Fire-and-forget preload; safe to call once from main. */
export function preloadCommonManaSymbols(
  codes: readonly string[] = COMMON_MANA_SYMBOLS,
): void {
  for (const code of codes) {
    void loadManaSymbol(code)
  }
}

/** @internal Vitest only — clears memory/inflight so fetch mocks stay honest. */
export function resetManaSymbolCacheForTests(): void {
  for (const url of memory.values()) {
    if (url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url)
      } catch {
        /* ignore */
      }
    }
  }
  memory.clear()
  inflight.clear()
}

/** Split text into plain runs and `{W}`-style mana tokens. */
export function splitManaTokens(
  text: string,
): Array<{ type: 'text' | 'mana'; value: string }> {
  if (!text) return []
  const out: Array<{ type: 'text' | 'mana'; value: string }> = []
  const re = /\{([^}]+)\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) {
      out.push({ type: 'text', value: text.slice(last, m.index) })
    }
    out.push({ type: 'mana', value: m[1]! })
    last = m.index + m[0].length
  }
  if (last < text.length) {
    out.push({ type: 'text', value: text.slice(last) })
  }
  return out
}
