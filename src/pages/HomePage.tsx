import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDeck, getDeckIndex, getSharedRules } from '../data/deckRegistry'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import { assetUrl } from '../utils/assetUrl'

export function HomePage() {
  const { t, i18n } = useTranslation()
  const decks = getDeckIndex()
  const shared = getSharedRules(i18n.language)
  const metaTable = i18n.language.startsWith('zh') ? deckMetaZh : deckMetaEn

  const deckPreviews = decks.map((entry) => {
    const full = getDeck(entry.code)
    const heroCard =
      full?.cards.find((card) => card.images.artCrop === entry.heroArt) ?? full?.cards[0]
    const thumb = heroCard?.images.display || heroCard?.images.front || entry.backImage
    const art = heroCard?.images.artCrop || entry.heroArt
    return {
      ...entry,
      localizedName: metaTable[entry.code]?.name ?? entry.name,
      blurb: metaTable[entry.code]?.blurb ?? '',
      thumb,
      art,
    }
  })

  return (
    <main className="page home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow reveal">{t('home.eyebrow')}</p>
          <h1 className="reveal delay-1">{t('home.title')}</h1>
          <p className="lede reveal delay-2">{t('home.lead')}</p>
          <a className="btn primary reveal delay-3" href="#challenges">
            {t('home.cta')}
          </a>
        </div>
        <div className="home-hero-art" aria-hidden="true">
          {deckPreviews.map((deck, i) => (
            <img
              key={deck.code}
              className={`orbit-card orbit-${i}`}
              src={assetUrl(deck.thumb)}
              alt=""
            />
          ))}
        </div>
      </section>

      <section id="challenges" className="challenge-paths">
        {deckPreviews.map((deck, index) => (
          <Link
            key={deck.code}
            to={`/decks/${deck.code}`}
            className={`path-band theme-${deck.theme}`}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div
              className="path-bg"
              style={
                deck.art
                  ? { backgroundImage: `url(${assetUrl(deck.art)})` }
                  : undefined
              }
              aria-hidden="true"
            />
            <div className="path-copy">
              <p className="eyebrow">
                {t('deck.challenge', { n: deck.challengeNumber })} · {deck.setCode}
              </p>
              <h2>{deck.localizedName}</h2>
              <p>{deck.blurb}</p>
              <span className="path-meta">
                {t('home.cardsLabel', {
                  count: deck.totalUniqueCards,
                  total: deck.totalDeckSize,
                })}
              </span>
              <span className="btn ghost">{t('home.viewDeck')}</span>
            </div>
            <img className="path-thumb" src={assetUrl(deck.thumb)} alt="" />
          </Link>
        ))}
      </section>

      <section className="shared-rules">
        <div className="section-head">
          <p className="eyebrow">{t('home.sharedTitle')}</p>
          <h2>{shared.title}</h2>
          <p className="lede">{shared.summary}</p>
        </div>
        <ul className="stone-list">
          {shared.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <ul className="inline-sources">
          {shared.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
