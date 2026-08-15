import type { FramePalette } from './framePalette'
import type { Rect } from './layoutM15'

/** Deterministic 0–1 noise for mottled frame texture. */
function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ar = (pa >> 16) & 255
  const ag = (pa >> 8) & 255
  const ab = pa & 255
  const br = (pb >> 16) & 255
  const bg = (pb >> 8) & 255
  const bb = pb & 255
  const r = Math.round(ar + (br - ar) * t)
  const g = Math.round(ag + (bg - ag) * t)
  const bl = Math.round(ab + (bb - ab) * t)
  return `rgb(${r},${g},${bl})`
}

/**
 * Fill a clipped region with organic marble/vein mottling (modern frame look).
 * Uses a coarse pixel grid for speed; looks good at card scale.
 */
export function fillMottledPlate(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  palette: FramePalette,
  cell = 3,
): void {
  const { x, y, w, h } = area
  for (let py = y; py < y + h; py += cell) {
    for (let px = x; px < x + w; px += cell) {
      const n1 = hash2(px * 0.08, py * 0.08)
      const n2 = hash2(px * 0.02 + 9, py * 0.03 + 4)
      const vein = Math.abs(Math.sin((px + py * 0.7) * 0.035 + n2 * 6))
      let t = n1 * 0.55 + vein * 0.45
      t = Math.min(1, Math.max(0, (t - 0.2) / 0.7))
      const mid = lerpHex(palette.plateDark, palette.plate, 0.55)
      const color =
        t < 0.5
          ? lerpHex(palette.plateDark, mid, t * 2)
          : lerpHex(mid, palette.plateLight, (t - 0.5) * 2)
      ctx.fillStyle = color
      ctx.fillRect(px, py, cell, cell)
    }
  }
}

/** Soft parchment grain inside text boxes. */
export function fillParchment(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  base: string,
  cell = 4,
): void {
  ctx.fillStyle = base
  ctx.fillRect(area.x, area.y, area.w, area.h)
  for (let py = area.y; py < area.y + area.h; py += cell) {
    for (let px = area.x; px < area.x + area.w; px += cell) {
      const n = hash2(px * 0.17, py * 0.19)
      if (n > 0.62) {
        ctx.fillStyle = `rgba(80,70,50,${0.02 + n * 0.035})`
        ctx.fillRect(px, py, cell, cell)
      } else if (n < 0.18) {
        ctx.fillStyle = `rgba(255,255,245,${0.03 + (0.18 - n) * 0.08})`
        ctx.fillRect(px, py, cell, cell)
      }
    }
  }
}

/** Inset bevel around a rectangular window (art / text). */
export function strokeInsetBevel(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  dark: string,
  light: string,
): void {
  const { x, y, w, h } = area
  ctx.lineWidth = 2
  ctx.strokeStyle = dark
  ctx.beginPath()
  ctx.moveTo(x + 0.5, y + h - 0.5)
  ctx.lineTo(x + 0.5, y + 0.5)
  ctx.lineTo(x + w - 0.5, y + 0.5)
  ctx.stroke()
  ctx.strokeStyle = light
  ctx.beginPath()
  ctx.moveTo(x + w - 0.5, y + 0.5)
  ctx.lineTo(x + w - 0.5, y + h - 0.5)
  ctx.lineTo(x + 0.5, y + h - 0.5)
  ctx.stroke()
  // Outer hairline
  ctx.strokeStyle = 'rgba(0,0,0,0.45)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
}

/** Raised metallic PT box. */
export function fillPtPlate(
  ctx: CanvasRenderingContext2D,
  area: Rect,
  palette: FramePalette,
  radius = 10,
): void {
  const { x, y, w, h } = area
  const r = Math.min(radius, w / 2, h / 2)
  const path = () => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  // Drop shadow
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2
  path()
  ctx.fillStyle = palette.ptDark
  ctx.fill()
  ctx.restore()

  const grad = ctx.createLinearGradient(x, y, x, y + h)
  grad.addColorStop(0, palette.ptLight)
  grad.addColorStop(0.45, palette.ptMid)
  grad.addColorStop(1, palette.ptDark)
  path()
  ctx.fillStyle = grad
  ctx.fill()

  // Inner highlight
  ctx.save()
  path()
  ctx.clip()
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 2
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4)
  ctx.restore()

  ctx.strokeStyle = 'rgba(0,0,0,0.55)'
  ctx.lineWidth = 1.5
  path()
  ctx.stroke()
}
