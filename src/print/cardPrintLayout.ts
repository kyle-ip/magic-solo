/**
 * Physical MTG proxy card layout.
 * Grid sizing inspired by iMasanari/proxy-card-print (MIT): auto cols/rows + orientation.
 */

export type PaperSizeId = 'a4' | 'a3' | 'b4' | 'letter' | 'photo6'

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

/** Portrait base dimensions (width × height mm). Orientation may flip at compute time. */
export const PAPER_SIZES: Record<PaperSizeId, readonly [number, number]> = {
  a4: [210, 297],
  a3: [297, 420],
  b4: [257, 364],
  letter: [215.9, 279.4],
  photo6: [102, 152],
}

/** Official MTG / Pokémon standard size (≈ 2.5″×3.5″). */
export const CARD_W_MM = 63
export const CARD_H_MM = 88

export const DEFAULT_PAGE_MARGIN_MM = 7
export const DEFAULT_GAP_MM = 0
export const MAX_PAGE_MARGIN_MM = 50

export interface PrintLayoutOptions {
  paper: PaperSizeId
  /** Card width mm (clamped to printable area). */
  cardW?: number
  /** Card height mm. */
  cardH?: number
  /**
   * Inset from page edge (mm). Default 7.
   * Internally uses (margin + 1) for cut-mark breathing room (proxy-card-print).
   */
  pageMargin?: number
  /** Gap between cards (mm). Default 0. */
  gap?: number
  /**
   * When true, force pageMargin to 0 (flush cut / strip cutting).
   * Overrides pageMargin.
   */
  flushCut?: boolean
}

export interface PrintLayout {
  paper: PaperSizeId
  pageW: number
  pageH: number
  cols: number
  rows: number
  cardW: number
  cardH: number
  gap: number
  pageMargin: number
  /** Top-left of first card cell (mm). */
  originX: number
  originY: number
  landscape: boolean
}

function toNonNegInt(n: number | undefined, fallback: number): number {
  if (n == null || !Number.isFinite(n)) return fallback
  return Math.max(0, Math.floor(n))
}

function fitGrid(
  printableW: number,
  printableH: number,
  cardW: number,
  cardH: number,
  gap: number,
): { cols: number; rows: number } {
  const cols = Math.floor((printableW + gap) / (cardW + gap))
  const rows = Math.floor((printableH + gap) / (cardH + gap))
  return {
    cols: Math.max(0, cols),
    rows: Math.max(0, rows),
  }
}

/**
 * Compute a centered grid that maximizes cards per page, choosing
 * portrait vs landscape automatically.
 */
export function computeLayout(options: PrintLayoutOptions): PrintLayout {
  const paper = options.paper
  const [baseW, baseH] = PAPER_SIZES[paper]
  const gap = toNonNegInt(options.gap, DEFAULT_GAP_MM)
  const pageMargin = options.flushCut
    ? 0
    : Math.min(
        toNonNegInt(options.pageMargin, DEFAULT_PAGE_MARGIN_MM),
        MAX_PAGE_MARGIN_MM,
      )

  const marginPad = pageMargin + 1
  const printableW = baseW - marginPad * 2
  const printableH = baseH - marginPad * 2

  // Clamp to portrait printable first (matches proxy-card-print), then try both orientations.
  const wantW = Math.max(1, options.cardW ?? CARD_W_MM)
  const wantH = Math.max(1, options.cardH ?? CARD_H_MM)
  const cardW = Math.min(wantW, Math.max(1, printableW))
  const cardH = Math.min(wantH, Math.max(1, printableH))

  const fitPortrait = fitGrid(printableW, printableH, cardW, cardH, gap)
  const fitLandscape = fitGrid(printableH, printableW, cardW, cardH, gap)

  const countP = fitPortrait.cols * fitPortrait.rows
  const countL = fitLandscape.cols * fitLandscape.rows
  const landscape = countL > countP

  const pageW = landscape ? baseH : baseW
  const pageH = landscape ? baseW : baseH
  const cols = landscape ? fitLandscape.cols : fitPortrait.cols
  const rows = landscape ? fitLandscape.rows : fitPortrait.rows

  const finalCardW = Math.min(wantW, Math.max(1, pageW - marginPad * 2))
  const finalCardH = Math.min(wantH, Math.max(1, pageH - marginPad * 2))

  const gridW =
    cols > 0 ? cols * finalCardW + Math.max(0, cols - 1) * gap : 0
  const gridH =
    rows > 0 ? rows * finalCardH + Math.max(0, rows - 1) * gap : 0

  return {
    paper,
    pageW,
    pageH,
    cols: Math.max(0, cols),
    rows: Math.max(0, rows),
    cardW: finalCardW,
    cardH: finalCardH,
    gap,
    pageMargin,
    originX: (pageW - gridW) / 2,
    originY: (pageH - gridH) / 2,
    landscape,
  }
}

