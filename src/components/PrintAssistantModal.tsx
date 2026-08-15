import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { buildCardPrintPdf } from '../print/buildCardPrintPdf'
import {
  getPaperLayout,
  pageCount,
  type PaperSizeId,
} from '../print/cardPrintLayout'
import { downloadBlob, printFilename } from '../print/downloadBlob'
import {
  fetchPrintImages,
  revokePrintImages,
  type FetchedPrintImage,
} from '../print/fetchPrintImages'
import type { PrintCardItem } from '../print/printCards'
import { PackHeadIconButton } from './PackHeadIconButton'
import { PrintPreview } from './PrintPreview'
import '../styles/pack.css'
import '../styles/print.css'

type Phase = 'resolving' | 'loading' | 'ready' | 'exporting' | 'error'

type PrintAssistantModalProps = {
  open: boolean
  onClose: () => void
  cards: PrintCardItem[]
  /** Used in downloaded filename, e.g. collection / mkm / tdag */
  sourceSlug: string
  /**
   * Optional async provider when cards are not ready yet (e.g. fetch all set cards).
   * When set, runs on open before image fetch.
   */
  resolveCards?: (signal: AbortSignal) => Promise<PrintCardItem[]>
}

function initialPhase(hasResolver: boolean): Phase {
  return hasResolver ? 'resolving' : 'loading'
}

