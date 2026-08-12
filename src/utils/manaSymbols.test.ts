import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getCachedManaSymbolUrl,
  loadManaSymbol,
  normalizeManaCode,
  resetManaSymbolCacheForTests,
  splitManaTokens,
} from './manaSymbols'

describe('manaSymbols', () => {
  beforeEach(() => {
    resetManaSymbolCacheForTests()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const body = '<svg xmlns="http://www.w3.org/2000/svg"/>'
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' },
        })
      }),
    )
    vi.stubGlobal('caches', undefined)
  })

  afterEach(() => {
    resetManaSymbolCacheForTests()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('normalizes hybrid codes the way Scryfall filenames expect', () => {
    expect(normalizeManaCode('r/g')).toBe('RG')
    expect(normalizeManaCode('B/P')).toBe('BP')
  })

  it('splits brace tokens', () => {
    expect(splitManaTokens('{2}{R}{R}')).toEqual([
      { type: 'mana', value: '2' },
      { type: 'mana', value: 'R' },
      { type: 'mana', value: 'R' },
    ])
  })

  it('fetches a symbol only once for concurrent callers', async () => {
    const [a, b, c] = await Promise.all([
      loadManaSymbol('R'),
      loadManaSymbol('R'),
      loadManaSymbol('r'),
    ])
    expect(a).toBe(b)
    expect(b).toBe(c)
    expect(getCachedManaSymbolUrl('R')).toBe(a)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('reuses memory on a later call without refetching', async () => {
    await loadManaSymbol('G')
    expect(fetch).toHaveBeenCalledTimes(1)
    await loadManaSymbol('G')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
