import { describe, expect, it } from 'vitest'
import {
  BF_CARD_IDEAL_BASE_PX,
  boardCardHeightIndependentOfChrome,
  chromeScaleFromUiScale,
  idealBoardCardHeight,
} from '../regionBudget'
import {
  centerBoardPan,
  clampBoardPan,
  freePanRange,
  isBoardPanOffCenter,
} from '../../hooks/useBoardPan'

describe('regionBudget', () => {
  it('keeps board card height tied to ui-scale × density, not chrome scale', () => {
    const ui = 1
    const density = 0.9
    const ideal = idealBoardCardHeight(ui, density)
    expect(ideal).toBeCloseTo(BF_CARD_IDEAL_BASE_PX * ui * density, 5)
    expect(boardCardHeightIndependentOfChrome(ui, density, 0.5)).toBe(ideal)
    expect(boardCardHeightIndependentOfChrome(ui, density, 2)).toBe(ideal)
  })

  it('chrome scale stays gentler than raw ui-scale', () => {
    expect(chromeScaleFromUiScale(1)).toBeCloseTo(1, 5)
    expect(chromeScaleFromUiScale(2)).toBeLessThan(2)
    expect(chromeScaleFromUiScale(0.7)).toBeGreaterThan(0.7)
  })
})

describe('board pan clamp', () => {
  it('allows free pan even when content fits the stage', () => {
    const c = clampBoardPan(0, 0, 1000, 800, 600, 400)
    const center = centerBoardPan(1000, 800, 600, 400)
    const range = freePanRange(1000, 800)
    expect(c.x).toBeGreaterThanOrEqual(center.x - range.x)
    expect(c.x).toBeLessThanOrEqual(center.x + range.x)
    expect(c.y).toBeGreaterThanOrEqual(center.y - range.y)
    expect(c.y).toBeLessThanOrEqual(center.y + range.y)
    // Not locked to center — offset 0 is accepted within range
    expect(c.x).toBe(0)
    expect(c.y).toBe(0)
  })

  it('clamps travel around center for oversized content', () => {
    const center = centerBoardPan(800, 600, 1200, 1000)
    const range = freePanRange(800, 600)
    const c = clampBoardPan(-5000, -3000, 800, 600, 1200, 1000)
    expect(c.x).toBe(center.x - range.x)
    expect(c.y).toBe(center.y - range.y)
  })

  it('detects off-center focus for the recenter control', () => {
    const center = { x: 100, y: 80 }
    expect(isBoardPanOffCenter({ x: 100, y: 80 }, center)).toBe(false)
    expect(isBoardPanOffCenter({ x: 100 + 200, y: 80 }, center)).toBe(true)
  })
})
