import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitch } from './LanguageSwitch'
import { ReferencesButton } from './ReferencesButton'
import { assetUrl } from '../utils/assetUrl'

const PackDrawButton = lazy(() =>
  import('./PackDrawButton').then((m) => ({ default: m.PackDrawButton })),
)

function PackDrawSlot() {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)

  // Prefetch pack module after first paint so the open control stays one-click.
  useEffect(() => {
    let cancelled = false
    const start = () => {
      void import('./PackDrawButton').then(() => {
        if (!cancelled) setShow(true)
      })
    }
    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      }
    ).requestIdleCallback
    if (typeof ric === 'function') {
      const id = ric(start, { timeout: 1200 })
      return () => {
        cancelled = true
        window.cancelIdleCallback?.(id)
      }
    }
    const tid = window.setTimeout(start, 0)
    return () => {
      cancelled = true
      window.clearTimeout(tid)
    }
  }, [])

  if (!show) {
    return (
      <button type="button" className="references-text-btn" disabled aria-busy>
        {t('packDraw.open')}
      </button>
    )
  }

  return (
    <Suspense
      fallback={
        <button type="button" className="references-text-btn" disabled aria-busy>
          {t('packDraw.open')}
        </button>
      }
    >
      <PackDrawButton />
    </Suspense>
  )
}

export function SiteHeader() {
  const { t } = useTranslation()

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand-lockup">
          <img
            className="brand-logo"
            src={assetUrl('mtg-logo.svg')}
            alt={t('app.brand')}
            width={210}
            height={48}
          />
          <span className="brand-solo">
            <strong>{t('app.brand')}</strong>
            <em>{t('app.tagline')}</em>
          </span>
        </Link>
        <div className="site-header-actions">
          <Link to="/classic-decks" className="references-text-btn">
            {t('classicDecks.open')}
          </Link>
          <PackDrawSlot />
          <ReferencesButton />
          <LanguageSwitch />
        </div>
      </div>
    </header>
  )
}
