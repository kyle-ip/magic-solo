const RARITY_FRAMES = new Set([
  'common',
  'uncommon',
  'rare',
  'mythic',
  'special',
  'bonus',
])

/** CSS class for rarity-colored card chrome (`rarity-frame-*`). */
export function rarityFrameClass(rarity: string | undefined | null): string {
  const key = (rarity || 'common').toLowerCase()
  return RARITY_FRAMES.has(key) ? `rarity-frame-${key}` : 'rarity-frame-common'
}
