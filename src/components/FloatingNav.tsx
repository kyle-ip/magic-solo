import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CARD_EDITOR_ENABLED } from '../features'
import { useHasLlmApiKey, useLlmReady } from '../hooks/useLlmSettings'
import { requestOpenLlmSettings } from '../llm/openSettings'
import { requestOpenPageChat } from '../llm/openPageChat'
import '../styles/llm.css'

interface FloatingNavProps {
  /** When true (challenge / assistant arena), only show chrome-safe controls. */
  arenaMode?: boolean
}

export function FloatingNav({ arenaMode = false }: FloatingNavProps) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [showTop, setShowTop] = useState(false)
  const hasKey = useHasLlmApiKey()
  const llmReady = useLlmReady()
  const isChallengeDeck = pathname.startsWith('/decks/')
  const isClassicDeck =
    pathname === '/classic-decks' || pathname.startsWith('/classic-decks/')
  const isSetGallery =
    pathname === '/sets' || pathname.startsWith('/sets/')
  const isHelp = pathname === '/help'
  const isEditor = CARD_EDITOR_ENABLED && pathname === '/editor'
  const isDeckPage = isChallengeDeck || isClassicDeck || isSetGallery || isHelp || isEditor
  const homeTo =
    isClassicDeck && pathname !== '/classic-decks'
      ? '/classic-decks'
      : isSetGallery && pathname !== '/sets'
        ? '/sets'
        : '/'
  const homeLabel =
    isClassicDeck && pathname !== '/classic-decks'
      ? t('classicDecks.backToList')
      : isSetGallery && pathname !== '/sets'
        ? t('sets.backToList')
        : t('app.home')

  useEffect(() => {
    if (arenaMode) return
    const onScroll = () => {
      setShowTop(window.scrollY > 320)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [arenaMode])

  const scrollTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  const showHome = !arenaMode && isDeckPage
  const showBackTop = !arenaMode && showTop
  // Key button only after the user has configured a key (zero chrome when unused).
  const showLlm = hasKey

  // Match pre-LLM visibility: nothing on plain pages until scroll, unless opted-in key.
  if (!showHome && !showBackTop && !showLlm) return null
  // Challenge / assistant board: keep the arena chrome-free (no settings/chat FABs).
  if (arenaMode) return null

  return (
    <div className="floating-nav" role="navigation" aria-label={t('app.floatingNav')}>
      {showHome ? (
        <Link
          to={homeTo}
          className="floating-nav-btn"
          title={homeLabel}
          aria-label={homeLabel}
        >
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
      {showBackTop ? (
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
      {showLlm ? (
        <button
          type="button"
          className={`floating-nav-btn${llmReady ? ' is-configured' : ''}`}
          onClick={() => requestOpenLlmSettings()}
          title={t('llm.openSettings')}
          aria-label={t('llm.openSettings')}
          aria-haspopup="dialog"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M7.2 14.4a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm0 0 3.4-3.4M14.5 7.8l1.7-1.7a2.1 2.1 0 0 1 3 3L17.5 11M12.8 13.2l4.6 4.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.65"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : null}
      {showLlm ? (
        <button
          type="button"
          className={`floating-nav-btn${llmReady ? ' is-configured' : ''}`}
          onClick={() => requestOpenPageChat()}
          title={t('llm.openChat')}
          aria-label={t('llm.openChat')}
          aria-haspopup="dialog"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5.2 6.4h13.6a1.4 1.4 0 0 1 1.4 1.4v7.2a1.4 1.4 0 0 1-1.4 1.4H11l-3.6 3.2v-3.2H5.2a1.4 1.4 0 0 1-1.4-1.4V7.8a1.4 1.4 0 0 1 1.4-1.4Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.65"
              strokeLinejoin="round"
            />
            <path
              d="M8.2 10.2h7.6M8.2 13h5.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.65"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
