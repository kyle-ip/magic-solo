/** Physical MTG card size (approx.) and printable paper layouts. */

export type PaperSizeId = 'a4' | 'a3' | 'photo6'

export interface RectMm {
  x: number
  y: number
  w: number
  h: number
}

export interface LineMm {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface PaperLayout {
  id: PaperSizeId
  /** Page width in mm */
  pageW: number
  /** Page height in mm */
  pageH: number
  cols: number
  rows: number
  cardW: number
  cardH: number
  /** Origin of the grid (top-left of first card), mm from page top-left */
  originX: number
  originY: number
}

/**
 * Physical MTG card size used for proxies (64×88 mm).
 * Strict 2.5″×3.5″ is 63.5×88.9 mm; width is rounded up for common sleeve fit.
 */
export const CARD_W_MM = 64
export const CARD_H_MM = 88

/**
 * Inset from page edge when edge margins are off (mm).
 * 0 = flush top-left for strip cutting; cut marks on the outer edge may clip slightly.
 */
const GRID_ORIGIN_FLUSH_MM = 0

export type PrintLayoutOptions = {
  /**
   * When true, center the card grid so leftover paper is equal on all sides.
   * When false (default), pin the grid flush to the top-left for easier strip cutting.
   */
  keepEdgeMargin?: boolean
}

const PAPERS: Record<PaperSizeId, Omit<PaperLayout, 'originX' | 'originY'>> = {
  a4: {
    id: 'a4',
    pageW: 210,
    pageH: 297,
    cols: 3,
    rows: 3,
    cardW: CARD_W_MM,
    cardH: CARD_H_MM,
  },
  a3: {
    id: 'a3',
    pageW: 297,
    pageH: 420,
    cols: 4,
    rows: 4,
    cardW: CARD_W_MM,
    cardH: CARD_H_MM,
  },
  photo6: {
    id: 'photo6',
    pageW: 102,
    pageH: 152,
    cols: 1,
    rows: 1,
    cardW: CARD_W_MM,
    cardH: CARD_H_MM,
  },
}

export function getPaperLayout(
  paper: PaperSizeId,
  options: PrintLayoutOptions = {},
): PaperLayout {
  const base = PAPERS[paper]
  const gridW = base.cols * base.cardW
  const gridH = base.rows * base.cardH
  if (options.keepEdgeMargin) {
    return {
      ...base,
      originX: (base.pageW - gridW) / 2,
      originY: (base.pageH - gridH) / 2,
    }
  }
  return {
    ...base,
    originX: GRID_ORIGIN_FLUSH_MM,
    originY: GRID_ORIGIN_FLUSH_MM,
  }
}

export function cardsPerPage(paper: PaperSizeId): number {
  const layout = getPaperLayout(paper)
  return layout.cols * layout.rows
}

export function pageCount(cardCount: number, paper: PaperSizeId): number {
  if (cardCount <= 0) return 0
  return Math.ceil(cardCount / cardsPerPage(paper))
}

export function slotForIndex(
  index: number,
  paper: PaperSizeId,
): { page: number; row: number; col: number } {
  const per = cardsPerPage(paper)
  const layout = getPaperLayout(paper)
  const page = Math.floor(index / per)
  const onPage = index % per
  return {
    page,
    row: Math.floor(onPage / layout.cols),
    col: onPage % layout.cols,
  }
}

export function cardRectMm(
  index: number,
  paper: PaperSizeId,
  options: PrintLayoutOptions = {},
): RectMm {
  const layout = getPaperLayout(paper, options)
  const { row, col } = slotForIndex(index, paper)
  return {
    x: layout.originX + col * layout.cardW,
    y: layout.originY + row * layout.cardH,
    w: layout.cardW,
    h: layout.cardH,
  }
}

/** Cards that appear on a given 0-based page. */
export function indicesOnPage(
  page: number,
  cardCount: number,
  paper: PaperSizeId,
): number[] {
  const per = cardsPerPage(paper)
  const start = page * per
  const end = Math.min(cardCount, start + per)
  const out: number[] = []
  for (let i = start; i < end; i++) out.push(i)
  return out
}

const CUT_MARK_MM = 3

/**
 * Cut marks for one page: short ticks at each card cell corner,
 * drawn just outside the card edge so they do not cover art.
 */
export function cutMarkLines(
  paper: PaperSizeId,
  options: PrintLayoutOptions = {},
): LineMm[] {
  const layout = getPaperLayout(paper, options)
  const lines: LineMm[] = []
  const mark = CUT_MARK_MM

  for (let row = 0; row <= layout.rows; row++) {
    for (let col = 0; col <= layout.cols; col++) {
      const x = layout.originX + col * layout.cardW
      const y = layout.originY + row * layout.cardH

      // Horizontal ticks
      if (col > 0) {
        lines.push({ x1: x - mark, y1: y, x2: x, y2: y })
      }
      if (col < layout.cols) {
        lines.push({ x1: x, y1: y, x2: x + mark, y2: y })
      }
      // Vertical ticks
      if (row > 0) {
        lines.push({ x1: x, y1: y - mark, x2: x, y2: y })
      }
      if (row < layout.rows) {
        lines.push({ x1: x, y1: y, x2: x, y2: y + mark })
      }
    }
  }

  return lines
}

export function mmToPoints(mm: number): number {
  return (mm * 72) / 25.4
}
