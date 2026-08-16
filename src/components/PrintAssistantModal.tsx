import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { buildCardPrintPdf } from '../print/buildCardPrintPdf'
import {
  bakePrintPreviewPages,
} from '../print/bakePrintPreviewPages'
import {
  computeLayout,
  pageCount,
  type PaperSizeId,
  type PrintLayout,
} from '../print/cardPrintLayout'
import {
  deferRevokeObjectUrls,
  deferRevokePrintImageStore,
} from '../print/deferRevoke'
import { printFilename } from '../print/downloadBlob'
import {
  countPrintableSlots,
  fetchPrintImageStore,
  fetchPrintPreviewImageStore,
  materializePrintImages,
  type SharedPrintImage,
} from '../print/fetchPrintImages'
import {
  expandPrintList,
  type PrintListEntry,
} from '../print/printCards'
import {
  loadPrintSettings,
  resolveCardMm,
  savePrintSettings,
  type PrintAssistantSettings,
} from '../print/printSettings'
import { PackHeadIconButton } from './PackHeadIconButton'
import { PrintExportDialog } from './PrintExportDialog'
import { PrintPreviewPanel } from './PrintPreview'
import '../styles/pack.css'
import '../styles/print.css'

type Phase =
  | 'resolving'
  | 'loading'
  | 'building'
  | 'ready'
  | 'exporting'
  | 'error'

type PrintAssistantModalProps = {
  open: boolean
  onClose: () => void
  cards: PrintListEntry[]
  /** Used in downloaded filename, e.g. collection / mkm / tdag */
  sourceSlug: string
  /**
   * Optional async provider when cards are not ready yet (e.g. fetch all set cards).
   * When set, runs on open before image fetch.
   */
  resolveCards?: (signal: AbortSignal) => Promise<PrintListEntry[]>
}

type PrintListRowProps = {
  entry: PrintListEntry
  index: number
  total: number
  thumbUrl?: string
  qtyDownLabel: string
  qtyUpLabel: string
  quantityLabel: string
  moveUpLabel: string
  moveDownLabel: string
  removeLabel: string
  onQty: (id: string, quantity: number) => void
  onMove: (id: string, dir: -1 | 1) => void
  onRemove: (id: string) => void
}

