import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DrawnCardModal } from '../components/DrawnCardModal'
import { PrintAssistantModal } from '../components/PrintAssistantModal'
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
import { ClassicDeckLlmAssist } from '../components/ClassicDeckLlmAssist'
import { printItemsFromClassicList } from '../print/printCards'
import { preloadImage } from '../utils/imageCache'
import {
  thumbUrlFromFaceUrl,
  withLargeFace,
} from '../utils/remoteAsset'
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
  const [printOpen, setPrintOpen] = useState(false)

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
        list.push(withLargeFace(card))
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
    if (!card) return
    const large = withLargeFace(card)
    setInspect(large)
    void preloadImage(large.frontImageUrl).catch(() => undefined)
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
        {scryfallSearchUrl ? (
          <a
            className="classic-title-link"
            href={scryfallSearchUrl}
            target="_blank"
            rel="noreferrer"
            title={t('classicDecks.openOnScryfall')}
          >
            <h1>{title}</h1>
          </a>
        ) : (
          <h1>{title}</h1>
        )}
        <p className="lede">{summary}</p>
        <div className="cta-row">
          <button
            type="button"
            className="btn ghost"
            disabled={loading || deck.sampleList.length === 0}
            onClick={() => setPrintOpen(true)}
          >
            {t('printAssistant.open')}
          </button>
        </div>
      </header>

      <section className="classic-detail-section">
        <h2>{t('classicDecks.howItWins')}</h2>
        <p>{howItWins}</p>
        <ClassicDeckLlmAssist deck={deck} />
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
          keyBadge={t('classicDecks.keyBadge')}
          unresolvedLabel={t('classicDecks.unresolved')}
          onOpen={openCard}
        />
        <CardGallery
          title={t('classicDecks.sideboard')}
          rows={sideboard}
          resolved={resolved}
          lang={i18n.language}
          keySet={keySet}
          keyBadge={t('classicDecks.keyBadge')}
          unresolvedLabel={t('classicDecks.unresolved')}
          onOpen={openCard}
        />
      </section>

      {deck.links?.wiki ? (
        <section className="classic-detail-section classic-detail-links">
          <h2>{t('classicDecks.links')}</h2>
          <ul>
            <li>
              <a href={deck.links.wiki} target="_blank" rel="noreferrer">
                {t('classicDecks.wiki')}
              </a>
            </li>
          </ul>
        </section>
      ) : null}

      <DrawnCardModal
        card={inspect}
        cards={browseCards}
        quantity={qtyFor(inspect)}
        onSelect={setInspect}
        onClose={() => setInspect(null)}
      />

      <PrintAssistantModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        sourceSlug={deck.id}
        cards={printItemsFromClassicList(deck.sampleList, resolved)}
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
  keyBadge,
  unresolvedLabel,
  onOpen,
}: {
  title: string
  rows: ClassicDeckListEntry[]
  resolved: Map<string, DrawnCard | null>
  lang: string
  keySet: Set<string>
  keyBadge: string
  unresolvedLabel: string
  onOpen: (name: string) => void
}) {
  if (rows.length === 0) return null

  return (
    <div className="classic-card-gallery">
      <h3>{title}</h3>
      <ul className="classic-key-cards classic-full-cards">
        {rows.map((row, index) => {
          const card = resolved.get(row.name) ?? null
          const isKey = keySet.has(row.name.toLowerCase())
          const rowKey = `${row.board}-${row.name}-${index}`
          if (!card) {
            return (
              <li
                key={rowKey}
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
          const label = displayName(card, lang)
          const thumb = thumbUrlFromFaceUrl(card.frontImageUrl)
          return (
            <li
              key={rowKey}
              className={`classic-key-card${isKey ? ' is-key' : ''}`}
            >
              <button
                type="button"
                className="classic-key-thumb"
                onClick={() => onOpen(row.name)}
                onPointerEnter={() => {
                  void preloadImage(withLargeFace(card).frontImageUrl).catch(
                    () => undefined,
                  )
                }}
                aria-label={label}
              >
                <img
                  src={thumb}
                  alt={label}
                  width={146}
                  height={204}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </button>
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
