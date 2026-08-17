import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DrawnCardModal } from '../components/DrawnCardModal'
import { PrintAssistantModal } from '../components/PrintAssistantModal'
import {
  artCropUrlFromDrawn,
  fetchAllSetCards,
  fetchSetCardsPage,
  getGallerySet,
  pickHeroCard,
  thumbUrlFromDrawn,
  withPngFace,
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
import {
  NlAiFilterChip,
  NlScryfallSearch,
} from '../components/NlScryfallSearch'
import { UiButton } from '../components/ui'
import { useHasLlmApiKey } from '../hooks/useLlmSettings'
import { printItemsFromDrawn } from '../print/printCards'
import { rarityFrameClass } from '../utils/rarityFrame'
import '../styles/deck.css'
import '../styles/sets.css'
import '../styles/rarityFrame.css'
import '../styles/cursors.css'

const GALLERY_RARITIES = ['mythic', 'rare', 'uncommon', 'common'] as const

export function SetGalleryPage() {
  const { code = '' } = useParams()
  const setCode = code.toLowerCase()
  const { t, i18n } = useTranslation()
  const hasLlmKey = useHasLlmApiKey()

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
  const [rarities, setRarities] = useState<Set<string>>(() => new Set())
  const [useAi, setUseAi] = useState(false)
  const onUseAiChange = useCallback((on: boolean) => setUseAi(on), [])
  const [printOpen, setPrintOpen] = useState(false)

  const toggleRarity = (value: string) => {
    setRarities((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

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
    setRarities(new Set())
    setUseAi(false)

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
      const png = withPngFace(card)
      setSelected(png)
      void preloadImage(png.frontImageUrl).catch(() => undefined)
      if (!wantsZh(i18n.language)) return
      const enriched = await enrichDrawnCardZh(card)
      const enrichedLarge = withPngFace(enriched)
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
  const heroLarge = hero ? withPngFace(hero).frontImageUrl : null

  useEffect(() => {
    if (!heroLarge) return
    void preloadImage(heroLarge).catch(() => undefined)
    if (heroArt) void preloadImage(heroArt).catch(() => undefined)
  }, [heroLarge, heroArt])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cards.filter((c) => {
      if (rarities.size > 0 && !rarities.has(c.rarity)) return false
      if (!q) return true
      const name = displayName(c, i18n.language).toLowerCase()
      return (
        name.includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.collectorNumber.toLowerCase().includes(q)
      )
    })
  }, [cards, query, rarities, i18n.language])

  const browseLarge = useMemo(
    () => filtered.map(withPngFace),
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
            <p className="section-meta">
              {setMeta
                ? t('sets.setLine', {
                    type: t(`sets.type.${setMeta.setType}`, {
                      defaultValue: setMeta.setType,
                    }),
                    code: setMeta.code.toUpperCase(),
                  })
                : setCode.toUpperCase()}
            </p>
            <p className="lede">
              {setMeta
                ? t('sets.overview', {
                    date: setMeta.releasedAt || '—',
                    count: setMeta.cardCount,
                  })
                : t('sets.loading')}
            </p>
            <div className="cta-row">
              <UiButton
                variant="ghost"
                disabled={!setMeta || loading}
                onClick={() => setPrintOpen(true)}
              >
                {t('printAssistant.open')}
              </UiButton>
            </div>
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

      <section id="cards" className="deck-section page-section">
        <header className="section-head page-section-head">
          <div>
            <h2 className="page-section-title">{t('sets.cards')}</h2>
            <p className="section-meta page-section-desc">
              {t('sets.cardsLabel', {
                shown: filtered.length,
                loaded: cards.length,
                total: totalCards || setMeta?.cardCount || 0,
              })}
            </p>
          </div>
        </header>

        <div
          className={`set-gallery-filters${useAi ? ' is-ai-search' : ''}`}
        >
          {hasLlmKey ? (
            <NlAiFilterChip
              active={useAi}
              onToggle={() => setUseAi((v) => !v)}
            />
          ) : null}
          <NlScryfallSearch
            mode="gallery-cards"
            setCode={setCode}
            value={query}
            onChange={setQuery}
            placeholder={t('sets.searchCardsPlaceholder')}
            label={t('sets.searchCards')}
            useAi={useAi}
            onUseAiChange={onUseAiChange}
          />
        </div>

        <div
          className="sets-type-filters set-gallery-rarity-filters"
          role="group"
          aria-label={t('sets.rarityFilter')}
        >
          <button
            type="button"
            className={`sets-type-chip${rarities.size === 0 ? ' is-active' : ''}`}
            aria-pressed={rarities.size === 0}
            onClick={() => setRarities(new Set())}
          >
            {t('sets.rarity.all')}
          </button>
          {GALLERY_RARITIES.map((r) => (
            <button
              key={r}
              type="button"
              className={`sets-type-chip${rarities.has(r) ? ' is-active' : ''}`}
              aria-pressed={rarities.has(r)}
              onClick={() => toggleRarity(r)}
            >
              {t(`sets.rarity.${r}`)}
            </button>
          ))}
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
              const large = withPngFace(card).frontImageUrl
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
                  aria-label={`${displayName(card, i18n.language)} · ${t(
                    `sets.rarity.${card.rarity}`,
                    { defaultValue: card.rarity },
                  )}`}
                >
                  <span
                    className={`card-tile-frame ${rarityFrameClass(card.rarity)}`}
                  >
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

      <PrintAssistantModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        sourceSlug={setCode || 'set'}
        cards={[]}
        resolveCards={async (signal) => {
          const all = await fetchAllSetCards(setCode, {
            searchUri: setMeta?.searchUri,
            signal,
          })
          return printItemsFromDrawn(all)
        }}
      />
    </main>
  )
}
