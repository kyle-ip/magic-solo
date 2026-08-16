import { describe, expect, it } from 'vitest'
import { computeArenaUiScale } from '../arenaScale'

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
