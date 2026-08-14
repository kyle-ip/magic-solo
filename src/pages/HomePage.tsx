import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDeckIndex, getSharedRules } from '../data/deckRegistry'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import { CardImage, useResolvedCardImageUrl } from '../hooks/useCardImageSrc'
import { assetUrl } from '../utils/assetUrl'

function PathArtBg({ art }: { art: string | null | undefined }) {
  const url = useResolvedCardImageUrl(art, { kind: 'art_crop' })
  if (!art) return <div className="path-bg" aria-hidden="true" />
  return (
    <div
      className="path-bg"
      style={{ backgroundImage: `url(${url})` }}
      aria-hidden="true"
    />
  )
}

/** Index heroArt is `…-art.jpg`; gallery thumb uses the matching front face. */
function heroFrontFromArt(art: string | null | undefined): string | undefined {
  if (!art) return undefined
  return art.replace(/-art\.(jpe?g|webp|png)$/i, '-front.png')
}

export function HomePage() {
  const { t, i18n } = useTranslation()
  const decks = getDeckIndex()
  const shared = getSharedRules(i18n.language)
  const metaTable = i18n.language.startsWith('zh') ? deckMetaZh : deckMetaEn

  const deckPreviews = decks.map((entry) => {
    const meta = metaTable[entry.code]
    const art = entry.heroArt
    const thumb = heroFrontFromArt(art) || entry.backImage
    return {
      ...entry,
      localizedName: meta?.name ?? entry.name,
      blurb: meta?.blurb ?? '',
      expansion: meta?.expansion ?? entry.setCode,
      thumb,
      art,
    }
  })

  return (
    <>
      <div className="home-atmosphere" aria-hidden="true">
        <div
          className="home-atmosphere-bg"
          style={{
            backgroundImage: `url(${assetUrl('assets/home/atmosphere.jpg')})`,
          }}
        />
        <div className="home-atmosphere-veil" />
      </div>
      <main className="page home-page">
        <section className="home-hero">
          <div className="home-hero-copy">
            <p className="eyebrow reveal">{t('home.eyebrow')}</p>
            <h1 className="reveal delay-1">{t('home.title')}</h1>
            <p className="lede reveal delay-2">{t('home.lead')}</p>
          </div>
          <div className="home-hero-art" aria-hidden="true">
            {deckPreviews.map((deck, i) => (
              <CardImage
                key={deck.code}
                className={`orbit-card orbit-${i}`}
                localPath={deck.thumb}
                kind="normal"
                alt=""
                fetchPriority={i === 0 ? 'high' : undefined}
              />
            ))}
          </div>
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
        </section>

        <section id="challenges" className="challenge-paths">
          {deckPreviews.map((deck, index) => (
            <Link
              key={deck.code}
              to={`/decks/${deck.code}`}
              className={`path-band theme-${deck.theme}`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <PathArtBg art={deck.art} />
              <div className="path-copy">
                <p className="eyebrow">
                  {t('deck.challenge', { n: deck.challengeNumber })} ·{' '}
                  {t('home.pathMeta', {
                    expansion: deck.expansion,
                  })}
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
              <CardImage
                className="path-thumb"
                localPath={deck.thumb}
                kind="normal"
                alt=""
                loading="lazy"
              />
            </Link>
          ))}
        </section>
      </main>
    </>
  )
}
