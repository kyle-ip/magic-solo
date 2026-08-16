export type BoardDensityTier = 'normal' | 'dense' | 'crowded'

export interface BoardDensityInput {
  creatureCount: number
  landCount: number
  /**
   * Visible land columns after stacking. When set, land dense/crowded
   * uses this instead of raw landCount (6 lands in 2 stacks ≠ crowded).
   */
  landStackCount?: number
  /** Opponent / challenge permanents on the board row */
  opponentCount?: number
}

export interface BoardDensityResult {
  tier: BoardDensityTier
  /** Multiplier for --bf-density (1 = full size) */
  density: number
  creatureClass: '' | ' is-dense' | ' is-crowded'
  landClass: '' | ' is-dense' | ' is-crowded'
}

function tierForCount(n: number, denseAt: number, crowdedAt: number): BoardDensityTier {
  if (n >= crowdedAt) return 'crowded'
  if (n >= denseAt) return 'dense'
  return 'normal'
}

function densityForTier(tier: BoardDensityTier): number {
  if (tier === 'crowded') return 0.72
  if (tier === 'dense') return 0.86
  return 1
}

function classForTier(tier: BoardDensityTier): '' | ' is-dense' | ' is-crowded' {
  if (tier === 'crowded') return ' is-crowded'
  if (tier === 'dense') return ' is-dense'
  return ''
}

/** Derive board crowding classes and a shared --bf-density factor. */
export function computeBoardDensity(input: BoardDensityInput): BoardDensityResult {
  const creatureTier = tierForCount(input.creatureCount, 6, 10)
  const landColumns = input.landStackCount ?? input.landCount
  // Stack columns are fewer than raw cards; slightly lower thresholds.
  const landTier = tierForCount(
    landColumns,
    input.landStackCount != null ? 5 : 6,
    input.landStackCount != null ? 8 : 10,
  )
  const opponentTier = tierForCount(input.opponentCount ?? 0, 6, 10)

  const worst: BoardDensityTier =
    creatureTier === 'crowded' || landTier === 'crowded' || opponentTier === 'crowded'
      ? 'crowded'
      : creatureTier === 'dense' || landTier === 'dense' || opponentTier === 'dense'
        ? 'dense'
        : 'normal'

  return {
    tier: worst,
    density: densityForTier(worst),
    creatureClass: classForTier(creatureTier),
    landClass: classForTier(landTier),
  }
}
