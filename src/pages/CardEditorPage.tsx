import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CardPreviewCanvas } from '../components/editor/CardPreviewCanvas'
import { EditorFormPanels } from '../components/editor/EditorFormPanels'
import { EditorToolbar } from '../components/editor/EditorToolbar'
import { PrintAssistantModal } from '../components/PrintAssistantModal'
import { blankEditorCard, newEditorId } from '../editor/defaults'
import {
  parseEditorDocumentJson,
  suggestedPlayerImagePath,
  toConstructedCardDef,
} from '../editor/exportConstructed'
import { exportCardPng, revokeCachedEditorImage } from '../editor/renderCardCanvas'
import {
  importFromScryfallQuery,
  importRandomScryfallCard,
  importScryfallById,
  searchScryfallHits,
  type ScryfallSearchHit,
} from '../editor/scryfallImport'
import type { EditorCardDocument } from '../editor/types'
import { downloadBlob } from '../print/downloadBlob'
import type { PrintListEntry } from '../print/printCards'

function safeFilename(name: string): string {
  return name.replace(/[^\w\u4e00-\u9fff-]+/g, '_').slice(0, 64) || 'card'
}

export function CardEditorPage() {
  const { t } = useTranslation()
  const [doc, setDoc] = useState<EditorCardDocument>(() => blankEditorCard())
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pngScale, setPngScale] = useState(2)
  const [scryfallQuery, setScryfallQuery] = useState('')
  const [hits, setHits] = useState<ScryfallSearchHit[]>([])
  const [printOpen, setPrintOpen] = useState(false)
  const [printCards, setPrintCards] = useState<PrintListEntry[]>([])
  const blobArtRef = useRef<string | null>(null)
  const printBlobRef = useRef<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    return () => {
      if (blobArtRef.current) {
        URL.revokeObjectURL(blobArtRef.current)
        revokeCachedEditorImage(blobArtRef.current)
      }
      if (printBlobRef.current) {
        URL.revokeObjectURL(printBlobRef.current)
      }
    }
  }, [])

  const patch = useCallback((p: Partial<EditorCardDocument>) => {
    setDoc((prev) => ({ ...prev, ...p }))
    setError(null)
  }, [])

  const replaceDoc = useCallback((next: EditorCardDocument) => {
    setDoc(next)
    setHits([])
    setError(null)
    setStatus(t('cardEditor.statusLoaded', { name: next.name }))
  }, [t])

  const onNew = () => {
    if (blobArtRef.current) {
      URL.revokeObjectURL(blobArtRef.current)
      revokeCachedEditorImage(blobArtRef.current)
      blobArtRef.current = null
    }
    replaceDoc(blankEditorCard())
    setStatus(t('cardEditor.statusNew'))
  }

  const onImportJson = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = parseEditorDocumentJson(JSON.parse(text))
      if (!parsed.id) parsed.id = newEditorId()
      if (!parsed.artCrop) parsed.artCrop = { x: 0.5, y: 0.5, zoom: 1 }
      if (!parsed.effect) parsed.effect = { type: 'none' }
      replaceDoc(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const onExportJson = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: 'application/json',
    })
    downloadBlob(blob, `${safeFilename(doc.name)}.editor.json`)
    setStatus(t('cardEditor.statusExportedJson'))
  }

  const onExportConstructed = () => {
    const def = toConstructedCardDef(doc)
    const blob = new Blob([JSON.stringify(def, null, 2)], {
      type: 'application/json',
    })
    downloadBlob(blob, `${safeFilename(doc.name)}.constructed.json`)
    setStatus(
      t('cardEditor.statusExportedConstructed', {
        path: suggestedPlayerImagePath(doc),
      }),
    )
  }

  const onExportPng = async () => {
    setBusy(true)
    setError(null)
    try {
      const blob = await exportCardPng(doc, pngScale)
      downloadBlob(blob, `${safeFilename(doc.name)}@${pngScale}x.png`)
      setStatus(t('cardEditor.statusExportedPng'))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onPrint = async () => {
    setBusy(true)
    setError(null)
    try {
      const blob = await exportCardPng(doc, Math.max(2, pngScale))
      if (printBlobRef.current) URL.revokeObjectURL(printBlobRef.current)
      const url = URL.createObjectURL(blob)
      printBlobRef.current = url
      setPrintCards([{ id: doc.id, name: doc.name, imageUrl: url, quantity: 1 }])
      setPrintOpen(true)
      setStatus(t('cardEditor.statusPrint'))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const runImport = async (fn: () => Promise<EditorCardDocument>) => {
    setBusy(true)
    setError(null)
    try {
      const next = await fn()
      if (blobArtRef.current) {
        URL.revokeObjectURL(blobArtRef.current)
        revokeCachedEditorImage(blobArtRef.current)
        blobArtRef.current = null
      }
      replaceDoc(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onArtFile = (file: File) => {
    if (blobArtRef.current) {
      URL.revokeObjectURL(blobArtRef.current)
      revokeCachedEditorImage(blobArtRef.current)
    }
    const url = URL.createObjectURL(file)
    blobArtRef.current = url
    patch({ artUrl: url, artCrop: { x: 0.5, y: 0.5, zoom: 1 } })
  }

  return (
    <main className="card-editor-page">
      <header className="card-editor-hero">
        <p className="card-editor-eyebrow">{t('cardEditor.eyebrow')}</p>
        <h1>{t('cardEditor.title')}</h1>
        <p className="card-editor-lead">{t('cardEditor.lead')}</p>
        <p className="card-editor-disclaimer">{t('cardEditor.disclaimer')}</p>
      </header>

      <EditorToolbar
        busy={busy}
        pngScale={pngScale}
        onPngScale={setPngScale}
        onNew={onNew}
        onImportJson={(f) => void onImportJson(f)}
        onExportJson={onExportJson}
        onExportConstructed={onExportConstructed}
        onExportPng={() => void onExportPng()}
        onPrint={() => void onPrint()}
        scryfallQuery={scryfallQuery}
        onScryfallQuery={setScryfallQuery}
        onScryfallImport={() =>
          void runImport(() => importFromScryfallQuery(scryfallQuery))
        }
        onScryfallRandom={() => void runImport(() => importRandomScryfallCard())}
        onScryfallSearch={() => {
          void (async () => {
            setBusy(true)
            setError(null)
            try {
              const list = await searchScryfallHits(scryfallQuery)
              setHits(list)
              if (list.length === 0) {
                setStatus(t('cardEditor.statusNoHits'))
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e))
            } finally {
              setBusy(false)
            }
          })()
        }}
      />

      {hits.length > 0 ? (
        <ul className="card-editor-hits">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                className="card-editor-hit"
                disabled={busy}
                onClick={() =>
                  void runImport(() => importScryfallById(hit.id))
                }
              >
                {hit.thumbUrl ? (
                  <img src={hit.thumbUrl} alt="" width={36} height={50} />
                ) : null}
                <span>
                  <strong>{hit.name}</strong>
                  <em>
                    {hit.setCode} · {hit.collectorNumber}
                  </em>
                  <small>{hit.typeLine}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {(status || error) && (
        <p
          className={`card-editor-status ${error ? 'is-error' : ''}`}
          role="status"
        >
          {error || status}
        </p>
      )}

      <div className="card-editor-workspace">
        <div className="card-editor-preview-col">
          <CardPreviewCanvas doc={doc} canvasRef={canvasRef} />
        </div>
        <EditorFormPanels doc={doc} onChange={patch} onArtFile={onArtFile} />
      </div>

      <PrintAssistantModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        cards={printCards}
        sourceSlug="editor"
      />
    </main>
  )
}