export function PrintAssistantModal({
  open,
  onClose,
  cards: cardsProp,
  sourceSlug,
  resolveCards,
}: PrintAssistantModalProps) {
  const { t } = useTranslation()
  const [paper, setPaper] = useState<PaperSizeId>('a4')
  const [phase, setPhase] = useState<Phase>(() =>
    initialPhase(Boolean(resolveCards)),
  )
  const [items, setItems] = useState<PrintCardItem[]>(cardsProp)
  const [images, setImages] = useState<FetchedPrintImage[]>([])
  const [failed, setFailed] = useState<string[]>([])
  const [progressDone, setProgressDone] = useState(0)
  const [progressTotal, setProgressTotal] = useState(
    () => cardsProp.length,
  )
  const [pageIndex, setPageIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const imagesRef = useRef<FetchedPrintImage[]>([])

  // Reset on the same render as open→true so we never paint stale preview first.
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setSession((n) => n + 1)
      setPaper('a4')
      setPhase(initialPhase(Boolean(resolveCards)))
      setItems(cardsProp)
      setImages([])
      setFailed([])
      setError(null)
      setPageIndex(0)
      setProgressDone(0)
      setProgressTotal(cardsProp.length)
    }
  }

  const pages = useMemo(
    () => pageCount(images.length, paper),
    [images.length, paper],
  )

  const paperLayout = getPaperLayout(paper)
  const paperAspect = `${paperLayout.pageW} / ${paperLayout.pageH}`

  useEffect(() => {
    if (!open || session === 0) return

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    revokePrintImages(imagesRef.current)
    imagesRef.current = []

    void (async () => {
      try {
        let list = cardsProp
        if (resolveCards) {
          list = await resolveCards(ac.signal)
        }
        if (ac.signal.aborted) return
        setItems(list)
        if (list.length === 0) {
          setPhase('error')
          setError(t('printAssistant.empty'))
          return
        }
        setPhase('loading')
        setProgressDone(0)
        setProgressTotal(list.length)
        const { images: fetched, failed: failNames } = await fetchPrintImages(
          list,
          {
            signal: ac.signal,
            onProgress: (p) => {
              setProgressDone(p.done)
              setProgressTotal(p.total)
            },
          },
        )
        if (ac.signal.aborted) {
          revokePrintImages(fetched)
          return
        }
        if (fetched.length === 0) {
          setPhase('error')
          setFailed(failNames)
          setError(t('printAssistant.allFailed'))
          return
        }
        imagesRef.current = fetched
        setImages(fetched)
        setFailed(failNames)
        setPhase('ready')
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setPhase('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    })()

    return () => {
      ac.abort()
      revokePrintImages(imagesRef.current)
      imagesRef.current = []
    }
    // session bumps once per open; cards/resolver captured for that open
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open session
  }, [open, session])

  useEffect(() => {
    setPageIndex(0)
  }, [paper])

  if (!open) return null

  const onExport = async () => {
    if (images.length === 0 || phase === 'exporting') return
    setPhase('exporting')
    setError(null)
    try {
      const bytes = await buildCardPrintPdf(images, paper)
      downloadBlob(bytes, printFilename(sourceSlug, paper))
      setPhase('ready')
    } catch (err) {
      setPhase('ready')
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const close = () => {
    if (phase === 'resolving' || phase === 'loading' || phase === 'exporting') {
      abortRef.current?.abort()
    }
    onClose()
  }

  const progressPct =
    progressTotal > 0
      ? Math.round((progressDone / progressTotal) * 100)
      : 0
  const showPreview = phase === 'ready' || phase === 'exporting'
  const cardN = images.length || items.length

  return createPortal(
    <div
      className="print-assistant-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        className="print-assistant-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-assistant-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="print-assistant-head">
          <h2 id="print-assistant-title">{t('printAssistant.title')}</h2>
          <div className="print-assistant-head-actions">
            <PackHeadIconButton
              icon="close"
              label={t('printAssistant.close')}
              onClick={close}
            />
          </div>
        </header>
        <p className="print-assistant-lead">{t('printAssistant.lead')}</p>

        <div
          className="print-assistant-paper"
          role="group"
          aria-label={t('printAssistant.paper')}
        >
          <span>{t('printAssistant.paper')}</span>
          <button
            type="button"
            className={`btn ghost${paper === 'a4' ? ' is-active' : ''}`}
            onClick={() => setPaper('a4')}
            disabled={phase === 'exporting'}
          >
            {t('printAssistant.paperA4')}
          </button>
          <button
            type="button"
            className={`btn ghost${paper === 'photo6' ? ' is-active' : ''}`}
            onClick={() => setPaper('photo6')}
            disabled={phase === 'exporting'}
          >
            {t('printAssistant.paperPhoto6')}
          </button>
        </div>

        <div className="print-assistant-meta">
          <span>{t('printAssistant.cardCount', { n: cardN })}</span>
          <span>
            {t('printAssistant.pageCount', {
              n: pageCount(cardN, paper),
            })}
          </span>
        </div>

        <div className="print-assistant-stage">
          {showPreview ? (
            <div className="print-assistant-stage-ready">
              <PrintPreview
                paper={paper}
                images={images}
                pageIndex={pageIndex}
                onPageChange={setPageIndex}
                prevLabel={t('printAssistant.prevPage')}
                nextLabel={t('printAssistant.nextPage')}
                pageLabel={t('printAssistant.pageOf', {
                  current: Math.min(pageIndex + 1, Math.max(pages, 1)),
                  total: Math.max(pages, 1),
                })}
              />
            </div>
          ) : (
            <div className="print-assistant-stage-loading" role="status">
              <div
                className="print-preview-sheet print-preview-sheet--placeholder"
                style={{ aspectRatio: paperAspect }}
                aria-hidden="true"
              />
              <div className="print-assistant-progress print-assistant-progress--overlay">
                {phase === 'resolving' ? (
                  <p>{t('printAssistant.fetchingSet')}</p>
                ) : phase === 'error' ? null : (
                  <>
                    <p>
                      {t('printAssistant.loading', {
                        done: progressDone,
                        total: progressTotal || items.length || '…',
                      })}
                    </p>
                    <div className="print-assistant-progress-bar">
                      <span style={{ width: `${progressPct}%` }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {failed.length > 0 && phase === 'ready' ? (
          <p className="print-assistant-warn" role="status">
            {t('printAssistant.partialFail', { n: failed.length })}
          </p>
        ) : null}

        {error ? (
          <p className="print-assistant-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="print-assistant-actions">
          <button
            type="button"
            className="btn primary"
            disabled={phase !== 'ready' || images.length === 0}
            onClick={() => void onExport()}
          >
            {phase === 'exporting'
              ? t('printAssistant.exporting')
              : t('printAssistant.export')}
          </button>
          <button type="button" className="btn ghost" onClick={close}>
            {t('printAssistant.cancel')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
