import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DrawnCardModal } from '../components/DrawnCardModal'
import {
  artCropUrlFromDrawn,
  fetchSetCardsPage,
  getGallerySet,
  pickHeroCard,
  thumbUrlFromDrawn,
  withLargeFace,
  type GallerySet,
} from '../data/setApi'
import { localizedSetName } from '../data/locale/setNamesZh'
import {
  displayName,
  enrichDrawnCardZh,
  wantsZh,
  type DrawnCard,
} from '../data/randomCard'
import { preloadImage } from '../utils/imageCache'
import { NlScryfallSearch } from '../components/NlScryfallSearch'
import '../styles/deck.css'
import '../styles/sets.css'

export function SetGalleryPage() {
  const { code = '' } = useParams()
  const setCode = code.toLowerCase()
  const { t, i18n } = useTranslation()

  const [setMeta, setSetMeta] = useState<GallerySet | null | undefined>(
    undefined,
  )
  const [cards, setCards] = useState<DrawnCard[]>([])
  const [totalCards, setTotalCards] = useState(0)
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<DrawnCard | null>(null)
  const [query, setQuery] = useState('')
  const [rarity, setRarity] = useState<string>('all')

  useEffect(() => {
    let cancelled = false
    setSetMeta(undefined)
    setCards([])
    setNextPage(null)
    setHasMore(false)
    setTotalCards(0)
    setError(null)
    setLoading(true)
    setSelected(null)
    setQuery('')
    setRarity('all')

    void (async () => {
      try {
        const meta = await getGallerySet(setCode)
        if (cancelled) return
        if (!meta) {
          setSetMeta(null)
          setLoading(false)
          return
        }
        setSetMeta(meta)
        const page = await fetchSetCardsPage(meta.code, {
          searchUri: meta.searchUri,
        })
        if (cancelled) return
        setCards(page.cards)
        setHasMore(page.hasMore)
        setNextPage(page.nextPage)
        setTotalCards(page.totalCards)
        setLoading(false)
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [setCode])

  const loadMore = useCallback(async () => {
    if (!setMeta || !nextPage || loadingMore) return
    setLoadingMore(true)
    setError(null)
    try {
      const page = await fetchSetCardsPage(setMeta.code, { pageUrl: nextPage })
      setCards((prev) => {
        const seen = new Set(prev.map((c) => c.id))
        const merged = [...prev]
        for (const c of page.cards) {
          if (!seen.has(c.id)) merged.push(c)
        }
        return merged
      })
      setHasMore(page.hasMore)
      setNextPage(page.nextPage)
      setTotalCards(page.totalCards)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoadingMore(false)
    }
  }, [setMeta, nextPage, loadingMore])

  const openCard = useCallback(
    async (card: DrawnCard) => {
      const large = withLargeFace(card)
      setSelected(large)
      void preloadImage(large.frontImageUrl).catch(() => undefined)
      if (!wantsZh(i18n.language)) return
      const enriched = await enrichDrawnCardZh(card)
      const enrichedLarge = withLargeFace(enriched)
      setSelected((cur) =>
        cur && cur.id === enrichedLarge.id ? enrichedLarge : cur,
      )
      setCards((prev) =>
        prev.map((c) => (c.id === enriched.id ? enriched : c)),
      )
    },
    [i18n.language],
  )

  const hero = useMemo(() => pickHeroCard(cards), [cards])
  const heroArt = hero ? artCropUrlFromDrawn(hero) : null
  const heroLarge = hero ? withLargeFace(hero).frontImageUrl : null

  useEffect(() => {
    if (!heroLarge) return
    void preloadImage(heroLarge).catch(() => undefined)
    if (heroArt) void preloadImage(heroArt).catch(() => undefined)
  }, [heroLarge, heroArt])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cards.filter((c) => {
      if (rarity !== 'all' && c.rarity !== rarity) return false
      if (!q) return true
      const name = displayName(c, i18n.language).toLowerCase()
      return (
        name.includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.collectorNumber.toLowerCase().includes(q)
      )
    })
  }, [cards, query, rarity, i18n.language])

  const browseLarge = useMemo(
    () => filtered.map(withLargeFace),
    [filtered],
  )

  if (setMeta === null && !loading) {
    return <Navigate to="/sets" replace />
  }

  const title =
    setMeta != null
      ? localizedSetName(setMeta.code, setMeta.name, i18n.language)
      : setCode.toUpperCase()

  return (
    <main className={`page deck-page set-gallery-page theme-set`}>
      <div className="deck-atmosphere" aria-hidden="true">
        <div
          className="deck-atmosphere-bg"
          style={
            heroArt ? { backgroundImage: `url(${heroArt})` } : undefined
          }
        />
        <div className="deck-atmosphere-veil" />
      </div>

      <section className="deck-hero">
        <div className="deck-hero-inner">
          <div className="deck-hero-copy">
            <Link to="/sets" className="back-link">
              ← {t('sets.backToList')}
            </Link>
            <p className="eyebrow">
              {setMeta
                ? t('sets.setLine', {
                    type: t(`sets.type.${setMeta.setType}`, {
                      defaultValue: setMeta.setType,
                    }),
                    code: setMeta.code.toUpperCase(),
                  })
                : setCode.toUpperCase()}
            </p>
            {setMeta?.scryfallUri ? (
              <a
                className="set-title-link"
                href={setMeta.scryfallUri}
                target="_blank"
                rel="noreferrer"
                title={t('sets.openOnScryfall')}
              >
                <h1>{title}</h1>
              </a>
            ) : (
              <h1>{title}</h1>
            )}
            <p className="lede">
              {setMeta
                ? t('sets.overview', {
                    date: setMeta.releasedAt || '—',
                    count: setMeta.cardCount,
                  })
                : t('sets.loading')}
            </p>
          </div>
          <div className="deck-hero-card">
            {hero && heroLarge ? (
              <img
                src={heroLarge}
                alt={displayName(hero, i18n.language)}
                fetchPriority="high"
              />
            ) : setMeta?.iconSvgUri ? (
              <div className="set-gallery-hero-icon">
                <img src={setMeta.iconSvgUri} alt="" />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section id="cards" className="deck-section">
        <header className="section-head">
          <p className="eyebrow">{t('sets.cards')}</p>
          <h2>
            {t('sets.cardsLabel', {
              shown: filtered.length,
              loaded: cards.length,
              total: totalCards || setMeta?.cardCount || 0,
            })}
          </h2>
        </header>

        <div className="set-gallery-filters">
          <NlScryfallSearch
            mode="gallery-cards"
            setCode={setCode}
            value={query}
            onChange={setQuery}
            placeholder={t('sets.searchCardsPlaceholder')}
            label={t('sets.searchCards')}
          />
          <label className="set-gallery-rarity">
            <span className="visually-hidden">{t('sets.rarityFilter')}</span>
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
            >
              <option value="all">{t('sets.rarity.all')}</option>
              <option value="mythic">{t('sets.rarity.mythic')}</option>
              <option value="rare">{t('sets.rarity.rare')}</option>
              <option value="uncommon">{t('sets.rarity.uncommon')}</option>
              <option value="common">{t('sets.rarity.common')}</option>
            </select>
          </label>
        </div>

        {loading ? <p className="sets-status">{t('sets.loadingCards')}</p> : null}
        {error ? (
          <div className="sets-status sets-error">
            <p>{t('sets.error', { message: error })}</p>
          </div>
        ) : null}

        {!loading ? (
          <div className="card-grid">
            {filtered.map((card, index) => {
              const thumb = thumbUrlFromDrawn(card)
              const large = withLargeFace(card).frontImageUrl
              return (
                <button
                  key={card.id}
                  type="button"
                  className="card-tile"
                  style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                  onClick={() => void openCard(card)}
                  onPointerEnter={() => {
                    void preloadImage(large).catch(() => undefined)
                  }}
                >
                  <span className="card-tile-frame">
                    <img
                      src={thumb}
                      alt={displayName(card, i18n.language)}
                      width={146}
                      height={204}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className="card-tile-meta">
                    <strong>{displayName(card, i18n.language)}</strong>
                    <em>
                      {t('sets.collector', {
                        n: card.collectorNumber,
                        rarity: t(`sets.rarity.${card.rarity}`, {
                          defaultValue: card.rarity,
                        }),
                      })}
                    </em>
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}

        {!loading && hasMore ? (
          <div className="set-gallery-more">
            <button
              type="button"
              className="btn primary"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? t('sets.loadingMore') : t('sets.loadMore')}
            </button>
          </div>
        ) : null}
      </section>

      <DrawnCardModal
        card={selected}
        cards={browseLarge}
        onSelect={(c) => void openCard(c)}
        onClose={() => setSelected(null)}
      />
    </main>
  )
}
