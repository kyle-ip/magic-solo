/**
 * Local-only set gallery config. Series lists and art come from Scryfall at runtime.
 */

/** Set types shown in the gallery by default. */
export const INCLUDE_SET_TYPES = [
  'expansion',
  'core',
  'masters',
  'draft_innovation',
  'commander',
  'funny',
  'starter',
  'duel_deck',
  'from_the_vault',
  'premium_deck',
  'arsenal',
  'spellbook',
  'box',
  'masterpiece',
] as const

export type IncludedSetType = (typeof INCLUDE_SET_TYPES)[number]

/** Always drop these (noise / digital-only products). */
export const EXCLUDE_SET_TYPES = [
  'token',
  'memorabilia',
  'minigame',
  'alchemy',
  'treasure_chest',
  'vanguard',
  'planechase',
  'archenemy',
  'promo',
] as const

/** Exclude video-game-only sets. */
export const EXCLUDE_DIGITAL = true

/** Filter chips shown on the list page (plus "all"). */
export const SET_TYPE_FILTERS: Array<IncludedSetType | 'all'> = [
  'all',
  'expansion',
  'core',
  'masters',
  'draft_innovation',
  'commander',
  'funny',
  'starter',
]

const includeSet = new Set<string>(INCLUDE_SET_TYPES)
const excludeSet = new Set<string>(EXCLUDE_SET_TYPES)

export function isGallerySetType(setType: string): boolean {
  if (excludeSet.has(setType)) return false
  return includeSet.has(setType)
}

export function compareSetsByReleaseDesc(
  a: { releasedAt: string | null },
  b: { releasedAt: string | null },
): number {
  const da = a.releasedAt || ''
  const db = b.releasedAt || ''
  if (da === db) return 0
  return da < db ? 1 : -1
}