const PrintListRow = memo(function PrintListRow({
  entry,
  index,
  total,
  thumbUrl,
  qtyDownLabel,
  qtyUpLabel,
  quantityLabel,
  moveUpLabel,
  moveDownLabel,
  removeLabel,
  onQty,
  onMove,
  onRemove,
}: PrintListRowProps) {
  return (
    <div className="print-assistant-list-row" role="listitem">
      {thumbUrl ? (
        <img
          className="print-assistant-list-thumb"
          src={thumbUrl}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ) : (
        <div
          className="print-assistant-list-thumb print-assistant-list-thumb--empty"
          aria-hidden
        />
      )}
      <div className="print-assistant-list-info">
        <span className="print-assistant-list-name">{entry.name}</span>
        <div className="print-assistant-list-qty">
          <button
            type="button"
            className="btn ghost"
            aria-label={qtyDownLabel}
            disabled={entry.quantity <= 0}
            onClick={() => onQty(entry.id, entry.quantity - 1)}
          >
            −
          </button>
          <input
            type="number"
            min={0}
            max={99}
            value={entry.quantity}
            aria-label={quantityLabel}
            onChange={(e) => onQty(entry.id, Number(e.target.value) || 0)}
          />
          <button
            type="button"
            className="btn ghost"
            aria-label={qtyUpLabel}
            onClick={() => onQty(entry.id, entry.quantity + 1)}
          >
            +
          </button>
        </div>
      </div>
      <div className="print-assistant-list-move">
        <button
          type="button"
          className="btn ghost"
          disabled={index === 0}
          aria-label={moveUpLabel}
          onClick={() => onMove(entry.id, -1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={index === total - 1}
          aria-label={moveDownLabel}
          onClick={() => onMove(entry.id, 1)}
        >
          ↓
        </button>
        <button
          type="button"
          className="btn ghost"
          aria-label={removeLabel}
          onClick={() => onRemove(entry.id)}
        >
          ×
        </button>
      </div>
    </div>
  )
})

function initialPhase(hasResolver: boolean): Phase {
  return hasResolver ? 'resolving' : 'loading'
}

function cloneEntries(list: PrintListEntry[]): PrintListEntry[] {
  return list.map((e) => ({ ...e }))
}

function settingsKey(s: PrintAssistantSettings): string {
  return [
    s.paper,
    s.cardW,
    s.cardH,
    s.pageMargin,
    s.gap,
    s.bleedMm,
    s.fillEmpty ? 1 : 0,
    s.flushCut ? 1 : 0,
  ].join('|')
}

function listKey(entries: PrintListEntry[]): string {
  return entries.map((e) => `${e.id}:${e.quantity}`).join(',')
}

export function PrintAssistantModal({
  open,
  onClose,
  cards: cardsProp,
  sourceSlug,
  resolveCards,
}: PrintAssistantModalProps) {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<PrintAssistantSettings>(() =>
    loadPrintSettings(),
  )
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>(() =>
    initialPhase(Boolean(resolveCards)),
  )
  const [entries, setEntries] = useState<PrintListEntry[]>(() =>
    cloneEntries(cardsProp),
  )
  /** Pre-baked page bitmap URLs — flip pages without recalculation. */
  const [pageUrls, setPageUrls] = useState<string[]>([])
  const [committedLayout, setCommittedLayout] = useState<PrintLayout | null>(
    null,
  )
  const [committedCardCount, setCommittedCardCount] = useState(0)
  const [committedSettingsKey, setCommittedSettingsKey] = useState('')
  const [committedListKey, setCommittedListKey] = useState('')
  const [bakeDone, setBakeDone] = useState(0)
  const [bakeTotal, setBakeTotal] = useState(0)
  const [imageStore, setImageStore] = useState<Map<string, SharedPrintImage>>(
    () => new Map(),
  )
  const [failed, setFailed] = useState<string[]>([])
  const [progressDone, setProgressDone] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportUrl, setExportUrl] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bakeAbortRef = useRef<AbortController | null>(null)
  const storeRef = useRef<Map<string, SharedPrintImage>>(new Map())
  const pageUrlsRef = useRef<string[]>([])
  const progressRafRef = useRef<number | null>(null)
  const progressLatestRef = useRef({ done: 0, total: 0 })
  const exportingLock = useRef(false)
  const exportGenRef = useRef(0)
  const exportUrlRef = useRef<string | null>(null)

  const replacePageUrls = useCallback((next: string[]) => {
    const prev = pageUrlsRef.current
    pageUrlsRef.current = next
    setPageUrls(next)
    if (prev.length > 0) deferRevokeObjectUrls(prev)
  }, [])

  const releaseExportUrl = useCallback(() => {
    const url = exportUrlRef.current
    exportUrlRef.current = null
    setExportUrl(null)
    if (url) deferRevokeObjectUrls([url])
  }, [])

  const abandonSessionResources = useCallback(() => {
    const store = storeRef.current
    storeRef.current = new Map()
    const urls = pageUrlsRef.current
    pageUrlsRef.current = []
    const exportUrlValue = exportUrlRef.current
    exportUrlRef.current = null
    deferRevokePrintImageStore(store)
    if (urls.length > 0) deferRevokeObjectUrls(urls)
    if (exportUrlValue) deferRevokeObjectUrls([exportUrlValue])
  }, [])

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setSession((n) => n + 1)
      setSettings(loadPrintSettings())
      setAdvancedOpen(false)
      setPhase(initialPhase(Boolean(resolveCards)))
      setEntries(cloneEntries(cardsProp))
      replacePageUrls([])
      setCommittedLayout(null)
      setCommittedCardCount(0)
      setCommittedSettingsKey('')
      setCommittedListKey('')
      setBakeDone(0)
      setBakeTotal(0)
      setImageStore(new Map())
      setFailed([])
      setError(null)
      setProgressDone(0)
      setProgressTotal(0)
      setExportOpen(false)
      setExportUrl(null)
      // exportUrlRef is released in the session effect via abandonSessionResources
    }
  }

  const cardMm = resolveCardMm(settings)
  const draftLayout = useMemo(
    () =>
      computeLayout({
        paper: settings.paper,
        cardW: cardMm.w,
        cardH: cardMm.h,
        pageMargin: settings.pageMargin,
        gap: settings.gap,
        flushCut: settings.flushCut,
      }),
    [settings, cardMm.w, cardMm.h],
  )

  const listCount = useMemo(
    () => countPrintableSlots(entries, imageStore),
    [entries, imageStore],
  )

  const previewDirty =
    phase === 'ready' &&
    (settingsKey(settings) !== committedSettingsKey ||
      listKey(entries) !== committedListKey)

  const displayLayout = committedLayout ?? draftLayout
  const paperAspect = `${displayLayout.pageW} / ${displayLayout.pageH}`
  const sheetWidth = `min(100%, 560px, calc(min(68dvh, 720px) * ${displayLayout.pageW} / ${displayLayout.pageH}))`

  const runBake = useCallback(
    async (
      list: PrintListEntry[],
      store: Map<string, SharedPrintImage>,
      layoutOpts: PrintAssistantSettings,
      signal: AbortSignal,
    ) => {
      const card = resolveCardMm(layoutOpts)
      const layout = computeLayout({
        paper: layoutOpts.paper,
        cardW: card.w,
        cardH: card.h,
        pageMargin: layoutOpts.pageMargin,
        gap: layoutOpts.gap,
        flushCut: layoutOpts.flushCut,
      })
      const images = materializePrintImages(list, store)
      if (images.length === 0) {
        replacePageUrls([])
        setCommittedLayout(layout)
        setCommittedCardCount(0)
        setCommittedSettingsKey(settingsKey(layoutOpts))
        setCommittedListKey(listKey(list))
        return false
      }
      setPhase('building')
      setBakeDone(0)
      setBakeTotal(0)
      const urls = await bakePrintPreviewPages({
        layout,
        images,
        bleedMm: layoutOpts.bleedMm,
        fillEmpty: layoutOpts.fillEmpty,
        signal,
        onProgress: (done, total) => {
          setBakeDone(done)
          setBakeTotal(total)
        },
      })
      if (signal.aborted) {
        deferRevokeObjectUrls(urls)
        return false
      }
      replacePageUrls(urls)
      setCommittedLayout(layout)
      setCommittedCardCount(images.length)
      setCommittedSettingsKey(settingsKey(layoutOpts))
      setCommittedListKey(listKey(list))
      return true
    },
    [replacePageUrls],
  )

  useEffect(() => {
    if (!open) return
    savePrintSettings(settings)
  }, [open, settings])

  useEffect(() => {
    if (!open || session === 0) return

    abortRef.current?.abort()
    bakeAbortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    abandonSessionResources()
    setImageStore(new Map())
    replacePageUrls([])

    void (async () => {
      try {
        // Let the empty shell paint before heavy resolve/fetch/bake.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve())
          })
        })
        if (ac.signal.aborted) return
        let list = cloneEntries(cardsProp)
        if (resolveCards) {
          list = cloneEntries(await resolveCards(ac.signal))
        }
        if (ac.signal.aborted) return
        setEntries(list)
        if (list.length === 0 || expandPrintList(list).length === 0) {
          setPhase('error')
          setError(t('printAssistant.empty'))
          return
        }
        setPhase('loading')
        setProgressDone(0)
        setProgressTotal(0)
        const { store, failed: failNames } = await fetchPrintPreviewImageStore(
          list,
          {
            signal: ac.signal,
            onProgress: (p) => {
              progressLatestRef.current = { done: p.done, total: p.total }
              if (progressRafRef.current != null) return
              progressRafRef.current = requestAnimationFrame(() => {
                progressRafRef.current = null
                const latest = progressLatestRef.current
                setProgressDone(latest.done)
                setProgressTotal(latest.total)
              })
            },
          },
        )
        if (ac.signal.aborted) {
          deferRevokePrintImageStore(store)
          return
        }
        const materialized = materializePrintImages(list, store)
        if (materialized.length === 0) {
          deferRevokePrintImageStore(store)
          setPhase('error')
          setFailed(failNames)
          setError(t('printAssistant.allFailed'))
          return
        }
        storeRef.current = store
        setImageStore(store)
        setFailed(failNames)

        const bakeAc = new AbortController()
        bakeAbortRef.current = bakeAc
        const ok = await runBake(list, store, loadPrintSettings(), bakeAc.signal)
        if (bakeAc.signal.aborted || ac.signal.aborted) return
        if (!ok) {
          setPhase('error')
          setError(t('printAssistant.empty'))
          return
        }
        setPhase('ready')
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setPhase('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    })()

    return () => {
      ac.abort()
      bakeAbortRef.current?.abort()
      if (progressRafRef.current != null) {
        cancelAnimationFrame(progressRafRef.current)
        progressRafRef.current = null
      }
      abandonSessionResources()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open session
  }, [open, session])

  const updateEntryQty = useCallback((id: string, quantity: number) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, quantity: Math.max(0, Math.floor(quantity)) }
          : e,
      ),
    )
  }, [])

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const moveEntry = useCallback((id: string, dir: -1 | 1) => {
    setEntries((prev) => {
      const i = prev.findIndex((e) => e.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      const tmp = next[i]!
      next[i] = next[j]!
      next[j] = tmp
      return next
    })
  }, [])

  const reloadPreview = useCallback(() => {
    if (phase === 'building' || phase === 'loading' || phase === 'resolving') {
      return
    }
    bakeAbortRef.current?.abort()
    const bakeAc = new AbortController()
    bakeAbortRef.current = bakeAc
    setError(null)
    void (async () => {
      try {
        const ok = await runBake(entries, imageStore, settings, bakeAc.signal)
        if (bakeAc.signal.aborted) return
        if (!ok) {
          setPhase('error')
          setError(t('printAssistant.empty'))
          return
        }
        setPhase('ready')
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setPhase('ready')
        setError(err instanceof Error ? err.message : String(err))
      }
    })()
  }, [phase, entries, imageStore, settings, runBake, t])

  const formatPageOf = useCallback(
    (current: number, total: number) =>
      t('printAssistant.pageOf', { current, total }),
    [t],
  )

  if (!open) return null

  const patchSettings = (partial: Partial<PrintAssistantSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }

  const setPaper = (paper: PaperSizeId) => patchSettings({ paper })

  const onExport = async () => {
    if (listCount === 0 || phase === 'exporting' || exportingLock.current) {
      return
    }
    exportingLock.current = true
    const gen = ++exportGenRef.current
    setPhase('exporting')
    setError(null)
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
    try {
      // Preview store holds Scryfall `normal`; PDF needs `png` (reuse when same URL).
      const { store: printStore, failed: failNames } =
        await fetchPrintImageStore(entries, {
          reuseFrom: imageStore,
        })
      if (gen !== exportGenRef.current) {
        deferRevokePrintImageStore(printStore, imageStore)
        return
      }
      const images = materializePrintImages(entries, printStore)
      if (images.length === 0) {
        deferRevokePrintImageStore(printStore, imageStore)
        throw new Error(
          failNames.length > 0
            ? t('printAssistant.allFailed')
            : t('printAssistant.empty'),
        )
      }
      const bytes = await buildCardPrintPdf(images, {
        layout: draftLayout,
        bleedMm: settings.bleedMm,
        fillEmpty: settings.fillEmpty,
      })
      // Drop print-only PNG blobs; keep preview normals for the open modal.
      deferRevokePrintImageStore(printStore, imageStore)
      if (gen !== exportGenRef.current) return
      // Finish Blob + object URL while still showing "Building PDF…",
      // so the ready dialog opens with actions immediately usable.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })
      if (gen !== exportGenRef.current) return
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      if (gen !== exportGenRef.current) {
        deferRevokeObjectUrls([url])
        return
      }
      const prevUrl = exportUrlRef.current
      exportUrlRef.current = url
      setExportUrl(url)
      setExportOpen(true)
      setPhase('ready')
      if (prevUrl) deferRevokeObjectUrls([prevUrl])
    } catch (err) {
      if (gen !== exportGenRef.current) return
      setPhase('ready')
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (gen === exportGenRef.current) {
        exportingLock.current = false
      }
    }
  }

  const closeExportDialog = () => {
    // Unmount dialog first; revoke the large PDF URL after paint.
    setExportOpen(false)
    releaseExportUrl()
  }

  const close = () => {
    exportGenRef.current += 1
    exportingLock.current = false
    abortRef.current?.abort()
    bakeAbortRef.current?.abort()
    setExportOpen(false)
    releaseExportUrl()
    // Remaining image/preview teardown is deferred in the session effect cleanup.
    onClose()
  }

  const progressPct =
    progressTotal > 0
      ? Math.round((progressDone / progressTotal) * 100)
      : 0
  const showPreviewStage =
    phase === 'ready' ||
    phase === 'exporting' ||
    phase === 'building'
  const cardN = previewDirty ? listCount : committedCardCount
  const pageN = previewDirty
    ? pageCount(listCount, draftLayout)
    : pageUrls.length
  const exportName = printFilename(sourceSlug, settings.paper)

  return createPortal(
    <>
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
          <p className="print-assistant-tip">{t('printAssistant.printTip')}</p>

          <div className="print-assistant-layout">
            <div className="print-assistant-sidebar">
              <div className="print-assistant-paper">
                <span>{t('printAssistant.paper')}</span>
                <div
                  className="print-assistant-paper-btns"
                  role="group"
                  aria-label={t('printAssistant.paper')}
                >
                  {(
                    [
                      ['a4', 'paperA4'],
                      ['a3', 'paperA3'],
                      ['b4', 'paperB4'],
                      ['letter', 'paperLetter'],
                      ['photo6', 'paperPhoto6'],
                    ] as const
                  ).map(([id, key]) => (
                    <button
                      key={id}
                      type="button"
                      className={`btn ghost${settings.paper === id ? ' is-active' : ''}`}
                      onClick={() => setPaper(id)}
                    >
                      {t(`printAssistant.${key}`)}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`btn ghost${advancedOpen ? ' is-active' : ''}`}
                    aria-expanded={advancedOpen}
                    onClick={() => setAdvancedOpen((v) => !v)}
                  >
                    {t('printAssistant.advanced')}
                  </button>
                </div>
              </div>

              {advancedOpen ? (
                <div className="print-assistant-advanced">
                  <p className="print-assistant-advanced-lead">
                    {t('printAssistant.advancedLead')}
                  </p>
                  <div className="print-assistant-custom-size">
                    <label>
                      {t('printAssistant.cardWidth')}
                      <input
                        type="number"
                        min={1}
                        max={200}
                        step={1}
                        value={settings.cardW}
                        onChange={(e) =>
                          patchSettings({
                            cardW: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </label>
                    <label>
                      {t('printAssistant.cardHeight')}
                      <input
                        type="number"
                        min={1}
                        max={200}
                        step={1}
                        value={settings.cardH}
                        onChange={(e) =>
                          patchSettings({
                            cardH: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </label>
                  </div>
                  <label className="print-assistant-field">
                    <span>{t('printAssistant.bleed')}</span>
                    <input
                      type="number"
                      min={0}
                      max={3}
                      step={0.5}
                      value={settings.bleedMm}
                      onChange={(e) =>
                        patchSettings({
                          bleedMm: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="print-assistant-option">
                    <input
                      type="checkbox"
                      checked={settings.flushCut}
                      onChange={(e) =>
                        patchSettings({ flushCut: e.target.checked })
                      }
                    />
                    <span>{t('printAssistant.flushCut')}</span>
                  </label>
                  <label className="print-assistant-field">
                    <span>{t('printAssistant.pageMargin')}</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      disabled={settings.flushCut}
                      value={settings.pageMargin}
                      onChange={(e) =>
                        patchSettings({
                          pageMargin: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="print-assistant-field">
                    <span>{t('printAssistant.gap')}</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={1}
                      value={settings.gap}
                      onChange={(e) =>
                        patchSettings({ gap: Number(e.target.value) || 0 })
                      }
                    />
                  </label>
                  <label className="print-assistant-option">
                    <input
                      type="checkbox"
                      checked={settings.fillEmpty}
                      onChange={(e) =>
                        patchSettings({ fillEmpty: e.target.checked })
                      }
                    />
                    <span>{t('printAssistant.fillEmpty')}</span>
                  </label>
                </div>
              ) : null}

              {showPreviewStage && entries.length > 0 ? (
                <div className="print-assistant-list">
                  <div className="print-assistant-list-head">
                    {t('printAssistant.listTitle')}
                  </div>
                  <div className="print-assistant-list-scroll" role="list">
                    {entries.map((entry, index) => (
                      <PrintListRow
                        key={entry.id}
                        entry={entry}
                        index={index}
                        total={entries.length}
                        thumbUrl={imageStore.get(entry.imageUrl)?.objectUrl}
                        qtyDownLabel={t('printAssistant.qtyDown')}
                        qtyUpLabel={t('printAssistant.qtyUp')}
                        quantityLabel={t('printAssistant.quantity')}
                        moveUpLabel={t('printAssistant.moveUp')}
                        moveDownLabel={t('printAssistant.moveDown')}
                        removeLabel={t('printAssistant.remove')}
                        onQty={updateEntryQty}
                        onMove={moveEntry}
                        onRemove={removeEntry}
                      />
                    ))}
                  </div>
                  {previewDirty ? (
                    <p className="print-assistant-list-dirty" role="status">
                      {t('printAssistant.listDirty')}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className={`btn ghost print-assistant-reload${previewDirty ? ' is-active' : ''}`}
                    disabled={
                      phase === 'building' ||
                      (!previewDirty && pageUrls.length > 0)
                    }
                    onClick={reloadPreview}
                  >
                    {phase === 'building'
                      ? t('printAssistant.buildingPreview', {
                          done: bakeDone,
                          total: bakeTotal || '…',
                        })
                      : t('printAssistant.reloadPreview')}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="print-assistant-body">
              <div className="print-assistant-meta">
                <span>{t('printAssistant.cardCount', { n: cardN })}</span>
                <span>
                  {t('printAssistant.pageCount', { n: pageN })}
                </span>
                <span>
                  {t('printAssistant.gridSize', {
                    cols: displayLayout.cols,
                    rows: displayLayout.rows,
                  })}
                </span>
              </div>
              <div className="print-assistant-stage">
                {showPreviewStage ? (
                  <div className="print-assistant-stage-ready">
                    <PrintPreviewPanel
                      pageUrls={pageUrls}
                      pageW={displayLayout.pageW}
                      pageH={displayLayout.pageH}
                      pending={previewDirty}
                      building={phase === 'building'}
                      buildDone={bakeDone}
                      buildTotal={bakeTotal}
                      buildingLabel={t('printAssistant.buildingPreview', {
                        done: bakeDone,
                        total: bakeTotal || '…',
                      })}
                      prevLabel={t('printAssistant.prevPage')}
                      nextLabel={t('printAssistant.nextPage')}
                      formatPageOf={formatPageOf}
                    />
                  </div>
                ) : (
                  <div
                    className="print-assistant-stage-loading"
                    role="status"
                    style={{ width: sheetWidth, aspectRatio: paperAspect }}
                  >
                    <div
                      className="print-preview-sheet print-preview-sheet--placeholder"
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
                              total: progressTotal || '…',
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
            </div>
          </div>

          <div className="print-assistant-footer">
            <div className="print-assistant-action-btns">
              <button
                type="button"
                className={`btn primary${phase === 'exporting' ? ' is-busy' : ''}`}
                disabled={
                  phase === 'exporting' ||
                  phase !== 'ready' ||
                  listCount === 0
                }
                aria-busy={phase === 'exporting'}
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
        </div>
      </div>

      <PrintExportDialog
        open={exportOpen}
        onClose={closeExportDialog}
        pdfUrl={exportUrl}
        filename={exportName}
      />
    </>,
    document.body,
  )
}
