import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

type EditorToolbarProps = {
  busy: boolean
  pngScale: number
  onPngScale: (n: number) => void
  onNew: () => void
  onImportJson: (file: File) => void
  onExportJson: () => void
  onExportConstructed: () => void
  onExportPng: () => void
  onPrint: () => void
  scryfallQuery: string
  onScryfallQuery: (q: string) => void
  onScryfallImport: () => void
  onScryfallRandom: () => void
  onScryfallSearch: () => void
}

export function EditorToolbar({
  busy,
  pngScale,
  onPngScale,
  onNew,
  onImportJson,
  onExportJson,
  onExportConstructed,
  onExportPng,
  onPrint,
  scryfallQuery,
  onScryfallQuery,
  onScryfallImport,
  onScryfallRandom,
  onScryfallSearch,
}: EditorToolbarProps) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="card-editor-toolbar">
      <div className="card-editor-toolbar-row">
        <button type="button" className="btn" disabled={busy} onClick={onNew}>
          {t('cardEditor.new')}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {t('cardEditor.importJson')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImportJson(f)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={onExportJson}
        >
          {t('cardEditor.exportJson')}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={onExportConstructed}
        >
          {t('cardEditor.exportConstructed')}
        </button>
      </div>

      <div className="card-editor-toolbar-row card-editor-scryfall">
        <input
          type="search"
          className="card-editor-input"
          value={scryfallQuery}
          disabled={busy}
          placeholder={t('cardEditor.scryfallPlaceholder')}
          onChange={(e) => onScryfallQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onScryfallImport()
          }}
        />
        <button
          type="button"
          className="btn"
          disabled={busy || !scryfallQuery.trim()}
          onClick={onScryfallImport}
        >
          {t('cardEditor.scryfallImport')}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy || !scryfallQuery.trim()}
          onClick={onScryfallSearch}
        >
          {t('cardEditor.scryfallSearch')}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={onScryfallRandom}
        >
          {t('cardEditor.scryfallRandom')}
        </button>
      </div>

      <div className="card-editor-toolbar-row">
        <label className="card-editor-inline-label">
          {t('cardEditor.pngScale')}
          <select
            value={pngScale}
            disabled={busy}
            onChange={(e) => onPngScale(Number(e.target.value))}
          >
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={3}>3×</option>
          </select>
        </label>
        <button type="button" className="btn" disabled={busy} onClick={onExportPng}>
          {t('cardEditor.exportPng')}
        </button>
        <button type="button" className="btn" disabled={busy} onClick={onPrint}>
          {t('cardEditor.sendPrint')}
        </button>
      </div>
    </div>
  )
}
