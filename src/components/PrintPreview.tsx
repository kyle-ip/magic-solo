import {
  cardRectMm,
  cutMarkLines,
  getPaperLayout,
  indicesOnPage,
  pageCount,
  type PaperSizeId,
} from '../print/cardPrintLayout'
import type { FetchedPrintImage } from '../print/fetchPrintImages'

type PrintPreviewProps = {
  paper: PaperSizeId
  images: FetchedPrintImage[]
  pageIndex: number
  pageLabel: string
}

type PrintPagerProps = {
  paper: PaperSizeId
  imageCount: number
  pageIndex: number
  onPageChange: (page: number) => void
  prevLabel: string
  nextLabel: string
  pageLabel: string
}

/**
 * Screen preview sheet using the same mm layout as the PDF export.
 */
export function PrintPreview({
  paper,
  images,
  pageIndex,
  pageLabel,
}: PrintPreviewProps) {
  const layout = getPaperLayout(paper)
  const pages = pageCount(images.length, paper)
  const safePage = Math.min(Math.max(0, pageIndex), Math.max(0, pages - 1))
  const idxs = indicesOnPage(safePage, images.length, paper)
  const marks = cutMarkLines(paper)
  const aspect = `${layout.pageW} / ${layout.pageH}`
  // Width-first sizing (definite dvh/px). Avoid height:100% — parent height is indefinite and collapses.
  const sheetStyle = {
    aspectRatio: aspect,
    width: `min(100%, 560px, calc(min(68dvh, 720px) * ${layout.pageW} / ${layout.pageH}))`,
    height: 'auto',
  }

  return (
    <div className="print-preview">
      <div
        className="print-preview-sheet"
        style={sheetStyle}
        role="img"
        aria-label={pageLabel}
      >
        {idxs.map((globalIndex) => {
          const rect = cardRectMm(globalIndex, paper)
          const img = images[globalIndex]!
          return (
            <img
              key={`${img.id}-${globalIndex}`}
              className="print-preview-card"
              src={img.objectUrl}
              alt={img.name}
              style={{
                left: `${(rect.x / layout.pageW) * 100}%`,
                top: `${(rect.y / layout.pageH) * 100}%`,
                width: `${(rect.w / layout.pageW) * 100}%`,
                height: `${(rect.h / layout.pageH) * 100}%`,
              }}
              draggable={false}
            />
          )
        })}
        <svg
          className="print-preview-marks"
          viewBox={`0 0 ${layout.pageW} ${layout.pageH}`}
          aria-hidden="true"
        >
          {marks.map((line, i) => (
            <line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(80,80,80,0.85)"
              strokeWidth={0.35}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

/** Page controls sit outside the preview stage so they are never clipped. */
export function PrintPager({
  paper,
  imageCount,
  pageIndex,
  onPageChange,
  prevLabel,
  nextLabel,
  pageLabel,
}: PrintPagerProps) {
  const pages = pageCount(imageCount, paper)
  if (pages <= 1) return null
  const safePage = Math.min(Math.max(0, pageIndex), pages - 1)

  return (
    <div className="print-preview-pager" role="navigation" aria-label={pageLabel}>
      <button
        type="button"
        className="btn ghost"
        disabled={safePage <= 0}
        onClick={() => onPageChange(safePage - 1)}
      >
        {prevLabel}
      </button>
      <span>{pageLabel}</span>
      <button
        type="button"
        className="btn ghost"
        disabled={safePage >= pages - 1}
        onClick={() => onPageChange(safePage + 1)}
      >
        {nextLabel}
      </button>
    </div>
  )
}
