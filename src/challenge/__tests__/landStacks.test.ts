import { describe, expect, it } from 'vitest'
import { groupLandStacks, landStackKey, type LandLike } from '../landStacks'

function land(partial: Partial<LandLike> & Pick<LandLike, 'instanceId' | 'name'>): LandLike {
  return {
    defId: partial.defId ?? partial.name,
    tapped: partial.tapped ?? false,
    image: partial.image ?? `/img/${partial.name}.jpg`,
    typeLine: partial.typeLine ?? 'Basic Land',
    produces: partial.produces ?? ['G'],
    ...partial,
  }
}

describe('groupLandStacks', () => {
  it('returns empty for no lands', () => {
    expect(groupLandStacks([])).toEqual([])
  })

  it('builds a stable stack key from face identity', () => {
    expect(
      landStackKey({
        defId: 'forest',
        name: 'Forest',
        image: '/img/Forest.jpg',
      }),
    ).toBe('forest|Forest|/img/Forest.jpg')
  })

  it('stacks identical lands and counts taps', () => {
    const stacks = groupLandStacks([
      land({ instanceId: '1', name: 'Forest', tapped: true }),
      land({ instanceId: '2', name: 'Forest', tapped: false }),
      land({ instanceId: '3', name: 'Forest', tapped: true }),
      land({ instanceId: '4', name: 'Mountain', defId: 'm', image: '/m.jpg', produces: ['R'] }),
    ])
    expect(stacks).toHaveLength(2)
    const forest = stacks.find((s) => s.name === 'Forest')!
    expect(forest.count).toBe(3)
    expect(forest.tappedCount).toBe(2)
    expect(forest.top.tapped).toBe(false)
    expect(stacks.find((s) => s.name === 'Mountain')!.count).toBe(1)
  })
})
