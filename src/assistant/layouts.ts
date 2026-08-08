import type { ChallengeCode } from '../game/types'

type SetupKind = 'blank' | 'rules'

/**
 * Battlefield layout per challenge deck.
 * `rows` are top → bottom on screen (away from player → toward player).
 * Slot indices run left-to-right within each row, then top-to-bottom.
 */
export type BattlefieldLayout = {
  /** Slot counts for each row, top to bottom. */
  rows: readonly number[]
}

/** Original half-board: two equal rows of six. Used for blank-library setup. */
export const DEFAULT_BATTLEFIELD_LAYOUT: BattlefieldLayout = { rows: [6, 6] }

/**
 * Rules-setup layouts by deck:
 * - tfth: heads only — one wide row
 * - tbth: artifacts up top, minotaur swarm on the lower row
 * - tdag: god / enchantments up top, revelers on the lower row
 */
export const BATTLEFIELD_LAYOUTS: Record<ChallengeCode, BattlefieldLayout> = {
  tfth: { rows: [8] },
  tbth: { rows: [4, 8] },
  tdag: { rows: [3, 7] },
}

export function getBattlefieldLayout(
  code: ChallengeCode,
  setupKind: SetupKind = 'rules',
): BattlefieldLayout {
  if (setupKind === 'blank') return DEFAULT_BATTLEFIELD_LAYOUT
  return BATTLEFIELD_LAYOUTS[code]
}

export function battlefieldSlotCount(
  code: ChallengeCode,
  setupKind: SetupKind = 'rules',
): number {
  return getBattlefieldLayout(code, setupKind).rows.reduce((sum, n) => sum + n, 0)
}

export function maxRowSlots(
  code: ChallengeCode,
  setupKind: SetupKind = 'rules',
): number {
  return Math.max(...getBattlefieldLayout(code, setupKind).rows)
}

/** Inclusive start index + length for each row (top → bottom). */
export function battlefieldRowRanges(
  code: ChallengeCode,
  setupKind: SetupKind = 'rules',
): { start: number; count: number }[] {
  const ranges: { start: number; count: number }[] = []
  let start = 0
  for (const count of getBattlefieldLayout(code, setupKind).rows) {
    ranges.push({ start, count })
    start += count
  }
  return ranges
}

/** Lower (creature-facing) row — last row, or the only row. */
export function creatureRowRange(
  code: ChallengeCode,
  setupKind: SetupKind = 'rules',
): { start: number; count: number } {
  const ranges = battlefieldRowRanges(code, setupKind)
  return ranges[ranges.length - 1]
}

/** Upper support row when present (artifacts / god / enchantments). */
export function supportRowRange(
  code: ChallengeCode,
  setupKind: SetupKind = 'rules',
): { start: number; count: number } | null {
  const ranges = battlefieldRowRanges(code, setupKind)
  return ranges.length > 1 ? ranges[0] : null
}
