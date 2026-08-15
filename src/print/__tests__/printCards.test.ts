import { describe, expect, it } from 'vitest'
import {
  expandPrintCopies,
  printItemsFromDeckCards,
} from '../printCards'
import type { DeckCard } from '../../types'

describe('expandPrintCopies', () => {
  it('keeps a single copy unchanged', () => {
    const item = { id: 'a', name: 'Forest', imageUrl: 'https://x/a.png' }
    expect(expandPrintCopies(item, 1)).toEqual([item])
    expect(expandPrintCopies(item, 0)).toEqual([item])
  })

  it('duplicates with indexed ids', () => {
    const item = { id: 'a', name: 'Forest', imageUrl: 'https://x/a.png' }
    const copies = expandPrintCopies(item, 3)
    expect(copies).toHaveLength(3)
    expect(copies.map((c) => c.id)).toEqual(['a#1', 'a#2', 'a#3'])
    expect(copies.every((c) => c.imageUrl === item.imageUrl)).toBe(true)
  })
})

describe('printItemsFromDeckCards', () => {
  it('expands challenge deck quantity', () => {
    const cards = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Hydra Head',
        quantity: 4,
        images: {
          front: 'assets/cards/tfth/1-hydra-head-front.png',
          back: 'assets/cards/tfth/back.png',
          artCrop: null,
        },
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Nylea',
        quantity: 1,
        images: {
          front: 'assets/cards/tfth/2-nylea-front.png',
          back: 'assets/cards/tfth/back.png',
          artCrop: null,
        },
      },
    ] as DeckCard[]

    const items = printItemsFromDeckCards(cards)
    expect(items).toHaveLength(5)
    expect(items.filter((i) => i.name === 'Hydra Head')).toHaveLength(4)
    expect(items.filter((i) => i.name === 'Nylea')).toHaveLength(1)
  })
})
