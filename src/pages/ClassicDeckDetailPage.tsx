import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DrawnCardModal } from '../components/DrawnCardModal'
import { CardFaceButton } from '../components/CardFaceButton'
import {
  getClassicDeck,
  getClassicDeckLocalizedName,
  getClassicDeckText,
  loadClassicDeck,
} from '../data/classicDeckRegistry'
import {
  displayName,
  type DrawnCard,
} from '../data/randomCard'
import { resolveCardsByNameProgressive } from '../data/resolveClassicCards'
import type { ClassicDeckListEntry } from '../types'
import '../styles/classic.css'

export function ClassicDeckDetailPage() {
  const { id = '' } = useParams()
  const { t, i18n } = useTranslation()
  const [deck, setDeck] = useState(() => getClassicDeck(id))
  const [deckReady, setDeckReady] = useState(() => !!getClassicDeck(id))

  const [resolved, setResolved] = useState<Map<string, DrawnCard | null>>(
    () => new Map(),
  )
  const [loading, setLoading] = useState(true)
  const [inspect, setInspect] = useState<DrawnCard | null>(null)
  const [flipKey, setFlipKey] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    setDeckReady(!!getClassicDeck(id))
    setDeck(getClassicDeck(id))
    void loadClassicDeck(id).then((loaded) => {
      if (cancelled) return
      setDeck(loaded)
      setDeckReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  const allNames = useMemo(() => {
    if (!deck) return [] as string[]
    const names = [
      ...deck.keyCards,
      deck.coverCard,
      ...deck.sampleList.map((row) => row.name),
    ]
    return [...new Set(names)]
  }, [deck])

  const browseCards = useMemo(() => {
    if (!deck) return [] as DrawnCard[]
    const list: DrawnCard[] = []
    const seen = new Set<string>()
    for (const row of deck.sampleList) {
      const card = resolved.get(row.name)
      if (card && !seen.has(card.id)) {
        seen.add(card.id)
        list.push(card)
      }
    }
    return list
  }, [deck, resolved])

  useEffect(() => {
    if (!deck) return
    let cancelled = false
    setLoading(true)
    void resolveCardsByNameProgressive(allNames, {
      enrichZh: i18n.language.startsWith('zh'),
      onProgress: ({ cards }) => {
        if (cancelled) return
        setResolved(new Map(cards))
        setLoading(false)
      },
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [allNames, deck, i18n.language])

  if (!deckReady) {
    return null
  }

  if (!deck) {
    return <Navigate to="/classic-decks" replace />
  }

  const title = getClassicDeckLocalizedName(deck, i18n.language)
  const summary = getClassicDeckText(deck.summary, i18n.language)
  const howItWins = getClassicDeckText(deck.howItWins, i18n.language)
  const keySet = new Set(deck.keyCards.map((n) => n.toLowerCase()))

  const mainboard = deck.sampleList.filter((r) => r.board === 'main')
  const sideboard = deck.sampleList.filter((r) => r.board === 'side')

  const openCard = (name: string) => {
    const card = resolved.get(name)
    if (card) setInspect(card)
  }

  const flipThumb = (cardId: string) => {
    setFlipKey((prev) => ({ ...prev, [cardId]: (prev[cardId] ?? 0) + 1 }))
  }

  const qtyFor = (card: DrawnCard | null) => {
    if (!card || !deck) return undefined
    const rows = deck.sampleList.filter(
      (r) =>
        r.name.toLowerCase() === card.name.toLowerCase() ||
        resolved.get(r.name)?.id === card.id,
    )
    if (rows.length === 0) return undefined
    return rows.reduce((sum, r) => sum + r.qty, 0)
  }

  const scryfallSearchUrl = deck.links?.scryfallQuery
    ? `https://scryfall.com/search?q=${encodeURIComponent(deck.links.scryfallQuery)}`
    : null

  return (
    <main className="page classic-deck-detail-page">
      <nav className="classic-detail-nav">
        <Link to="/classic-decks" className="references-text-btn">
          {t('classicDecks.backToList')}
        </Link>
      </nav>

      <header className="classic-detail-hero">
        <p className="eyebrow">
          {t(`classicDecks.format.${deck.format}`)} ·{' '}
          {t(`classicDecks.playstyle.${deck.playstyle}`)} · {deck.era}
        </p>
        <h1>{title}</h1>
        <p className="lede">{summary}</p>
      </header>

      <section className="classic-detail-section">
        <h2>{t('classicDecks.howItWins')}</h2>
        <p>{howItWins}</p>
      </section>

      <section className="classic-detail-section classic-detail-gallery-section">
        <h2>{t('classicDecks.fullList')}</h2>
        {loading ? (
          <p className="classic-loading">{t('classicDecks.loadingCards')}</p>
        ) : null}

        <CardGallery
          title={t('classicDecks.mainboard')}
          rows={mainboard}
          resolved={resolved}
          lang={i18n.language}
          keySet={keySet}
          flipKey={flipKey}
          keyBadge={t('classicDecks.keyBadge')}
          unresolvedLabel={t('classicDecks.unresolved')}
          onFlip={flipThumb}
          onOpen={openCard}
        />
        <CardGallery
          title={t('classicDecks.sideboard')}
          rows={sideboard}
          resolved={resolved}
          lang={i18n.language}
          keySet={keySet}
          flipKey={flipKey}
          keyBadge={t('classicDecks.keyBadge')}
          unresolvedLabel={t('classicDecks.unresolved')}
          onFlip={flipThumb}
          onOpen={openCard}
        />
      </section>

      {(deck.links?.wiki || scryfallSearchUrl) && (
        <section className="classic-detail-section classic-detail-links">
          <h2>{t('classicDecks.links')}</h2>
          <ul>
            {deck.links?.wiki ? (
              <li>
                <a href={deck.links.wiki} target="_blank" rel="noreferrer">
                  {t('classicDecks.wiki')}
                </a>
              </li>
            ) : null}
            {scryfallSearchUrl ? (
              <li>
                <a href={scryfallSearchUrl} target="_blank" rel="noreferrer">
                  {t('classicDecks.scryfallSearch')}
                </a>
              </li>
            ) : null}
          </ul>
        </section>
      )}

      <DrawnCardModal
        card={inspect}
        cards={browseCards}
        quantity={qtyFor(inspect)}
        onSelect={setInspect}
        onClose={() => setInspect(null)}
      />
    </main>
  )
}

function CardGallery({
  title,
  rows,
  resolved,
  lang,
  keySet,
  flipKey,
  keyBadge,
  unresolvedLabel,
  onFlip,
  onOpen,
}: {
  title: string
  rows: ClassicDeckListEntry[]
  resolved: Map<string, DrawnCard | null>
  lang: string
  keySet: Set<string>
  flipKey: Record<string, number>
  keyBadge: string
  unresolvedLabel: string
  onFlip: (cardId: string) => void
  onOpen: (name: string) => void
}) {
  if (rows.length === 0) return null

  return (
    <div className="classic-card-gallery">
      <h3>{title}</h3>
      <ul className="classic-key-cards classic-full-cards">
        {rows.map((row) => {
          const card = resolved.get(row.name) ?? null
          const isKey = keySet.has(row.name.toLowerCase())
          if (!card) {
            return (
              <li
                key={`${row.board}-${row.name}`}
                className="classic-key-card is-pending"
              >
                <div className="classic-key-card-placeholder">
                  <span>{row.name}</span>
                </div>
                <div className="classic-key-card-meta">
                  <span className="classic-card-qty-badge">{row.qty}</span>
                  {isKey ? (
                    <span className="classic-key-badge">{keyBadge}</span>
                  ) : null}
                  <span className="classic-key-card-name" title={unresolvedLabel}>
                    {row.name}
                  </span>
                </div>
              </li>
            )
          }
          const turns = flipKey[card.id] ?? 0
          const label = displayName(card, lang)
          return (
            <li
              key={`${row.board}-${row.name}`}
              className={`classic-key-card${isKey ? ' is-key' : ''}`}
            >
              <div className="card-flip classic-key-flip">
                <CardFaceButton
                  className="card-flip-inner"
                  ariaLabel={label}
                  style={{
                    transform: `translate3d(0, 0, 0) rotateY(${turns * 180}deg)`,
                  }}
                  onFlip={() => onFlip(card.id)}
                  onToggleZoom={() => onOpen(row.name)}
                >
                  <span className="card-face front">
                    <img
                      src={card.frontImageUrl}
                      alt={label}
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="card-face back">
                    <img
                      src={card.backImageUrl}
                      alt=""
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                </CardFaceButton>
              </div>
              <div className="classic-key-card-meta">
                <span className="classic-card-qty-badge">{row.qty}</span>
                {isKey ? (
                  <span className="classic-key-badge">{keyBadge}</span>
                ) : null}
                <button
                  type="button"
                  className="classic-key-card-name"
                  onClick={() => onOpen(row.name)}
                >
                  {label}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
