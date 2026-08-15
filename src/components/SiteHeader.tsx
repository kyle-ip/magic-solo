import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitch } from './LanguageSwitch'
import { ReferencesButton } from './ReferencesButton'
import { CARD_EDITOR_ENABLED } from '../features'
import { assetUrl } from '../utils/assetUrl'

const PackDrawButton = lazy(() =>
  import('./PackDrawButton').then((m) => ({ default: m.PackDrawButton })),
)
const SingleDrawButton = lazy(() =>
  import('./SingleDrawButton').then((m) => ({ default: m.SingleDrawButton })),
)

function PackDrawSlot() {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)

  // Prefetch pack module after first paint so the open control stays one-click.
  useEffect(() => {
    let cancelled = false
    const start = () => {
      void import('./PackDrawButton')
        .then(() => {
          if (!cancelled) setShow(true)
        })
        .catch(() => {
          // Keep a clickable control even if prefetch fails; Suspense will retry.
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

function SingleDrawSlot() {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)

  useEffect(() => {
    let cancelled = false
    const start = () => {
      void import('./SingleDrawButton')
        .then(() => {
          if (!cancelled) setShow(true)
        })
        .catch(() => {
          if (!cancelled) setShow(true)
        })
    }
    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      }
    ).requestIdleCallback
    if (typeof ric === 'function') {
      const id = ric(start, { timeout: 1400 })
      return () => {
        cancelled = true
        window.cancelIdleCallback?.(id)
      }
    }
    const tid = window.setTimeout(start, 50)
    return () => {
      cancelled = true
      window.clearTimeout(tid)
    }
  }, [])

  if (!show) {
    return (
      <button type="button" className="references-text-btn" disabled aria-busy>
        {t('singleDraw.open')}
      </button>
    )
  }

  return (
    <Suspense
      fallback={
        <button type="button" className="references-text-btn" disabled aria-busy>
          {t('singleDraw.open')}
        </button>
      }
    >
      <SingleDrawButton />
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
            src={assetUrl('mtg-logo-mark.svg')}
            alt={t('app.brand')}
            width={56}
            height={56}
          />
          <span className="brand-solo">
            <strong>{t('app.brand')}</strong>
            <em>{t('app.tagline')}</em>
          </span>
        </Link>
        <div className="site-header-actions">
          <nav className="site-header-nav">
            <Link to="/classic-decks" className="references-text-btn">
              {t('classicDecks.open')}
            </Link>
            <Link to="/sets" className="references-text-btn">
              {t('sets.open')}
            </Link>
            {CARD_EDITOR_ENABLED ? (
              <Link to="/editor" className="references-text-btn">
                {t('cardEditor.open')}
              </Link>
            ) : (
              <span
                className="references-text-btn is-disabled"
                aria-disabled="true"
                title={t('cardEditor.comingSoon')}
              >
                {t('cardEditor.open')}
              </span>
            )}
            <PackDrawSlot />
            <SingleDrawSlot />
            <ReferencesButton />
          </nav>
          <LanguageSwitch />
        </div>
      </div>
    </header>
  )
}
