import { describe, expect, it } from 'vitest'
import { computeArenaUiScale } from '../arenaScale'
import {
  boardCardHeightIndependentOfChrome,
  chromeScaleFromUiScale,
  idealBoardCardHeight,
} from '../regionBudget'
import { clampBoardPan } from '../../hooks/useBoardPan'

/** P0 PC matrix from the Challenge Arena UI plan. */
const P0_VIEWPORTS = [
  { name: '1080p', width: 1920, height: 1080, scale: 1 },
  { name: '2K', width: 2560, height: 1440, scale: 4 / 3 },
  { name: '4K', width: 3840, height: 2160, scale: 2 },
] as const

describe('Challenge P0 resolution matrix', () => {
  it.each(P0_VIEWPORTS)('$name → scale $scale', ({ width, height, scale }) => {
    expect(computeArenaUiScale(width, height)).toBeCloseTo(scale, 5)
  })

  it('keeps 4K under the max clamp ceiling', () => {
    expect(computeArenaUiScale(3840, 2160)).toBeLessThanOrEqual(2.1)
  })
})

describe('Challenge board vs chrome on short viewports', () => {
  it.each([
    { name: 'short laptop', width: 1440, height: 720 },
    { name: '1080p', width: 1920, height: 1080 },
    { name: 'ultrawide short', width: 2560, height: 900 },
  ])('$name keeps card height at ideal while chrome scales', ({ width, height }) => {
    const ui = computeArenaUiScale(width, height)
    const chrome = chromeScaleFromUiScale(ui)
    const cardH = boardCardHeightIndependentOfChrome(ui, 1, chrome)
    expect(cardH).toBe(idealBoardCardHeight(ui, 1))
    // Pan, not shrink: oversized board content remains clampable.
    const stageH = height * 0.55
    const contentH = cardH * 4 + 48
    const pan = clampBoardPan(0, 0, width, stageH, width * 0.9, contentH)
    if (contentH > stageH) {
      expect(pan.y).toBeLessThanOrEqual(48)
      expect(pan.y).toBeGreaterThanOrEqual(stageH - contentH - 48)
    }
  })
})
