/** M15 / modern-frame layout in Scryfall PNG coordinates (745×1040). */

export const CARD_W = 745
export const CARD_H = 1040
export const CARD_CORNER_R = 36

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Proportions tuned against modern-frame scans (e.g. Fifth Dawn).
 * Name/type sit on the colored plate; text box is a recessed parchment window.
 */
export const M15 = {
  border: 24,
  /** Name baseline band (text drawn on frame; no separate cream bar). */
  titleBar: { x: 42, y: 38, w: 661, h: 48 } satisfies Rect,
  art: { x: 46, y: 96, w: 653, h: 472 } satisfies Rect,
  typeBar: { x: 42, y: 582, w: 661, h: 40 } satisfies Rect,
  textBox: { x: 46, y: 634, w: 653, h: 298 } satisfies Rect,
  ptBox: { x: 560, y: 938, w: 138, h: 48 } satisfies Rect,
  footer: { x: 48, y: 948, w: 480, h: 40 } satisfies Rect,
  rarityStamp: { x: 662, y: 586, w: 30, h: 30 } satisfies Rect,
} as const

export function insetRect(r: Rect, pad: number): Rect {
  return {
    x: r.x + pad,
    y: r.y + pad,
    w: Math.max(0, r.w - pad * 2),
    h: Math.max(0, r.h - pad * 2),
  }
}
