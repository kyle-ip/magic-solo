import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CardModal } from '../components/CardModal'
import { CardTile } from '../components/CardTile'
import { RulesPanel } from '../components/RulesPanel'
import { getDeck, getDeckRules } from '../data/deckRegistry'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import type { DeckCard } from '../types'
import { assetUrl } from '../utils/assetUrl'

export function DeckPage() {
  const { setCode = '' } = useParams()
  const { t, i18n } = useTranslation()
  const deck = getDeck(setCode)
  const rules = getDeckRules(setCode, i18n.language)
  const [selected, setSelected] = useState<DeckCard | null>(null)
  const metaTable = i18n.language.startsWith('zh') ? deckMetaZh : deckMetaEn
  const meta = metaTable[setCode]

  const hero = useMemo(
    () => deck?.cards.find((c) => c.images.artCrop === deck.heroArt) ?? deck?.cards[0],
    [deck],
  )

  if (!deck || !rules) {
    return <Navigate to="/" replace />
  }

  const heroFront = hero?.images.display || hero?.images.front

  return (
    <main className={`page deck-page theme-${deck.theme}`}>
      <div className="deck-atmosphere" aria-hidden="true">
        <div
          className="deck-atmosphere-bg"
          style={
            hero?.images.artCrop
              ? { backgroundImage: `url(${assetUrl(hero.images.artCrop)})` }
              : undefined
          }
        />
        <div className="deck-atmosphere-veil" />
      </div>

      <section className="deck-hero">
        <div className="deck-hero-inner">
          <div className="deck-hero-copy">
            <Link to="/" className="back-link">
              ← {t('app.backHome')}
            </Link>
            <p className="eyebrow reveal">
              {t('deck.challenge', { n: deck.challengeNumber })} ·{' '}
              {t('deck.setLine', {
                expansion: meta?.expansion ?? deck.setCode,
                code: deck.setCode,
              })}
            </p>
            <h1 className="reveal delay-1">{meta?.name ?? deck.name}</h1>
            <p className="lede reveal delay-2">{meta?.overview}</p>
            <div className="cta-row reveal delay-3">
              <Link className="btn primary" to={`/challenge/${deck.code}`}>
                {t('deck.startExperience')}
              </Link>
              <Link className="btn ghost" to={`/assistant/${deck.code}`}>
                {t('deck.startAssistant')}
              </Link>
            </div>
          </div>
          <div className="deck-hero-card reveal delay-2">
            <img src={assetUrl(heroFront)} alt={meta?.name ?? deck.name} />
          </div>
        </div>
      </section>

      <section id="rules" className="deck-section">
        <RulesPanel rules={rules} />
      </section>

      <section id="cards" className="deck-section">
        <header className="section-head">
          <p className="eyebrow">{t('deck.cards')}</p>
          <h2>
            {t('home.cardsLabel', {
              count: deck.totalUniqueCards,
              total: deck.totalDeckSize,
            })}
          </h2>
        </header>
        <div className="card-grid">
          {deck.cards.map((card, index) => (
            <CardTile
              key={card.id}
              card={card}
              setCode={deck.code}
              index={index}
              onOpen={setSelected}
            />
          ))}
        </div>
      </section>

      <CardModal
        card={selected}
        setCode={deck.setCode}
        onClose={() => setSelected(null)}
      />
    </main>
  )
}
