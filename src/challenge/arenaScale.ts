/** Reference canvas for Challenge fit-to-viewport UI (1080p = 1). */
export const ARENA_REF_WIDTH = 1920
export const ARENA_REF_HEIGHT = 1080
export const ARENA_UI_SCALE_MIN = 0.7
export const ARENA_UI_SCALE_MAX = 2.1

/** Uniform UI scale from viewport size vs 1920×1080. */
export function computeArenaUiScale(
  width: number,
  height: number,
  min = ARENA_UI_SCALE_MIN,
  max = ARENA_UI_SCALE_MAX,
): number {
  if (!(width > 0) || !(height > 0)) return 1
  const raw = Math.min(width / ARENA_REF_WIDTH, height / ARENA_REF_HEIGHT)
  return Math.min(max, Math.max(min, raw))
}
