import type { ChallengeCode } from '../game/types'

type SetupKind = 'blank' | 'rules'

/**
 * Battlefield layout: `rows` are top → bottom.
 * Slot indices run left-to-right within each row, then top-to-bottom.
 */
export type BattlefieldLayout = {
  /** Slot counts for each row, top to bottom. */
  rows: readonly number[]
}

export type BoardCell = {
  id: string
  row: number
  col: number
}

/** Blank-library boards start as a single seat and grow cell-by-cell. */
export const BLANK_BOARD_START: BattlefieldLayout = { rows: [1] }

export const MAX_BOARD_COLS = 10
export const MAX_BOARD_ROWS = 8
export const MAX_BOARD_CELLS = 40

/**
 * Rules-setup layouts by deck:
 * - tfth: heads only — one wide row
 * - tbth: artifacts up top, minotaur swarm on the lower row
 * - tdag: god / enchantments up top, revelers on the lower row
 */
export const BATTLEFIELD_LAYOUTS: Record<ChallengeCode, BattlefieldLayout> = {
  tfth: { rows: [8] },
  tbth: { rows: [4, 8] },
  tdag: { rows: [3, 7] },
}

let cellSeq = 0

export function resetBoardCellSeq() {
  cellSeq = 0
}

export function nextBoardCellId(): string {
  cellSeq += 1
  return `seat-${cellSeq}`
}

export function rulesBattlefieldLayout(code: ChallengeCode): BattlefieldLayout {
  return BATTLEFIELD_LAYOUTS[code]
}

export function cellsFromRows(rows: readonly number[]): BoardCell[] {
  const cells: BoardCell[] = []
  rows.forEach((count, row) => {
    for (let col = 0; col < count; col += 1) {
      cells.push({ id: nextBoardCellId(), row, col })
    }
  })
  return cells
}

export function initialBoardCells(
  code: ChallengeCode,
  setupKind: SetupKind,
): BoardCell[] {
  resetBoardCellSeq()
  if (setupKind === 'blank') {
    return [{ id: nextBoardCellId(), row: 0, col: 0 }]
  }
  return cellsFromRows(rulesBattlefieldLayout(code).rows)
}

/** @deprecated Prefer boardCells — kept for placement helpers. */
export function initialBoardRows(
  code: ChallengeCode,
  setupKind: SetupKind,
): number[] {
  if (setupKind === 'blank') return [...BLANK_BOARD_START.rows]
  return [...rulesBattlefieldLayout(code).rows]
}

export function slotCountFromRows(rows: readonly number[]): number {
  return rows.reduce((sum, n) => sum + n, 0)
}

export function maxRowSlotsFromRows(rows: readonly number[]): number {
  return rows.length ? Math.max(...rows) : 1
}

/** Inclusive start index + length for each row (top → bottom). */
export function rowRangesFromRows(
  rows: readonly number[],
): { start: number; count: number }[] {
  const ranges: { start: number; count: number }[] = []
  let start = 0
  for (const count of rows) {
    ranges.push({ start, count })
    start += count
  }
  return ranges
}

/** Lower (creature-facing) row — last row, or the only row. */
export function creatureRowFromRows(
  rows: readonly number[],
): { start: number; count: number } {
  const ranges = rowRangesFromRows(rows)
  return ranges[ranges.length - 1] ?? { start: 0, count: 0 }
}

/** Upper support row when present. */
export function supportRowFromRows(
  rows: readonly number[],
): { start: number; count: number } | null {
  const ranges = rowRangesFromRows(rows)
  return ranges.length > 1 ? ranges[0] : null
}

export function boardBounds(cells: readonly BoardCell[]): {
  maxRow: number
  maxCol: number
  cols: number
  rows: number
} {
  if (cells.length === 0) {
    return { maxRow: 0, maxCol: 0, cols: 1, rows: 1 }
  }
  const maxRow = Math.max(...cells.map((c) => c.row))
  const maxCol = Math.max(...cells.map((c) => c.col))
  return {
    maxRow,
    maxCol,
    cols: maxCol + 1,
    rows: maxRow + 1,
  }
}

/** Group cells by row for rendering; each row sorted by col. */
export function groupCellsByRow(
  cells: readonly BoardCell[],
): { row: number; entries: { cell: BoardCell; index: number }[] }[] {
  const byRow = new Map<number, { cell: BoardCell; index: number }[]>()
  cells.forEach((cell, index) => {
    const list = byRow.get(cell.row) ?? []
    list.push({ cell, index })
    byRow.set(cell.row, list)
  })
  return [...byRow.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([row, list]) => ({
      row,
      entries: list.sort((a, b) => a.cell.col - b.cell.col),
    }))
}

export function hasCellAt(
  cells: readonly BoardCell[],
  row: number,
  col: number,
): boolean {
  return cells.some((c) => c.row === row && c.col === col)
}

/** @deprecated Prefer state.boardCells — kept for call sites during transition. */
export function getBattlefieldLayout(
  code: ChallengeCode,
  setupKind: SetupKind = 'rules',
): BattlefieldLayout {
  if (setupKind === 'blank') return BLANK_BOARD_START
  return rulesBattlefieldLayout(code)
}

export function battlefieldSlotCount(
  code: ChallengeCode,
  setupKind: SetupKind = 'rules',
): number {
  return slotCountFromRows(getBattlefieldLayout(code, setupKind).rows)
}

export function maxRowSlots(
  code: ChallengeCode,
  setupKind: SetupKind = 'rules',
): number {
  return maxRowSlotsFromRows(getBattlefieldLayout(code, setupKind).rows)
}

export function battlefieldRowRanges(
  code: ChallengeCode,
  setupKind: SetupKind = 'rules',
): { start: number; count: number }[] {
  return rowRangesFromRows(getBattlefieldLayout(code, setupKind).rows)
}

export function creatureRowRange(
  code: ChallengeCode,
  setupKind: SetupKind = 'rules',
): { start: number; count: number } {
  return creatureRowFromRows(getBattlefieldLayout(code, setupKind).rows)
}

export function supportRowRange(
  code: ChallengeCode,
  setupKind: SetupKind = 'rules',
): { start: number; count: number } | null {
  return supportRowFromRows(getBattlefieldLayout(code, setupKind).rows)
}
