import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function FloatingNav() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [showTop, setShowTop] = useState(false)
  const isDeckPage = pathname.startsWith('/decks/')

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 320)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  if (!showTop && !isDeckPage) return null

  return (
    <div className="floating-nav" role="navigation" aria-label={t('app.floatingNav')}>
      {isDeckPage ? (
        <Link to="/" className="floating-nav-btn" title={t('app.home')} aria-label={t('app.home')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4.5 11.2 12 4.8l7.5 6.4v8.5a.7.7 0 0 1-.7.7h-4.6v-5.2h-4.4v5.2H5.2a.7.7 0 0 1-.7-.7v-8.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      ) : null}
      {showTop ? (
        <button
          type="button"
          className="floating-nav-btn"
          onClick={scrollTop}
          title={t('app.backToTop')}
          aria-label={t('app.backToTop')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 5.2v13.6M6.8 10.4 12 5.2l5.2 5.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
