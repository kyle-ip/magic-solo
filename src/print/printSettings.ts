/**
 * Persisted print-assistant layout preferences (not the card list).
 */

import type { PaperSizeId } from './cardPrintLayout'
import {
  CARD_H_MM,
  CARD_W_MM,
  DEFAULT_GAP_MM,
  DEFAULT_PAGE_MARGIN_MM,
} from './cardPrintLayout'

export const PRINT_SETTINGS_KEY = 'magic-solo-print-settings-v3'

export type PrintAssistantSettings = {
  paper: PaperSizeId
  /** Cut-mark card width (mm). Default 63. */
  cardW: number
  /** Cut-mark card height (mm). Default 88. */
  cardH: number
  pageMargin: number
  gap: number
  bleedMm: number
  fillEmpty: boolean
  flushCut: boolean
}

/** Precise 63×88 cut marks + 1 mm bleed for trim tolerance. */
export const DEFAULT_PRINT_SETTINGS: PrintAssistantSettings = {
  paper: 'a4',
  cardW: CARD_W_MM,
  cardH: CARD_H_MM,
  pageMargin: DEFAULT_PAGE_MARGIN_MM,
  gap: DEFAULT_GAP_MM,
  bleedMm: 1,
  fillEmpty: true,
  flushCut: false,
}

const PAPERS: PaperSizeId[] = ['a4', 'a3', 'b4', 'letter', 'photo6']

function clampNum(n: unknown, min: number, max: number, fallback: number) {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(max, Math.max(min, v))
}

export function resolveCardMm(settings: PrintAssistantSettings): {
  w: number
  h: number
} {
  return {
    w: clampNum(settings.cardW, 1, 200, CARD_W_MM),
    h: clampNum(settings.cardH, 1, 200, CARD_H_MM),
  }
}

export function loadPrintSettings(): PrintAssistantSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_PRINT_SETTINGS }
  try {
    const raw = localStorage.getItem(PRINT_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_PRINT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<PrintAssistantSettings> & {
      customCardW?: number
      customCardH?: number
    }
    return {
      paper: PAPERS.includes(parsed.paper as PaperSizeId)
        ? (parsed.paper as PaperSizeId)
        : DEFAULT_PRINT_SETTINGS.paper,
      cardW: clampNum(
        parsed.cardW ?? parsed.customCardW,
        1,
        200,
        DEFAULT_PRINT_SETTINGS.cardW,
      ),
      cardH: clampNum(
        parsed.cardH ?? parsed.customCardH,
        1,
        200,
        DEFAULT_PRINT_SETTINGS.cardH,
      ),
      pageMargin: clampNum(parsed.pageMargin, 0, 50, DEFAULT_PAGE_MARGIN_MM),
      gap: clampNum(parsed.gap, 0, 20, DEFAULT_GAP_MM),
      bleedMm: clampNum(
        parsed.bleedMm,
        0,
        3,
        DEFAULT_PRINT_SETTINGS.bleedMm,
      ),
      fillEmpty: parsed.fillEmpty !== false,
      flushCut: Boolean(parsed.flushCut),
    }
  } catch {
    return { ...DEFAULT_PRINT_SETTINGS }
  }
}

export function savePrintSettings(settings: PrintAssistantSettings): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(PRINT_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* ignore quota / private mode */
  }
}
