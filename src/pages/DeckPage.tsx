import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CardModal } from '../components/CardModal'
import { CardTile } from '../components/CardTile'
import { ChallengeSwitcher } from '../components/ChallengeSwitcher'
import { PrintAssistantModal } from '../components/PrintAssistantModal'
import { RulesPanel } from '../components/RulesPanel'
import { getDeckRules } from '../data/deckRegistry'
import { getDeck } from '../data/deckStore'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import { CardImage, useResolvedCardImageUrl } from '../hooks/useCardImageSrc'
import { printItemsFromDeckCards } from '../print/printCards'
import type { DeckCard } from '../types'
import '../styles/deck.css'

export function DeckPage() {
  const { setCode = '' } = useParams()
  const { t, i18n } = useTranslation()
  const deck = getDeck(setCode)
  const rules = getDeckRules(setCode, i18n.language)
  const [selected, setSelected] = useState<DeckCard | null>(null)
  const [printOpen, setPrintOpen] = useState(false)
  const metaTable = i18n.language.startsWith('zh') ? deckMetaZh : deckMetaEn
  const meta = metaTable[setCode]

  const hero = useMemo(
    () => deck?.cards.find((c) => c.images.artCrop === deck.heroArt) ?? deck?.cards[0],
    [deck],
  )

  const heroArtUrl = useResolvedCardImageUrl(hero?.images.artCrop, {
    id: hero?.id,
    kind: 'art_crop',
  })
  const heroFront = hero?.images.display || hero?.images.front

  if (!deck || !rules) {
    return <Navigate to="/" replace />
  }

  return (
    <main className={`page deck-page theme-${deck.theme}`}>
      <div className="deck-atmosphere" aria-hidden="true">
        <div
          className="deck-atmosphere-bg"
          style={
            hero?.images.artCrop
              ? { backgroundImage: `url(${heroArtUrl})` }
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
            <p className="eyebrow">
              {t('deck.challenge', { n: deck.challengeNumber })} ·{' '}
              {t('deck.setLine', {
                expansion: meta?.expansion ?? deck.setCode,
                code: deck.setCode,
              })}
            </p>
            <h1>{meta?.name ?? deck.name}</h1>
            <p className="lede">{meta?.overview}</p>
            <div className="cta-row">
              <Link className="btn primary" to={`/challenge/${deck.code}`}>
                {t('deck.startExperience')}
              </Link>
              <Link className="btn ghost" to={`/assistant/${deck.code}`}>
                {t('deck.startAssistant')}
              </Link>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setPrintOpen(true)}
              >
                {t('printAssistant.open')}
              </button>
            </div>
            <ChallengeSwitcher currentCode={deck.code} mode="deck" />
          </div>
          <div className="deck-hero-card">
            <CardImage
              localPath={heroFront}
              cardId={hero?.id}
              kind="large"
              alt={meta?.name ?? deck.name}
              fetchPriority="high"
            />
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
        cards={deck.cards}
        onSelect={setSelected}
        deckCode={deck.code}
        setCode={deck.setCode}
        onClose={() => setSelected(null)}
      />

      <PrintAssistantModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        sourceSlug={deck.code}
        cards={printItemsFromDeckCards(deck.cards)}
      />
    </main>
  )
}
