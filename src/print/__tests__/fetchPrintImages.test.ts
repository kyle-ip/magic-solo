import { describe, expect, it, vi } from 'vitest'
import {
  countPrintableSlots,
  fetchPrintImageStore,
  materializePageImages,
  type SharedPrintImage,
} from '../fetchPrintImages'
import type { PrintListEntry } from '../printCards'

const shared = (url: string): SharedPrintImage => ({
  bytes: new Uint8Array([1]),
  contentType: 'image/png',
  objectUrl: url,
})

describe('countPrintableSlots / materializePageImages', () => {
  const entries: PrintListEntry[] = [
    { id: 'a', name: 'A', imageUrl: 'https://x/a.png', quantity: 3 },
    { id: 'b', name: 'B', imageUrl: 'https://x/b.png', quantity: 2 },
    { id: 'c', name: 'C', imageUrl: 'https://x/c.png', quantity: 0 },
  ]

  it('counts slots without expanding', () => {
    const store = new Map([
      ['https://x/a.png', shared('a')],
      ['https://x/b.png', shared('b')],
    ])
    expect(countPrintableSlots(entries, store)).toBe(5)
  })

  it('materializes only the requested page', () => {
    const store = new Map([
      ['https://x/a.png', shared('blob:a')],
      ['https://x/b.png', shared('blob:b')],
    ])
    const page0 = materializePageImages(entries, store, 0, 3)
    expect(page0).toHaveLength(3)
    expect(page0.every((img) => img.name === 'A')).toBe(true)

    const page1 = materializePageImages(entries, store, 1, 3)
    expect(page1.map((img) => img.name)).toEqual(['B', 'B'])
  })
})

describe('fetchPrintImageStore resolveFetchUrl', () => {
  it('fetches resolved URLs but keys the store by print URL', async () => {
    const fetched: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        fetched.push(String(url))
        return {
          ok: true,
          headers: { get: () => 'image/jpeg' },
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        }
      }),
    )
    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:preview',
      revokeObjectURL: () => undefined,
    })

    const entries: PrintListEntry[] = [
      {
        id: 'a',
        name: 'A',
        imageUrl:
          'https://cards.scryfall.io/png/front/a/b/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.png',
        quantity: 1,
      },
    ]
    const { store, failed } = await fetchPrintImageStore(entries, {
      resolveFetchUrl: (u) =>
        u.replace('/png/', '/normal/').replace(/\.png$/i, '.jpg'),
    })
    expect(failed).toEqual([])
    expect(fetched[0]).toContain('/normal/')
    expect(store.has(entries[0]!.imageUrl)).toBe(true)
    expect(store.get(entries[0]!.imageUrl)?.contentType).toBe('image/jpeg')

    vi.unstubAllGlobals()
  })
})
