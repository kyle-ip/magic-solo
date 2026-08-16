/**
 * Bake each print page to a bitmap blob URL once, so flipping pages is free.
 */

import { deferRevokeObjectUrls } from './deferRevoke'
import {
  cardBleedRectMm,
  cardRectMm,
  cardsPerPage,
  cutMarkLines,
  emptySlotIndicesOnPage,
  indicesOnPage,
  pageCount,
  type PrintLayout,
} from './cardPrintLayout'
import type { FetchedPrintImage } from './fetchPrintImages'

export type BakePreviewOptions = {
  layout: PrintLayout
  images: FetchedPrintImage[]
  bleedMm?: number
  fillEmpty?: boolean
  /** Target CSS width of the preview sheet (px). */
  cssWidth?: number
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0)
    })
  })
}

function loadHtmlImage(
  url: string,
  signal?: AbortSignal,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const img = new Image()
    const onAbort = () => {
      img.src = ''
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    img.onload = () => {
      signal?.removeEventListener('abort', onAbort)
      resolve(img)
    }
    img.onerror = () => {
      signal?.removeEventListener('abort', onAbort)
      reject(new Error('Image decode failed'))
    }
    img.decoding = 'async'
    img.src = url
  })
}

export function revokePreviewPageUrls(urls: string[]): void {
  deferRevokeObjectUrls(urls)
}

/**
 * Rasterize every page to a JPEG blob URL.
 * Callers must revoke returned URLs when done.
 */
export async function bakePrintPreviewPages(
  options: BakePreviewOptions,
): Promise<string[]> {
  const {
    layout,
    images,
    bleedMm = 0,
    fillEmpty = true,
    cssWidth = 560,
    signal,
    onProgress,
  } = options

  if (images.length === 0) return []

  const dpr =
    typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
  const pxW = Math.max(320, Math.round(cssWidth * dpr))
  const pxH = Math.max(1, Math.round((pxW * layout.pageH) / layout.pageW))
  const sx = pxW / layout.pageW
  const sy = pxH / layout.pageH
  const pages = pageCount(images.length, layout)
  const marks = cutMarkLines(layout)
  const per = Math.max(1, cardsPerPage(layout))

  onProgress?.(0, pages)

  const htmlImages: (HTMLImageElement | null)[] = new Array(images.length).fill(
    null,
  )
  const DECODE_BATCH = 4
  for (let i = 0; i < images.length; i += DECODE_BATCH) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const slice = images.slice(i, i + DECODE_BATCH)
    const loaded = await Promise.all(
      slice.map(async (item) => {
        try {
          return await loadHtmlImage(item.objectUrl, signal)
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') throw err
          return null
        }
      }),
    )
    for (let j = 0; j < loaded.length; j++) {
      htmlImages[i + j] = loaded[j]!
    }
    await yieldToMain()
  }

  const urls: string[] = []

  for (let p = 0; p < pages; p++) {
    if (signal?.aborted) {
      revokePreviewPageUrls(urls)
      throw new DOMException('Aborted', 'AbortError')
    }

    const canvas = document.createElement('canvas')
    canvas.width = pxW
    canvas.height = pxH
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) {
      revokePreviewPageUrls(urls)
      throw new Error('Canvas unavailable')
    }

    ctx.fillStyle = '#f4f1ea'
    ctx.fillRect(0, 0, pxW, pxH)

    const idxs = indicesOnPage(p, images.length, layout)
    for (const globalIndex of idxs) {
      const html = htmlImages[globalIndex]
      if (!html) continue
      const local = globalIndex % per
      const rect = cardBleedRectMm(local, layout, bleedMm)
      ctx.drawImage(
        html,
        rect.x * sx,
        rect.y * sy,
        rect.w * sx,
        rect.h * sy,
      )
    }

    if (fillEmpty) {
      ctx.strokeStyle = 'rgba(120,120,120,0.55)'
      ctx.lineWidth = Math.max(1, 0.35 * sx)
      for (const emptyIndex of emptySlotIndicesOnPage(
        p,
        images.length,
        layout,
      )) {
        const local = emptyIndex % per
        const r = cardRectMm(local, layout)
        ctx.strokeRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy)
      }
    }

    ctx.strokeStyle = 'rgba(80,80,80,0.85)'
    ctx.lineWidth = Math.max(1, 0.35 * sx)
    ctx.beginPath()
    for (const line of marks) {
      ctx.moveTo(line.x1 * sx, line.y1 * sy)
      ctx.lineTo(line.x2 * sx, line.y2 * sy)
    }
    ctx.stroke()

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82)
    })
    if (!blob) {
      revokePreviewPageUrls(urls)
      throw new Error('Preview bake failed')
    }
    urls.push(URL.createObjectURL(blob))
    onProgress?.(p + 1, pages)
    await yieldToMain()
  }

  return urls
}
