import { loadManaSymbol, normalizeManaCode } from '../utils/manaSymbols'
import {
  CARD_BODY_FONT,
  CARD_FOOTER_FONT,
  CARD_NAME_FONT,
  CARD_PT_FONT,
  CARD_TYPE_FONT,
  ensureCardFonts,
} from './cardFonts'
import {
  displayName,
  displayOracle,
  displayTypeLine,
} from './defaults'
import { getFramePalette, rarityStampColor } from './framePalette'
import {
  fillMottledPlate,
  fillParchment,
  fillPtPlate,
  strokeInsetBevel,
} from './frameTexture'
import { CARD_CORNER_R, CARD_H, CARD_W, M15, type Rect } from './layoutM15'
import { layoutOracleText } from './oracleLayout'
import type { EditorCardDocument } from './types'

const imageCache = new Map<string, HTMLImageElement | Promise<HTMLImageElement>>()

function loadImage(url: string): Promise<HTMLImageElement> {
  if (!url) return Promise.reject(new Error('empty image url'))
  const hit = imageCache.get(url)
  if (hit instanceof HTMLImageElement) return Promise.resolve(hit)
  if (hit) return hit

  const task = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    if (!url.startsWith('blob:') && !url.startsWith('data:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => {
      imageCache.set(url, img)
      resolve(img)
    }
    img.onerror = () => {
      imageCache.delete(url)
      reject(new Error(`failed to load image: ${url}`))
    }
    img.src = url
  })
  imageCache.set(url, task)
  return task
}

async function loadSymbolImage(code: string): Promise<HTMLImageElement | null> {
  try {
    const url = await loadManaSymbol(code)
    return await loadImage(url)
  } catch {
    return null
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function parseManaSymbols(cost: string): string[] {
  const out: string[] = []
  for (const m of cost.matchAll(/\{([^}]+)\}/g)) {
    out.push(m[1])
  }
  return out
}

function fitName(
  ctx: CanvasRenderingContext2D,
  name: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  fontFamily: string,
  weight = '700',
): number {
  for (let size = maxSize; size >= minSize; size -= 1) {
    ctx.font = `${weight} ${size}px ${fontFamily}`
    if (ctx.measureText(name).width <= maxWidth) return size
  }
  return minSize
}

function drawCoverArt(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  box: Rect,
  crop: EditorCardDocument['artCrop'],
) {
  const zoom = Math.max(0.5, Math.min(4, crop.zoom || 1))
  const coverScale = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight)
  const scale = coverScale * zoom
  const drawW = img.naturalWidth * scale
  const drawH = img.naturalHeight * scale
  const cx = box.x + box.w * Math.min(1, Math.max(0, crop.x))
  const cy = box.y + box.h * Math.min(1, Math.max(0, crop.y))
  const dx = cx - drawW / 2
  const dy = cy - drawH / 2

  ctx.save()
  ctx.beginPath()
  ctx.rect(box.x, box.y, box.w, box.h)
  ctx.clip()
  ctx.drawImage(img, dx, dy, drawW, drawH)
  ctx.restore()
}

function showPt(doc: EditorCardDocument): boolean {
  return doc.power != null && doc.toughness != null
}

/** Thin divider lines under name / type like modern frames. */
function strokeFrameRails(
  ctx: CanvasRenderingContext2D,
  y: number,
  x: number,
  w: number,
  ink: string,
) {
  ctx.strokeStyle = ink
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, y + 0.5)
  ctx.lineTo(x + w, y + 0.5)
  ctx.stroke()
  ctx.globalAlpha = 1
}

export interface RenderCardOptions {
  /** Device / export scale (1 = 745×1040). */
  scale?: number
  /** Return true to abandon an in-flight paint (preview debounce). */
  isCancelled?: () => boolean
}

/**
 * Paint an editor document onto an existing canvas (sized to CARD_W×CARD_H * scale).
 */
