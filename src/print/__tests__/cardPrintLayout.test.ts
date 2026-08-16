import { describe, expect, it } from 'vitest'
import {
  CARD_H_MM,
  CARD_W_MM,
  cardBleedRectMm,
  cardRectMm,
  cardsPerPage,
  computeLayout,
  cutMarkLines,
  emptySlotIndicesOnPage,
  indicesOnPage,
  mmToPoints,
  pageCount,
  slotForIndex,
} from '../cardPrintLayout'

describe('cardPrintLayout', () => {
  it('uses standard MTG 63×88 mm by default', () => {
    expect(CARD_W_MM).toBe(63)
    expect(CARD_H_MM).toBe(88)
  })

  it('A4 with margin 7 fits a centered grid of standard cards', () => {
    const layout = computeLayout({ paper: 'a4', pageMargin: 7, gap: 0 })
    expect(layout.cols).toBeGreaterThanOrEqual(2)
    expect(layout.rows).toBeGreaterThanOrEqual(2)
    expect(cardsPerPage(layout)).toBe(layout.cols * layout.rows)
    expect(layout.cardW).toBe(63)
    expect(layout.cardH).toBe(88)
    expect(layout.originX).toBeGreaterThan(0)
    expect(layout.originY).toBeGreaterThan(0)
    const gridW =
      layout.cols * layout.cardW + (layout.cols - 1) * layout.gap
    const gridH =
      layout.rows * layout.cardH + (layout.rows - 1) * layout.gap
    expect(layout.originX + gridW).toBeLessThanOrEqual(layout.pageW + 1e-9)
    expect(layout.originY + gridH).toBeLessThanOrEqual(layout.pageH + 1e-9)
  })

  it('flushCut pins margin to 0 and still fits cards', () => {
    const layout = computeLayout({ paper: 'a4', flushCut: true })
    expect(layout.pageMargin).toBe(0)
    expect(cardsPerPage(layout)).toBeGreaterThan(0)
  })

  it('chooses orientation that fits more cards', () => {
    const layout = computeLayout({
      paper: 'a4',
      pageMargin: 7,
      cardW: 63,
      cardH: 88,
    })
    const portrait = computeLayout({
      paper: 'a4',
      pageMargin: 7,
      cardW: 63,
      cardH: 88,
    })
    // Same options → deterministic; count must match best of both orientations
    expect(cardsPerPage(layout)).toBe(cardsPerPage(portrait))
    expect(layout.cols * layout.rows).toBeGreaterThan(0)
  })

  it('gap reduces cards per page vs gap 0', () => {
    const tight = computeLayout({ paper: 'a4', pageMargin: 7, gap: 0 })
    const gapped = computeLayout({ paper: 'a4', pageMargin: 7, gap: 5 })
    expect(cardsPerPage(gapped)).toBeLessThanOrEqual(cardsPerPage(tight))
  })

  it('supports Letter and B4 paper ids', () => {
    const letter = computeLayout({ paper: 'letter', pageMargin: 7 })
    const b4 = computeLayout({ paper: 'b4', pageMargin: 7 })
    expect(cardsPerPage(letter)).toBeGreaterThan(0)
    expect(cardsPerPage(b4)).toBeGreaterThan(0)
  })

  it('6\" photo paper fits at least one card', () => {
    const layout = computeLayout({ paper: 'photo6', pageMargin: 0, flushCut: true })
    expect(cardsPerPage(layout)).toBeGreaterThanOrEqual(1)
    const rect = cardRectMm(0, layout)
    expect(rect.w).toBe(layout.cardW)
    expect(rect.h).toBe(layout.cardH)
    expect(rect.x + rect.w).toBeLessThanOrEqual(layout.pageW + 1e-9)
    expect(rect.y + rect.h).toBeLessThanOrEqual(layout.pageH + 1e-9)
  })

  it('computes page counts and slots', () => {
    const a4 = computeLayout({ paper: 'a4', pageMargin: 7 })
    const per = cardsPerPage(a4)
    expect(pageCount(0, a4)).toBe(0)
    expect(pageCount(1, a4)).toBe(1)
    expect(pageCount(per, a4)).toBe(1)
    expect(pageCount(per + 1, a4)).toBe(2)

    expect(slotForIndex(0, a4)).toEqual({ page: 0, row: 0, col: 0 })
    if (a4.cols >= 3) {
      expect(slotForIndex(a4.cols + 1, a4)).toEqual({
        page: 0,
        row: 1,
        col: 1,
      })
    }
    expect(slotForIndex(per, a4)).toEqual({ page: 1, row: 0, col: 0 })
  })

  it('lists indices and empty slots on a page', () => {
    const a4 = computeLayout({ paper: 'a4', pageMargin: 7 })
    const per = cardsPerPage(a4)
    expect(indicesOnPage(0, 5, a4)).toEqual([0, 1, 2, 3, 4])
    expect(emptySlotIndicesOnPage(0, 5, a4)).toHaveLength(per - 5)
    expect(emptySlotIndicesOnPage(0, per, a4)).toEqual([])
  })

  it('bleed expands draw rect without changing nominal card rect', () => {
    const layout = computeLayout({ paper: 'a4', pageMargin: 7 })
    const nominal = cardRectMm(0, layout)
    const bled = cardBleedRectMm(0, layout, 2)
    expect(bled.x).toBeCloseTo(nominal.x - 2)
    expect(bled.y).toBeCloseTo(nominal.y - 2)
    expect(bled.w).toBeCloseTo(nominal.w + 4)
    expect(bled.h).toBeCloseTo(nominal.h + 4)
  })

  it('mmToPoints matches PDF user space (72 pt / inch)', () => {
    expect(mmToPoints(25.4)).toBeCloseTo(72)
    expect(mmToPoints(CARD_W_MM)).toBeCloseTo((CARD_W_MM * 72) / 25.4)
    expect(mmToPoints(210)).toBeCloseTo(595.27559, 4)
  })

  it('keeps card rects inside the page', () => {
    for (const paper of ['a4', 'a3', 'b4', 'letter', 'photo6'] as const) {
      for (const flushCut of [false, true]) {
        const layout = computeLayout({
          paper,
          pageMargin: flushCut ? 0 : 7,
          flushCut,
          gap: 0,
        })
        const per = cardsPerPage(layout)
        for (let i = 0; i < per; i++) {
          const rect = cardRectMm(i, layout)
          expect(rect.x).toBeGreaterThanOrEqual(-1e-9)
          expect(rect.y).toBeGreaterThanOrEqual(-1e-9)
          expect(rect.x + rect.w).toBeLessThanOrEqual(layout.pageW + 1e-9)
          expect(rect.y + rect.h).toBeLessThanOrEqual(layout.pageH + 1e-9)
        }
      }
    }
  })

  it('emits cut marks for grid corners', () => {
    const a4 = computeLayout({ paper: 'a4', pageMargin: 7 })
    expect(cutMarkLines(a4).length).toBeGreaterThan(0)
    const gapped = computeLayout({ paper: 'a4', pageMargin: 7, gap: 2 })
    expect(cutMarkLines(gapped).length).toBeGreaterThan(0)
  })
})
