/** Scryfall card-symbol SVGs: https://svgs.scryfall.io/card-symbols/{CODE}.svg */

const SYMBOL_BASE = 'https://svgs.scryfall.io/card-symbols'

/** In-memory: normalized code → CDN URL once primed (browser HTTP cache holds bytes). */
const memory = new Map<string, string>()
/** Deduplicate concurrent loads for the same code. */
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

/** Sync peek — URL if already primed this session. */
export function getCachedManaSymbolUrl(braceContent: string): string | null {
  return memory.get(normalizeManaCode(braceContent)) ?? null
}

/**
 * Prime a symbol at most once. Uses Image() (not fetch) so there is no CORS
 * requirement — <img> display never needs ACAO, and the browser HTTP cache
 * reuses the same CDN URL across many ManaSymbol mounts.
 */
export function loadManaSymbol(braceContent: string): Promise<string> {
  const code = normalizeManaCode(braceContent)
  const hit = memory.get(code)
  if (hit) return Promise.resolve(hit)

  const pending = inflight.get(code)
  if (pending) return pending

  const cdnUrl = manaSymbolCdnUrl(code)
  const task = new Promise<string>((resolve) => {
    const finish = (url: string) => {
      memory.set(code, url)
      inflight.delete(code)
      notify()
      resolve(url)
    }

    if (typeof Image === 'undefined') {
      finish(cdnUrl)
      return
    }

    const img = new Image()
    img.onload = () => finish(cdnUrl)
    img.onerror = () => finish(cdnUrl)
    img.src = cdnUrl
  })

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

/** @internal Vitest only — clears memory/inflight so mocks stay honest. */
export function resetManaSymbolCacheForTests(): void {
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
