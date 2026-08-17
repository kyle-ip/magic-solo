import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PackHeadIconButton } from './PackHeadIconButton'
import { AppOverlay, UiButton } from './ui'

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

  const handleClose = () => {
    if (busy === 'print' || busy === 'share') return
    onClose()
  }

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
        if (!iframe || !pdfUrl) {
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
    if (busy || !pdfUrl) return
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
    if (busy || !pdfUrl) return
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

  return (
    <AppOverlay
      open={open && !!pdfUrl}
      onClose={handleClose}
      title={t('printAssistant.exportReadyTitle')}
      titleId="print-export-title"
      className="print-export-backdrop"
      shellClassName="print-export-shell"
      size="narrow"
      closeOnBackdrop={busy !== 'print' && busy !== 'share'}
      headerActions={
        <PackHeadIconButton
          icon="close"
          label={t('printAssistant.close')}
          disabled={busy === 'print' || busy === 'share'}
          onClick={handleClose}
        />
      }
    >
      <p className="print-export-lead">
        {t('printAssistant.exportReadyLead')}
      </p>
      <p className="print-export-tip">{t('printAssistant.printTip')}</p>
      <div className="print-export-actions">
        <UiButton
          variant="primary"
          className={busy === 'print' ? 'is-busy' : undefined}
          disabled={busy != null && busy !== 'print'}
          aria-busy={busy === 'print'}
          onClick={printPdf}
        >
          {busy === 'print'
            ? t('printAssistant.exportPrinting')
            : t('printAssistant.exportPrint')}
        </UiButton>
        <UiButton
          variant="ghost"
          className={busy === 'save' ? 'is-busy' : undefined}
          disabled={busy != null && busy !== 'save'}
          aria-busy={busy === 'save'}
          onClick={savePdf}
        >
          {busy === 'save'
            ? t('printAssistant.exportSaving')
            : t('printAssistant.exportSave')}
        </UiButton>
        {canShare ? (
          <UiButton
            variant="ghost"
            className={busy === 'share' ? 'is-busy' : undefined}
            disabled={busy != null && busy !== 'share'}
            aria-busy={busy === 'share'}
            onClick={() => void sharePdf()}
          >
            {busy === 'share'
              ? t('printAssistant.exportSharing')
              : t('printAssistant.exportShare')}
          </UiButton>
        ) : null}
      </div>
      <iframe
        ref={iframeRef}
        className="print-export-iframe"
        title={t('printAssistant.exportReadyTitle')}
      />
    </AppOverlay>
  )
}
