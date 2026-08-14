import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  getClassicDeck,
  getClassicDeckIndex,
  getClassicDeckLocalizedName,
  getClassicDeckText,
  loadAllClassicDecks,
} from '../data/classicDeckRegistry'
import type { ClassicFormat } from '../types'
import '../styles/classic.css'

const FORMATS: Array<ClassicFormat | 'all'> = [
  'all',
  'modern',
  'legacy',
  'pioneer',
  'pauper',
  'vintage',
  'standard-classic',
]

function ColorDots({ colors }: { colors: string[] }) {
  if (colors.length === 0 || (colors.length === 1 && colors[0] === 'C')) {
    return <span className="classic-color-dot is-colorless" title="Colorless" />
  }
  return (
    <span className="classic-color-dots" aria-hidden="true">
      {colors.map((c) => (
        <span key={c} className={`classic-color-dot is-${c}`} />
      ))}
    </span>
  )
}

export function ClassicDecksPage() {
  const { t, i18n } = useTranslation()
  const [format, setFormat] = useState<ClassicFormat | 'all'>('all')
  const index = getClassicDeckIndex()
  const [ready, setReady] = useState(() =>
    index.every((e) => !!getClassicDeck(e.id)),
  )

  useEffect(() => {
    let cancelled = false
    void loadAllClassicDecks().then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const decks = useMemo(() => {
    const rows = index.map((entry) => {
      const full = getClassicDeck(entry.id)
      return {
        ...entry,
        summary: full
          ? getClassicDeckText(full.summary, i18n.language)
          : '',
      }
    })
    if (format === 'all') return rows
    return rows.filter((d) => d.format === format)
  }, [format, i18n.language, index, ready])

  return (
    <main className="page classic-decks-page">
      <header className="classic-decks-hero">
        <p className="eyebrow">{t('classicDecks.eyebrow')}</p>
        <h1>{t('classicDecks.title')}</h1>
        <p className="lede">{t('classicDecks.lead')}</p>
      </header>

      <div
        className="classic-format-filters"
        role="tablist"
        aria-label={t('classicDecks.filterLabel')}
      >
        {FORMATS.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={format === f}
            className={`classic-format-chip${format === f ? ' is-active' : ''}`}
            onClick={() => setFormat(f)}
          >
            {t(`classicDecks.format.${f}`)}
          </button>
        ))}
      </div>

      {decks.length === 0 ? (
        <p className="classic-empty">{t('classicDecks.empty')}</p>
      ) : (
        <ul className="classic-deck-grid">
          {decks.map((deck) => (
            <li key={deck.id}>
              <Link
                to={`/classic-decks/${deck.id}`}
                className="classic-deck-card"
              >
                <div className="classic-deck-card-top">
                  <ColorDots colors={deck.colors} />
                  <span className="classic-deck-meta">
                    {t(`classicDecks.format.${deck.format}`)} ·{' '}
                    {t(`classicDecks.playstyle.${deck.playstyle}`)}
                  </span>
                </div>
                <h2>{getClassicDeckLocalizedName(deck, i18n.language)}</h2>
                <p className="classic-deck-era">{deck.era}</p>
                <p className="classic-deck-summary">{deck.summary}</p>
                <span className="classic-deck-cta">
                  {t('classicDecks.viewDeck')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

    </main>
  )
}
