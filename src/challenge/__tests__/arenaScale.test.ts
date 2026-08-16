import { describe, expect, it } from 'vitest'
import { computeArenaUiScale } from '../arenaScale'

describe('computeArenaUiScale', () => {
  it('maps 1080p to 1', () => {
    expect(computeArenaUiScale(1920, 1080)).toBe(1)
  })

  it('maps 2K (~2560×1440) to ~1.333', () => {
    expect(computeArenaUiScale(2560, 1440)).toBeCloseTo(4 / 3, 5)
  })

  it('maps 4K to 2', () => {
    expect(computeArenaUiScale(3840, 2160)).toBe(2)
  })

  it('clamps below min and above max', () => {
    expect(computeArenaUiScale(800, 600)).toBe(0.7)
    expect(computeArenaUiScale(8000, 5000)).toBe(2.1)
  })

  it('returns 1 for invalid sizes', () => {
    expect(computeArenaUiScale(0, 1080)).toBe(1)
    expect(computeArenaUiScale(1920, -1)).toBe(1)
  })
})