/** @deprecated Prefer computeLayout — kept as thin wrapper for callers. */
export function getPaperLayout(
  paper: PaperSizeId,
  options: Omit<PrintLayoutOptions, 'paper'> = {},
): PrintLayout {
  return computeLayout({ paper, ...options })
}

export function cardsPerPage(layout: PrintLayout): number {
  return Math.max(0, layout.cols * layout.rows)
}

export function pageCount(cardCount: number, layout: PrintLayout): number {
  const per = cardsPerPage(layout)
  if (cardCount <= 0 || per <= 0) return 0
  return Math.ceil(cardCount / per)
}

export function slotForIndex(
  index: number,
  layout: PrintLayout,
): { page: number; row: number; col: number } {
  const per = Math.max(1, cardsPerPage(layout))
  const page = Math.floor(index / per)
  const onPage = index % per
  return {
    page,
    row: Math.floor(onPage / layout.cols),
    col: onPage % layout.cols,
  }
}

export function cardRectMm(index: number, layout: PrintLayout): RectMm {
  const { row, col } = slotForIndex(index, layout)
  return {
    x: layout.originX + col * (layout.cardW + layout.gap),
    y: layout.originY + row * (layout.cardH + layout.gap),
    w: layout.cardW,
    h: layout.cardH,
  }
}

/** Bleed-expanded draw rect (same center as card; cut guides stay on nominal edge). */
export function cardBleedRectMm(
  index: number,
  layout: PrintLayout,
  bleedMm: number,
): RectMm {
  const rect = cardRectMm(index, layout)
  const b = Math.max(0, bleedMm)
  if (b === 0) return rect
  return {
    x: rect.x - b,
    y: rect.y - b,
    w: rect.w + b * 2,
    h: rect.h + b * 2,
  }
}

/** Cards that appear on a given 0-based page. */
export function indicesOnPage(
  page: number,
  cardCount: number,
  layout: PrintLayout,
): number[] {
  const per = cardsPerPage(layout)
  if (per <= 0) return []
  const start = page * per
  const end = Math.min(cardCount, start + per)
  const out: number[] = []
  for (let i = start; i < end; i++) out.push(i)
  return out
}

/** Empty slot global indices on a page when fill-empty is enabled. */
export function emptySlotIndicesOnPage(
  page: number,
  cardCount: number,
  layout: PrintLayout,
): number[] {
  const per = cardsPerPage(layout)
  if (per <= 0) return []
  const start = page * per
  const filled = Math.max(0, Math.min(cardCount, start + per) - start)
  if (filled >= per) return []
  const out: number[] = []
  for (let i = filled; i < per; i++) out.push(start + i)
  return out
}

/**
 * Cut guides at nominal card edges, extended to the page boundary so you can
 * cut inward from the paper edge (guillotine / ruler).
 * Unique X/Y cut positions become full-page vertical/horizontal lines.
 */
export function cutGuideLines(layout: PrintLayout): LineMm[] {
  const lines: LineMm[] = []
  const { cols, rows, cardW, cardH, gap, originX, originY, pageW, pageH } =
    layout
  if (cols <= 0 || rows <= 0) return lines

  const xs = new Set<number>()
  const ys = new Set<number>()

  if (gap === 0) {
    for (let col = 0; col <= cols; col++) xs.add(originX + col * cardW)
    for (let row = 0; row <= rows; row++) ys.add(originY + row * cardH)
  } else {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const left = originX + col * (cardW + gap)
        const top = originY + row * (cardH + gap)
        xs.add(left)
        xs.add(left + cardW)
        ys.add(top)
        ys.add(top + cardH)
      }
    }
  }

  for (const y of ys) {
    lines.push({ x1: 0, y1: y, x2: pageW, y2: y })
  }
  for (const x of xs) {
    lines.push({ x1: x, y1: 0, x2: x, y2: pageH })
  }
  return lines
}

/** @deprecated Prefer cutGuideLines — continuous edge guides. */
export function cutMarkLines(layout: PrintLayout): LineMm[] {
  return cutGuideLines(layout)
}

export function mmToPoints(mm: number): number {
  return (mm * 72) / 25.4
}
