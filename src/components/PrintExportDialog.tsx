import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { PackHeadIconButton } from './PackHeadIconButton'

type PrintExportDialogProps = {
  open: boolean
  onClose: () => void
  /** Object URL for a fully prepared PDF (created before this dialog opens). */
  pdfUrl: string | null
  filename: string
}

type BusyAction = 'save' | 'print' | 'share' | null

function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

function waitForIframeLoad(
  iframe: HTMLIFrameElement,
  url: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('PDF iframe load timeout'))
    }, 20000)
    const onLoad = () => {
      cleanup()
      resolve()
    }
    const cleanup = () => {
      window.clearTimeout(timer)
      iframe.removeEventListener('load', onLoad)
    }
    iframe.addEventListener('load', onLoad)
    iframe.src = url
  })
}

/**
 * Print / Save / Share for an already-prepared PDF object URL.
 * The parent must finish Blob + createObjectURL before opening this dialog.
 */
export function PrintExportDialog({
  open,
  onClose,
  pdfUrl,
  filename,
}: PrintExportDialogProps) {
  const { t } = useTranslation()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [busy, setBusy] = useState<BusyAction>(null)

  const isMobile = useMemo(
    () =>
      typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
    [],
  )

  const canShare = useMemo(() => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.share ||
      !navigator.canShare
    ) {
      return false
    }
    try {
      return navigator.canShare({
        files: [
          new File([new Uint8Array(0)], 'x.pdf', { type: 'application/pdf' }),
        ],
      })
    } catch {
      return false
    }
  }, [])

  if (!open || !pdfUrl) return null

  const printPdf = () => {
    if (busy) return
    void (async () => {
      setBusy('print')
      await yieldToPaint()
      try {
        if (isMobile) {
          window.alert(t('printAssistant.exportMobilePrintWarn'))
        }
        const iframe = iframeRef.current
        if (!iframe) {
          window.alert(t('printAssistant.exportPrintFailed'))
          return
        }
        try {
          await waitForIframeLoad(iframe, pdfUrl)
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } catch {
          window.alert(t('printAssistant.exportPrintFailed'))
        } finally {
          window.setTimeout(() => {
            if (iframeRef.current) iframeRef.current.src = 'about:blank'
          }, 800)
        }
      } finally {
        setBusy(null)
      }
    })()
  }

  const savePdf = () => {
    if (busy) return
    void (async () => {
      setBusy('save')
      await yieldToPaint()
      try {
        if (isMobile) {
          window.open(pdfUrl, '_blank', 'noopener')
        } else {
          const a = document.createElement('a')
          a.href = pdfUrl
          a.download = filename
          a.rel = 'noopener'
          a.click()
        }
        await new Promise((r) => setTimeout(r, 280))
      } finally {
        setBusy(null)
      }
    })()
  }

  const sharePdf = async () => {
    if (busy) return
    setBusy('share')
    await yieldToPaint()
    try {
      const res = await fetch(pdfUrl)
      const blob = await res.blob()
      await yieldToPaint()
      const shareFile = new File([blob], filename, { type: 'application/pdf' })
      if (!navigator.share) return
      await navigator.share({ files: [shareFile] })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      window.alert(t('printAssistant.exportShareFailed'))
    } finally {
      setBusy(null)
    }
  }

  const handleClose = () => {
    if (busy === 'print' || busy === 'share') return
    // Parent unmounts this dialog first; PDF URL teardown is deferred there.
    onClose()
  }

  return createPortal(
    <div
      className="print-export-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        className="print-export-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-export-title"
        aria-busy={busy != null}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="print-export-head">
          <h3 id="print-export-title">{t('printAssistant.exportReadyTitle')}</h3>
          <div className="print-export-head-actions">
            <PackHeadIconButton
              icon="close"
              label={t('printAssistant.close')}
              disabled={busy === 'print' || busy === 'share'}
              onClick={handleClose}
            />
          </div>
        </header>
        <p className="print-export-lead">
          {t('printAssistant.exportReadyLead')}
        </p>
        <p className="print-export-tip">{t('printAssistant.printTip')}</p>
        <div className="print-export-actions">
          <button
            type="button"
            className={`btn primary${busy === 'print' ? ' is-busy' : ''}`}
            disabled={busy != null && busy !== 'print'}
            aria-busy={busy === 'print'}
            onClick={printPdf}
          >
            {busy === 'print'
              ? t('printAssistant.exportPrinting')
              : t('printAssistant.exportPrint')}
          </button>
          <button
            type="button"
            className={`btn ghost${busy === 'save' ? ' is-busy' : ''}`}
            disabled={busy != null && busy !== 'save'}
            aria-busy={busy === 'save'}
            onClick={savePdf}
          >
            {busy === 'save'
              ? t('printAssistant.exportSaving')
              : t('printAssistant.exportSave')}
          </button>
          {canShare ? (
            <button
              type="button"
              className={`btn ghost${busy === 'share' ? ' is-busy' : ''}`}
              disabled={busy != null && busy !== 'share'}
              aria-busy={busy === 'share'}
              onClick={() => void sharePdf()}
            >
              {busy === 'share'
                ? t('printAssistant.exportSharing')
                : t('printAssistant.exportShare')}
            </button>
          ) : null}
        </div>
        <iframe
          ref={iframeRef}
          className="print-export-iframe"
          title={t('printAssistant.exportReadyTitle')}
        />
      </div>
    </div>,
    document.body,
  )
}
