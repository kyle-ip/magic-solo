import { describe, expect, it } from 'vitest'
import { computeBoardDensity } from '../boardDensity'

describe('computeBoardDensity', () => {
  it('stays normal for small boards', () => {
    const r = computeBoardDensity({ creatureCount: 3, landCount: 4 })
    expect(r.tier).toBe('normal')
    expect(r.density).toBe(1)
    expect(r.creatureClass).toBe('')
    expect(r.landClass).toBe('')
  })

  it('marks dense and crowded tiers', () => {
    expect(computeBoardDensity({ creatureCount: 6, landCount: 2 }).creatureClass).toBe(
      ' is-dense',
    )
    expect(computeBoardDensity({ creatureCount: 10, landCount: 2 }).creatureClass).toBe(
      ' is-crowded',
    )
    expect(computeBoardDensity({ creatureCount: 2, landCount: 11 }).landClass).toBe(
      ' is-crowded',
    )
    expect(computeBoardDensity({ creatureCount: 1, landCount: 1, opponentCount: 10 }).opponentClass).toBe(
      ' is-crowded',
    )
  })

  it('uses land stack columns when provided', () => {
    const manyLandsFewStacks = computeBoardDensity({
      creatureCount: 1,
      landCount: 12,
      landStackCount: 2,
    })
    expect(manyLandsFewStacks.landClass).toBe('')
    expect(manyLandsFewStacks.tier).toBe('normal')

    const manyStacks = computeBoardDensity({
      creatureCount: 1,
      landCount: 12,
      landStackCount: 8,
    })
    expect(manyStacks.landClass).toBe(' is-crowded')
  })

  it('uses worst tier for shared density', () => {
    const r = computeBoardDensity({
      creatureCount: 3,
      landCount: 3,
      opponentCount: 12,
    })
    expect(r.tier).toBe('crowded')
    expect(r.density).toBe(0.72)
  })
})
