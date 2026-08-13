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

  it('loads a symbol only once for concurrent callers', async () => {
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        set src(_url: string) {
          queueMicrotask(() => this.onload?.())
        }
      },
    )
    const [a, b, c] = await Promise.all([
      loadManaSymbol('R'),
      loadManaSymbol('R'),
      loadManaSymbol('r'),
    ])
    expect(a).toBe(b)
    expect(b).toBe(c)
    expect(getCachedManaSymbolUrl('R')).toBe(a)
    expect(a.includes('mana-symbols') || a.includes('/R.svg')).toBe(true)
  })

  it('reuses memory on a later call without probing again', async () => {
    let probes = 0
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        set src(_url: string) {
          probes += 1
          queueMicrotask(() => this.onload?.())
        }
      },
    )
    const first = await loadManaSymbol('G')
    const second = await loadManaSymbol('G')
    expect(second).toBe(first)
    expect(probes).toBe(1)
  })

  it('falls back to CDN when local image fails', async () => {
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        set src(url: string) {
          queueMicrotask(() => {
            if (String(url).includes('svgs.scryfall.io')) this.onload?.()
            else this.onerror?.()
          })
        }
      },
    )
    const url = await loadManaSymbol('R')
    expect(url).toContain('svgs.scryfall.io')
    expect(url).toContain('/R.svg')
  })
})
