/** Place floating card preview near the pointer, flipped when near edges. */

export interface PreviewClampOptions {
  paneW?: number
  paneH?: number
  /** Reserved top chrome (topbar / safe area). */
  topClear?: number
  /** Reserved bottom chrome (hand dock / actions). */
  bottomClear?: number
  pad?: number
  gap?: number
}

function readCssLengthPx(varName: string, fallback: number): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  if (!raw) return fallback
  const probe = document.createElement('div')
  probe.style.cssText = `position:absolute;visibility:hidden;height:${raw}`
  document.body.appendChild(probe)
  const px = probe.getBoundingClientRect().height
  probe.remove()
  return px > 0 ? px : fallback
}

export function defaultPreviewBottomClear(): number {
  return Math.max(120, readCssLengthPx('--hand-dock-h', 160) + 12)
}

export function defaultPreviewTopClear(): number {
  return Math.max(56, readCssLengthPx('--safe-top', 0) + 48)
}

export function clampPreviewPosition(
  clientX: number,
  clientY: number,
  paneWOrOpts: number | PreviewClampOptions = 340,
  paneH = 520,
): { x: number; y: number } {
  const opts: PreviewClampOptions =
    typeof paneWOrOpts === 'number'
      ? { paneW: paneWOrOpts, paneH }
      : paneWOrOpts

  const paneW = opts.paneW ?? 340
  const resolvedH = opts.paneH ?? 520
  const pad = opts.pad ?? 10
  const gap = opts.gap ?? 16
  const topClear = opts.topClear ?? defaultPreviewTopClear()
  const bottomClear = opts.bottomClear ?? defaultPreviewBottomClear()

  const availH = Math.max(160, window.innerHeight - topClear - bottomClear - pad * 2)
  const effectiveH = Math.min(resolvedH, availH)

  let x = clientX + gap
  let y = clientY + gap
  const maxX = Math.max(pad, window.innerWidth - paneW - pad)
  const minY = topClear + pad
  const maxY = Math.max(minY, window.innerHeight - effectiveH - bottomClear - pad)

  if (x > maxX) x = clientX - paneW - gap
  if (y > maxY) y = clientY - effectiveH - gap

  return {
    x: Math.min(maxX, Math.max(pad, x)),
    y: Math.min(maxY, Math.max(minY, y)),
  }
}
