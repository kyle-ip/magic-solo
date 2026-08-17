import { PDFDocument, rgb } from 'pdf-lib'
import {
  cardBleedRectMm,
  cardRectMm,
  cutGuideLines,
  emptySlotIndicesOnPage,
  indicesOnPage,
  mmToPoints,
  pageCount,
  type PrintLayout,
} from './cardPrintLayout'
import type { FetchedPrintImage } from './fetchPrintImages'

export type BuildPdfOptions = {
  layout: PrintLayout
  /** Expand image beyond cut edge (mm). Cut guides stay on nominal card edge. */
  bleedMm?: number
  /** Draw empty outlines for unused slots on each page (default true). */
  fillEmpty?: boolean
  /** Draw continuous cut guides (default true). */
  showCutGuides?: boolean
}

async function embedImage(
  doc: PDFDocument,
  image: FetchedPrintImage,
) {
  const isPng =
    image.contentType.includes('png') ||
    (image.bytes[0] === 0x89 && image.bytes[1] === 0x50)
  if (isPng) {
    return doc.embedPng(image.bytes)
  }
  return doc.embedJpg(image.bytes)
}

/**
 * Build a print PDF from already-fetched card images (same order as preview).
 */
export async function buildCardPrintPdf(
  images: FetchedPrintImage[],
  options: BuildPdfOptions,
): Promise<Uint8Array> {
  if (images.length === 0) {
    throw new Error('No images to print')
  }

  const { layout } = options
  const bleedMm = Math.max(0, options.bleedMm ?? 0)
  const fillEmpty = options.fillEmpty !== false
  const showCutGuides = options.showCutGuides !== false
  const pageW = mmToPoints(layout.pageW)
  const pageH = mmToPoints(layout.pageH)
  const doc = await PDFDocument.create()
  const pages = pageCount(images.length, layout)
  const marks = showCutGuides ? cutGuideLines(layout) : []
  const markColor = rgb(0.72, 0.72, 0.72)
  const markWidth = 0.4
  const markDash = [mmToPoints(2), mmToPoints(1.5)]
  const emptyStroke = rgb(0.72, 0.72, 0.72)

  // Cache embeds by object URL / shared bytes identity
  const embedCache = new Map<string, Awaited<ReturnType<typeof embedImage>>>()

  for (let p = 0; p < pages; p++) {
    const page = doc.addPage([pageW, pageH])
    const idxs = indicesOnPage(p, images.length, layout)

    for (const globalIndex of idxs) {
      const image = images[globalIndex]!
      const cacheKey = image.objectUrl || image.id
      let embedded = embedCache.get(cacheKey)
      if (!embedded) {
        embedded = await embedImage(doc, image)
        embedCache.set(cacheKey, embedded)
      }
      const rect = cardBleedRectMm(globalIndex, layout, bleedMm)
      const x = mmToPoints(rect.x)
      const y = pageH - mmToPoints(rect.y + rect.h)
      const w = mmToPoints(rect.w)
      const h = mmToPoints(rect.h)
      page.drawImage(embedded, { x, y, width: w, height: h })
    }

    if (fillEmpty) {
      for (const emptyIndex of emptySlotIndicesOnPage(
        p,
        images.length,
        layout,
      )) {
        const rect = cardRectMm(emptyIndex, layout)
        page.drawRectangle({
          x: mmToPoints(rect.x),
          y: pageH - mmToPoints(rect.y + rect.h),
          width: mmToPoints(rect.w),
          height: mmToPoints(rect.h),
          borderColor: emptyStroke,
          borderWidth: 0.35,
        })
      }
    }

    for (const line of marks) {
      page.drawLine({
        start: {
          x: mmToPoints(line.x1),
          y: pageH - mmToPoints(line.y1),
        },
        end: {
          x: mmToPoints(line.x2),
          y: pageH - mmToPoints(line.y2),
        },
        thickness: markWidth,
        color: markColor,
        dashArray: markDash,
      })
    }
  }

  return doc.save()
}
