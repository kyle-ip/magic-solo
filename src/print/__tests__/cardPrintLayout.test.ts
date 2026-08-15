import { describe, expect, it } from 'vitest'
import {
  CARD_H_MM,
  CARD_W_MM,
  cardRectMm,
  cardsPerPage,
  cutMarkLines,
  getPaperLayout,
  indicesOnPage,
  mmToPoints,
  pageCount,
  slotForIndex,
} from '../cardPrintLayout'

describe('cardPrintLayout', () => {
  it('A4 fits a top-left 3×3 grid of standard cards', () => {
    const layout = getPaperLayout('a4')
    expect(layout.cols).toBe(3)
    expect(layout.rows).toBe(3)
    expect(cardsPerPage('a4')).toBe(9)
    expect(CARD_W_MM).toBe(64)
    expect(CARD_H_MM).toBe(88)
    expect(layout.originX).toBe(0)
    expect(layout.originY).toBe(0)
    expect(layout.originX + 3 * CARD_W_MM).toBeLessThanOrEqual(layout.pageW)
    expect(layout.originY + 3 * CARD_H_MM).toBeLessThanOrEqual(layout.pageH)
  })

  it('A3 fits a top-left 4×4 grid of standard cards', () => {
    const layout = getPaperLayout('a3')
    expect(layout.cols).toBe(4)
    expect(layout.rows).toBe(4)
    expect(cardsPerPage('a3')).toBe(16)
    expect(layout.pageW).toBe(297)
    expect(layout.pageH).toBe(420)
    expect(layout.originX).toBe(0)
    expect(layout.originY).toBe(0)
    expect(layout.originX + 4 * CARD_W_MM).toBeLessThanOrEqual(layout.pageW)
    expect(layout.originY + 4 * CARD_H_MM).toBeLessThanOrEqual(layout.pageH)
  })

  it('6\" photo paper is one card per page top-left', () => {
    const layout = getPaperLayout('photo6')
    expect(cardsPerPage('photo6')).toBe(1)
    expect(layout.pageW).toBe(102)
    expect(layout.pageH).toBe(152)
    const rect = cardRectMm(0, 'photo6')
    expect(rect.w).toBe(CARD_W_MM)
    expect(rect.h).toBe(CARD_H_MM)
    expect(rect.x).toBe(0)
    expect(rect.y).toBe(0)
    expect(rect.x + rect.w).toBeLessThanOrEqual(layout.pageW)
    expect(rect.y + rect.h).toBeLessThanOrEqual(layout.pageH)
  })

  it('computes page counts and slots', () => {
    expect(pageCount(0, 'a4')).toBe(0)
    expect(pageCount(1, 'a4')).toBe(1)
    expect(pageCount(9, 'a4')).toBe(1)
    expect(pageCount(10, 'a4')).toBe(2)
    expect(pageCount(10, 'photo6')).toBe(10)
    expect(pageCount(16, 'a3')).toBe(1)
    expect(pageCount(17, 'a3')).toBe(2)

    expect(slotForIndex(0, 'a4')).toEqual({ page: 0, row: 0, col: 0 })
    expect(slotForIndex(5, 'a4')).toEqual({ page: 0, row: 1, col: 2 })
    expect(slotForIndex(9, 'a4')).toEqual({ page: 1, row: 0, col: 0 })
    expect(slotForIndex(15, 'a3')).toEqual({ page: 0, row: 3, col: 3 })
    expect(slotForIndex(16, 'a3')).toEqual({ page: 1, row: 0, col: 0 })
    expect(slotForIndex(3, 'photo6')).toEqual({ page: 3, row: 0, col: 0 })
  })

  it('lists indices on a page without overflow', () => {
    expect(indicesOnPage(0, 5, 'a4')).toEqual([0, 1, 2, 3, 4])
    expect(indicesOnPage(1, 12, 'a4')).toEqual([9, 10, 11])
    expect(indicesOnPage(0, 20, 'a3')).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ])
    expect(indicesOnPage(1, 18, 'a3')).toEqual([16, 17])
    expect(indicesOnPage(2, 3, 'photo6')).toEqual([2])
  })

  it('centers the grid when keepEdgeMargin is on', () => {
    const layout = getPaperLayout('a4', { keepEdgeMargin: true })
    expect(layout.originX).toBeCloseTo((210 - 3 * CARD_W_MM) / 2)
    expect(layout.originY).toBeCloseTo((297 - 3 * CARD_H_MM) / 2)
    const rect = cardRectMm(0, 'a4', { keepEdgeMargin: true })
    expect(rect.x).toBeCloseTo(layout.originX)
    expect(rect.y).toBeCloseTo(layout.originY)
  })

  it('mmToPoints matches PDF user space (72 pt / inch)', () => {
    expect(mmToPoints(25.4)).toBeCloseTo(72)
    expect(mmToPoints(CARD_W_MM)).toBeCloseTo((CARD_W_MM * 72) / 25.4)
    expect(mmToPoints(210)).toBeCloseTo(595.27559, 4)
  })

  it('keeps card rects inside the page', () => {
    for (const paper of ['a4', 'a3', 'photo6'] as const) {
      for (const keepEdgeMargin of [false, true]) {
        const layout = getPaperLayout(paper, { keepEdgeMargin })
        const per = cardsPerPage(paper)
        for (let i = 0; i < per; i++) {
          const rect = cardRectMm(i, paper, { keepEdgeMargin })
          expect(rect.x).toBeGreaterThanOrEqual(0)
          expect(rect.y).toBeGreaterThanOrEqual(0)
          expect(rect.x + rect.w).toBeLessThanOrEqual(layout.pageW + 1e-9)
          expect(rect.y + rect.h).toBeLessThanOrEqual(layout.pageH + 1e-9)
        }
      }
    }
  })

  it('emits cut marks for grid corners', () => {
    expect(cutMarkLines('a4').length).toBeGreaterThan(0)
    expect(cutMarkLines('a3').length).toBeGreaterThan(0)
    expect(cutMarkLines('photo6').length).toBeGreaterThan(0)
  })
})
