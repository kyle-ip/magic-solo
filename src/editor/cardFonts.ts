/**
 * Card-face typography. Libre Baskerville ≈ Matrix/Plantin spirit;
 * Noto Serif SC for Chinese; loaded via Google Fonts in index.html.
 */

export const CARD_NAME_FONT =
  '"Libre Baskerville", "Noto Serif SC", "Times New Roman", "Songti SC", serif'

export const CARD_TYPE_FONT =
  '"Libre Baskerville", "Noto Serif SC", "Times New Roman", "Songti SC", serif'

export const CARD_BODY_FONT =
  '"Source Serif 4", "Noto Serif SC", "Libre Baskerville", "Times New Roman", serif'

export const CARD_FOOTER_FONT =
  '"Source Serif 4", "Noto Sans SC", "Segoe UI", sans-serif'

export const CARD_PT_FONT =
  '"Libre Baskerville", "Noto Serif SC", "Times New Roman", serif'

/** Ensure web fonts are ready before measuring / painting canvas text. */
export async function ensureCardFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.load) return
  try {
    await Promise.all([
      document.fonts.load(`700 32px ${CARD_NAME_FONT}`),
      document.fonts.load(`700 22px ${CARD_TYPE_FONT}`),
      document.fonts.load(`400 24px ${CARD_BODY_FONT}`),
      document.fonts.load(`700 28px ${CARD_PT_FONT}`),
      document.fonts.load(`400 11px ${CARD_FOOTER_FONT}`),
    ])
  } catch {
    // Fall back to system serifs if CDN fonts fail.
  }
}
