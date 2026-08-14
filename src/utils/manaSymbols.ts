/** Mana / card symbols: Scryfall CDN first, same-origin public/mana-symbols fallback. */

import { assetUrl } from './assetUrl'
import { assetCandidates, resolveAssetUrl } from './remoteAsset'

const SYMBOL_CDN = 'https://svgs.scryfall.io/card-symbols'

/** In-memory: normalized code → display URL. */
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

export function manaSymbolCdnUrl(braceContent: string): string {
  const code = normalizeManaCode(braceContent)
  return `${SYMBOL_CDN}/${encodeURIComponent(code)}.svg`
}

/** Same-origin path (Vite `public/mana-symbols`). */
export function manaSymbolLocalUrl(braceContent: string): string {
  const code = normalizeManaCode(braceContent)
  return assetUrl(`mana-symbols/${code}.svg`)
}

/** @deprecated Use cache helpers. */
export function manaSymbolUrl(braceContent: string): string {
  const code = normalizeManaCode(braceContent)
  return memory.get(code) ?? manaSymbolCdnUrl(code)
}

/** Sync peek — URL if already primed this session. */
export function getCachedManaSymbolUrl(braceContent: string): string | null {
  return memory.get(normalizeManaCode(braceContent)) ?? null
}

async function resolveSymbolUrl(code: string): Promise<string> {
  const localPath = `mana-symbols/${normalizeManaCode(code)}.svg`
  return resolveAssetUrl(localPath, {
    kind: 'mana_symbol',
    strategy: 'remote-first',
  })
}

/** Prime a symbol at most once per session; subsequent mounts reuse the URL. */
export function loadManaSymbol(braceContent: string): Promise<string> {
  const code = normalizeManaCode(braceContent)
  const hit = memory.get(code)
  if (hit) return Promise.resolve(hit)

  const pending = inflight.get(code)
  if (pending) return pending

  const task = resolveSymbolUrl(code).then((url) => {
    memory.set(code, url)
    inflight.delete(code)
    notify()
    return url
  })

  inflight.set(code, task)
  return task
}

/**
 * Warm only frequently seen cost symbols on startup.
 * Full COMMON_MANA_SYMBOLS remains available for callers that want a wider set.
 */
export const STARTUP_MANA_SYMBOLS = [
  'W',
  'U',
  'B',
  'R',
  'G',
  'C',
  'X',
  ...Array.from({ length: 16 }, (_, i) => String(i)),
] as const

/** Common symbols seen in costs / oracle — optional wider warm set. */
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
  codes: readonly string[] = STARTUP_MANA_SYMBOLS,
): void {
  for (const code of codes) {
    void loadManaSymbol(code)
  }
}

/** Optimistic CDN URL before async resolve finishes (remote-first). */
export function peekManaSymbolUrl(braceContent: string): string {
  const code = normalizeManaCode(braceContent)
  return (
    memory.get(code) ??
    assetCandidates(`mana-symbols/${code}.svg`, {
      kind: 'mana_symbol',
      strategy: 'remote-first',
    }).primary
  )
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
