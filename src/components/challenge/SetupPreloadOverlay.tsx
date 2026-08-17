import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock'

type Props = {
  /** i18n key under challenge.* or assistant.* for the title */
  titleKey: string
  done: number
  total: number
  /** Namespace: challenge | assistant */
  ns?: 'challenge' | 'assistant'
  onCancel: () => void
}

/** Full-viewport centered preload; locks page scroll while open. */
export function SetupPreloadOverlay({
  titleKey,
  done,
  total,
  ns = 'challenge',
  onCancel,
}: Props) {
  const { t } = useTranslation()
  useBodyScrollLock(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const assetsKey = `${ns}.loadingAssets` as const
  const cancelKey = `${ns}.cancelLoading` as const

  return createPortal(
    <div className="setup-preload" role="status" aria-live="polite" aria-busy="true">
      <div className="setup-preload-fx" aria-hidden="true">
        <span className="setup-preload-card" />
        <span className="setup-preload-card" />
        <span className="setup-preload-card" />
      </div>
      <p className="setup-preload-title">{t(titleKey)}</p>
      <p>
        {t(assetsKey, {
          done,
          total: total || '…',
          pct,
        })}
      </p>
      <div className="setup-preload-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <button type="button" className="btn setup-preload-cancel" onClick={onCancel}>
        {t(cancelKey)}
      </button>
    </div>,
    document.body,
  )
}
