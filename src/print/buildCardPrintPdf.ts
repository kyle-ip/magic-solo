import { PDFDocument, rgb } from 'pdf-lib'
import {
  cardRectMm,
  cutMarkLines,
  getPaperLayout,
  indicesOnPage,
  mmToPoints,
  pageCount,
  type PaperSizeId,
  type PrintLayoutOptions,
} from './cardPrintLayout'
import type { FetchedPrintImage } from './fetchPrintImages'

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
  paper: PaperSizeId,
  options: PrintLayoutOptions = {},
): Promise<Uint8Array> {
  if (images.length === 0) {
    throw new Error('No images to print')
  }

  const layout = getPaperLayout(paper, options)
  const pageW = mmToPoints(layout.pageW)
  const pageH = mmToPoints(layout.pageH)
  const doc = await PDFDocument.create()
  const pages = pageCount(images.length, paper)
  const marks = cutMarkLines(paper, options)
  const markColor = rgb(0.55, 0.55, 0.55)
  const markWidth = 0.4

  for (let p = 0; p < pages; p++) {
    const page = doc.addPage([pageW, pageH])
    const idxs = indicesOnPage(p, images.length, paper)

    for (const globalIndex of idxs) {
      const image = images[globalIndex]!
      const rect = cardRectMm(globalIndex, paper, options)
      const embedded = await embedImage(doc, image)
      // PDF y origin is bottom-left; layout y is top-left
      const x = mmToPoints(rect.x)
      const y = pageH - mmToPoints(rect.y + rect.h)
      const w = mmToPoints(rect.w)
      const h = mmToPoints(rect.h)
      page.drawImage(embedded, { x, y, width: w, height: h })
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
      })
    }
  }

  return doc.save()
}
