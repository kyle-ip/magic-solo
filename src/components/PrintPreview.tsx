import { memo, useEffect, useMemo, useState } from 'react'

type PrintPagerProps = {
  pageCount: number
  pageIndex: number
  onPageChange: (page: number) => void
  prevLabel: string
  nextLabel: string
  pageLabel: string
}

type PrintPreviewPanelProps = {
  /** Pre-baked page bitmap URLs (one JPEG/PNG per sheet). */
  pageUrls: string[]
  pageW: number
  pageH: number
  pending?: boolean
  building?: boolean
  buildDone?: number
  buildTotal?: number
  buildingLabel?: string
  prevLabel: string
  nextLabel: string
  formatPageOf: (current: number, total: number) => string
}

export const PrintPager = memo(function PrintPager({
  pageCount: pages,
  pageIndex,
  onPageChange,
  prevLabel,
  nextLabel,
  pageLabel,
}: PrintPagerProps) {
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
})

/**
 * Shows pre-baked page bitmaps. Flipping pages only swaps the visible image.
 */
export const PrintPreviewPanel = memo(function PrintPreviewPanel({
  pageUrls,
  pageW,
  pageH,
  pending = false,
  building = false,
  buildDone = 0,
  buildTotal = 0,
  buildingLabel,
  prevLabel,
  nextLabel,
  formatPageOf,
}: PrintPreviewPanelProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const pages = pageUrls.length

  useEffect(() => {
    setPageIndex(0)
  }, [pageUrls])

  useEffect(() => {
    const maxPage = Math.max(0, pages - 1)
    if (pageIndex > maxPage) setPageIndex(maxPage)
  }, [pages, pageIndex])

  const safePage = Math.min(Math.max(0, pageIndex), Math.max(0, pages - 1))
  const pageLabel = formatPageOf(
    Math.min(safePage + 1, Math.max(pages, 1)),
    Math.max(pages, 1),
  )

  const sheetStyle = useMemo(
    () => ({
      aspectRatio: `${pageW} / ${pageH}`,
      width: `min(100%, 560px, calc(min(68dvh, 720px) * ${pageW} / ${pageH}))`,
      height: 'auto' as const,
    }),
    [pageW, pageH],
  )

  const buildPct =
    buildTotal > 0 ? Math.round((buildDone / buildTotal) * 100) : 0

  return (
    <div className="print-preview-panel">
      <div
        className={`print-preview${pending ? ' is-pending' : ''}${building ? ' is-building' : ''}`}
      >
        <div
          className="print-preview-sheet print-preview-sheet--bitmap"
          style={sheetStyle}
          role="img"
          aria-label={pageLabel}
        >
          {pages > 0 && pageUrls[safePage] ? (
            <img
              className="print-preview-page-bitmap"
              src={pageUrls[safePage]}
              alt={pageLabel}
              draggable={false}
              decoding="sync"
            />
          ) : (
            <div
              className="print-preview-sheet--placeholder"
              aria-hidden="true"
            />
          )}
          {building ? (
            <div
              className="print-assistant-progress print-assistant-progress--overlay"
              role="status"
            >
              <p>
                {buildingLabel ||
                  `Building preview ${buildDone} / ${buildTotal}…`}
              </p>
              <div className="print-assistant-progress-bar">
                <span style={{ width: `${buildPct}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {!building ? (
        <PrintPager
          pageCount={pages}
          pageIndex={safePage}
          onPageChange={setPageIndex}
          prevLabel={prevLabel}
          nextLabel={nextLabel}
          pageLabel={pageLabel}
        />
      ) : null}
    </div>
  )
})
