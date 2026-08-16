/**
 * Challenge arena sizing helpers.
 * Board card height stays at the design ideal (× density); chrome scales separately.
 * Vertical fit / midline budget is retired — short viewports pan the board instead.
 */

/** Ideal board card height at ui-scale 1 before density (matches hand-full). */
export const BF_CARD_IDEAL_BASE_PX = 222

export function chromeScaleFromUiScale(uiScale: number): number {
  return 0.78 + 0.22 * uiScale
}

export function idealBoardCardHeight(uiScale: number, density: number): number {
  return BF_CARD_IDEAL_BASE_PX * uiScale * density
}

/** Chrome scale must not rewrite board card height (pan handles short viewports). */
export function boardCardHeightIndependentOfChrome(
  uiScale: number,
  density: number,
  _chromeScale: number,
): number {
  return idealBoardCardHeight(uiScale, density)
}