export async function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  doc: EditorCardDocument,
  opts: RenderCardOptions = {},
): Promise<void> {
  await ensureCardFonts()

  const scale = opts.scale ?? 1
  const cancelled = () => opts.isCancelled?.() === true
  const w = Math.round(CARD_W * scale)
  const h = Math.round(CARD_H * scale)
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')

  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, CARD_W, CARD_H)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const palette = getFramePalette(doc.frame, doc.manaCost, doc.typeLine)

  // Outer black border
  ctx.fillStyle = palette.border
  roundRectPath(ctx, 0, 0, CARD_W, CARD_H, CARD_CORNER_R)
  ctx.fill()

  ctx.save()
  roundRectPath(ctx, 0, 0, CARD_W, CARD_H, CARD_CORNER_R)
  ctx.clip()

  // Mottled colored plate (modern frame)
  const inner: Rect = {
    x: M15.border,
    y: M15.border,
    w: CARD_W - M15.border * 2,
    h: CARD_H - M15.border * 2,
  }
  ctx.save()
  roundRectPath(ctx, inner.x, inner.y, inner.w, inner.h, CARD_CORNER_R - 12)
  ctx.clip()
  fillMottledPlate(ctx, inner, palette, 3)
  ctx.restore()

  // Soft top vignette so name area reads clearer
  const vignette = ctx.createLinearGradient(0, M15.titleBar.y, 0, M15.titleBar.y + 70)
  vignette.addColorStop(0, 'rgba(0,0,0,0.12)')
  vignette.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = vignette
  ctx.fillRect(inner.x, inner.y, inner.w, 80)

  const textBox = showPt(doc)
    ? { ...M15.textBox, h: M15.textBox.h - 40 }
    : M15.textBox

  // Art window
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(M15.art.x, M15.art.y, M15.art.w, M15.art.h)
  if (doc.artUrl) {
    try {
      const art = await loadImage(doc.artUrl)
      if (cancelled()) {
        ctx.restore()
        return
      }
      drawCoverArt(ctx, art, M15.art, doc.artCrop)
    } catch {
      // placeholder
    }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.font = `italic 22px ${CARD_BODY_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Art', M15.art.x + M15.art.w / 2, M15.art.y + M15.art.h / 2)
    ctx.textAlign = 'left'
  }
  strokeInsetBevel(ctx, M15.art, palette.bevelDark, palette.bevelLight)

  // Text box parchment
  fillParchment(ctx, textBox, palette.textBox, 3)
  strokeInsetBevel(ctx, textBox, palette.bevelDark, palette.bevelLight)

  // Name + mana on the frame (8ED modern style)
  const name = displayName(doc)
  const manaCodes = parseManaSymbols(doc.manaCost)
  const symbolSize = 34
  const manaGap = 3
  const manaWidth =
    manaCodes.length > 0
      ? manaCodes.length * symbolSize + (manaCodes.length - 1) * manaGap
      : 0
  const nameMaxW = M15.titleBar.w - 20 - manaWidth - (manaWidth ? 14 : 0)
  const nameSize = fitName(ctx, name, nameMaxW, 34, 15, CARD_NAME_FONT, '700')

  // Subtle name shadow for legibility on mottled plate
  const nameX = M15.titleBar.x + 8
  const nameY = M15.titleBar.y + M15.titleBar.h / 2
  ctx.font = `700 ${nameSize}px ${CARD_NAME_FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillText(name, nameX + 0.8, nameY + 0.8)
  ctx.fillStyle = palette.nameInk
  ctx.fillText(name, nameX, nameY)

  let manaX = M15.titleBar.x + M15.titleBar.w - 6 - manaWidth
  const manaY = M15.titleBar.y + (M15.titleBar.h - symbolSize) / 2
  for (const code of manaCodes) {
    const img = await loadSymbolImage(code)
    if (cancelled()) {
      ctx.restore()
      return
    }
    // Soft drop under pip
    ctx.beginPath()
    ctx.arc(
      manaX + symbolSize / 2 + 1,
      manaY + symbolSize / 2 + 1.5,
      symbolSize / 2,
      0,
      Math.PI * 2,
    )
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fill()
    if (img) {
      ctx.drawImage(img, manaX, manaY, symbolSize, symbolSize)
    } else {
      ctx.fillStyle = '#c8c8c8'
      ctx.beginPath()
      ctx.arc(
        manaX + symbolSize / 2,
        manaY + symbolSize / 2,
        symbolSize / 2,
        0,
        Math.PI * 2,
      )
      ctx.fill()
      ctx.fillStyle = '#111'
      ctx.font = `700 ${symbolSize * 0.42}px ${CARD_NAME_FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        normalizeManaCode(code).slice(0, 2),
        manaX + symbolSize / 2,
        manaY + symbolSize / 2 + 1,
      )
      ctx.textAlign = 'left'
    }
    manaX += symbolSize + manaGap
  }

  strokeFrameRails(
    ctx,
    M15.titleBar.y + M15.titleBar.h - 2,
    M15.art.x,
    M15.art.w,
    palette.nameInk,
  )

  // Type line on frame
  const typeLine = displayTypeLine(doc)
  const typeMaxW = M15.typeBar.w - 52
  const typeSize = fitName(ctx, typeLine, typeMaxW, 23, 12, CARD_TYPE_FONT, '700')
  const typeY = M15.typeBar.y + M15.typeBar.h / 2
  ctx.font = `700 ${typeSize}px ${CARD_TYPE_FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  ctx.fillText(typeLine, M15.typeBar.x + 8 + 0.6, typeY + 0.6)
  ctx.fillStyle = palette.nameInk
  ctx.fillText(typeLine, M15.typeBar.x + 8, typeY)

  // Rarity set-symbol stand-in (metallic diamond)
  const stamp = M15.rarityStamp
  const stampGrad = ctx.createLinearGradient(
    stamp.x,
    stamp.y,
    stamp.x + stamp.w,
    stamp.y + stamp.h,
  )
  const rare = rarityStampColor(doc.rarity)
  stampGrad.addColorStop(0, '#fff8e0')
  stampGrad.addColorStop(0.45, rare)
  stampGrad.addColorStop(1, '#3a2a10')
  ctx.fillStyle = stampGrad
  ctx.beginPath()
  ctx.moveTo(stamp.x + stamp.w / 2, stamp.y)
  ctx.lineTo(stamp.x + stamp.w, stamp.y + stamp.h / 2)
  ctx.lineTo(stamp.x + stamp.w / 2, stamp.y + stamp.h)
  ctx.lineTo(stamp.x, stamp.y + stamp.h / 2)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.65)'
  ctx.lineWidth = 1.25
  ctx.stroke()

  strokeFrameRails(
    ctx,
    M15.typeBar.y + 1,
    M15.art.x,
    M15.art.w,
    palette.nameInk,
  )

  // Oracle text
  const oracle = displayOracle(doc)
  const padX = 18
  const padY = 16
  const layout = layoutOracleText(
    ctx,
    oracle,
    textBox.w - padX * 2,
    textBox.h - padY * 2,
    { maxFont: 24, minFont: 11, fontFamily: CARD_BODY_FONT },
  )
  let ty = textBox.y + padY + layout.fontSize * 0.9
  ctx.fillStyle = palette.textInk
  ctx.textBaseline = 'alphabetic'
  for (const line of layout.lines) {
    let tx = textBox.x + padX
    for (const part of line.tokens) {
      if (part.kind === 'text') {
        ctx.font = `400 ${layout.fontSize}px ${CARD_BODY_FONT}`
        ctx.fillText(part.value, tx, ty)
        tx += part.width
      } else {
        const symSize = layout.fontSize * 0.92
        const img = await loadSymbolImage(part.code)
        if (cancelled()) {
          ctx.restore()
          return
        }
        const sy = ty - symSize * 0.82
        if (img) {
          ctx.drawImage(img, tx, sy, symSize, symSize)
        } else {
          ctx.fillStyle = '#555'
          ctx.beginPath()
          ctx.arc(tx + symSize / 2, sy + symSize / 2, symSize / 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = palette.textInk
        }
        tx += part.width + 2
      }
    }
    ty += layout.lineHeight
  }

  // P/T metallic plate
  if (showPt(doc)) {
    fillPtPlate(ctx, M15.ptBox, palette, 9)
    const pt = `${doc.power}/${doc.toughness}`
    ctx.fillStyle = palette.ptInk
    ctx.font = `700 30px ${CARD_PT_FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      pt,
      M15.ptBox.x + M15.ptBox.w / 2,
      M15.ptBox.y + M15.ptBox.h / 2 + 1,
    )
    ctx.textAlign = 'left'
  }

  // Footer on frame (dark ink like printed modern cards)
  const artist = doc.artist ? doc.artist : ''
  const legal = [
    doc.setCode ? doc.setCode.toUpperCase() : '',
    doc.collectorNumber,
  ]
    .filter(Boolean)
    .join(' · ')
  ctx.fillStyle = palette.footerInk
  ctx.textBaseline = 'top'
  if (artist) {
    // Tiny paintbrush mark (modern-frame collector style)
    const bx = M15.footer.x
    const by = M15.footer.y + 2
    ctx.fillStyle = palette.footerInk
    ctx.beginPath()
    ctx.moveTo(bx, by + 8)
    ctx.lineTo(bx + 3, by + 2)
    ctx.lineTo(bx + 5, by + 3)
    ctx.lineTo(bx + 2, by + 9)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(bx + 4.5, by + 1, 5, 1.6)
    ctx.font = `400 11px ${CARD_FOOTER_FONT}`
    ctx.fillText(artist, bx + 12, M15.footer.y)
  }
  if (legal) {
    ctx.font = `400 10px ${CARD_FOOTER_FONT}`
    ctx.fillText(legal, M15.footer.x, M15.footer.y + (artist ? 16 : 0))
  }

  ctx.restore()
}

/** Export PNG blob at the given scale (1–5). */
export async function exportCardPng(
  doc: EditorCardDocument,
  scale = 2,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  await renderCardToCanvas(canvas, doc, { scale })
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('PNG export failed'))
      },
      'image/png',
    )
  })
}

export function revokeCachedEditorImage(url: string): void {
  imageCache.delete(url)
}
