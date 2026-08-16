/** Place floating card preview near the pointer, flipped when near edges. */
export function clampPreviewPosition(
  clientX: number,
  clientY: number,
  paneW = 340,
  paneH = 520,
): { x: number; y: number } {
  const pad = 10
  const gap = 16
  let x = clientX + gap
  let y = clientY + gap
  const maxX = Math.max(pad, window.innerWidth - paneW - pad)
  const maxY = Math.max(pad, window.innerHeight - paneH - pad)
  if (x > maxX) x = clientX - paneW - gap
  if (y > maxY) y = clientY - paneH - gap
  return {
    x: Math.min(maxX, Math.max(pad, x)),
    y: Math.min(maxY, Math.max(pad, y)),
  }
}
