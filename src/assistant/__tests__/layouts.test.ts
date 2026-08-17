import { describe, expect, it } from 'vitest'
import {
  boardBounds,
  cellsFromRows,
  resetBoardCellSeq,
} from '../layouts'

describe('assistant layouts', () => {
  it('centers shorter rules rows and keeps uniform col span', () => {
    resetBoardCellSeq()
    const cells = cellsFromRows([4, 8])
    expect(cells).toHaveLength(12)
    const bounds = boardBounds(cells)
    expect(bounds.cols).toBe(8)
    expect(bounds.rows).toBe(2)
    const top = cells.filter((c) => c.row === 0)
    expect(top.map((c) => c.col)).toEqual([2, 3, 4, 5])
    const bottom = cells.filter((c) => c.row === 1)
    expect(bottom.map((c) => c.col)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })
})
