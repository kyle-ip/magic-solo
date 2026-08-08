import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getPlayerDeck,
  type PlayerDeckId,
} from '../../game/playerDecks'
import type { PlayerTemplate } from '../../game/types'
import { assetUrl } from '../../utils/assetUrl'

interface DeckRosterModalProps {
  deckId: PlayerDeckId
  zh: boolean
  onClose: () => void
  onSelect: (id: PlayerDeckId) => void
}

export function DeckRosterModal({
  deckId,
  zh,
  onClose,
  onSelect,
}: DeckRosterModalProps) {
  const { t } = useTranslation()
  const deck = getPlayerDeck(deckId)
  const [focusId, setFocusId] = useState(deck.roster[0]?.id ?? '')
  const focus: PlayerTemplate | undefined =
    deck.roster.find((c) => c.id === focusId) ?? deck.roster[0]

  useEffect(() => {
    setFocusId(getPlayerDeck(deckId).roster[0]?.id ?? '')
  }, [deckId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="prompt-backdrop" role="presentation" onClick={onClose}>
      <div
        className="prompt-shell deck-roster-shell"
        role="dialog"
        aria-modal="true"
        aria-label={zh ? deck.nameZh : deck.name}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="deck-roster-head">
          <div>
            <p className="eyebrow">{t('challenge.previewDeck')}</p>
            <h2>{zh ? deck.nameZh : deck.name}</h2>
            <p className="deck-roster-blurb">{zh ? deck.blurbZh : deck.blurb}</p>
          </div>
          <button type="button" className="btn ghost" onClick={onClose}>
            {t('deck.close')}
          </button>
        </header>

        <div className="deck-roster-layout">
          <div className="deck-roster-grid" role="listbox">
            {deck.roster.map((card) => {
              const selected = focus?.id === card.id
              return (
                <button
                  key={card.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`deck-roster-tile ${selected ? 'is-selected' : ''}`}
                  onClick={() => setFocusId(card.id)}
                >
                  <span className="deck-roster-tile-art">
                    <img src={assetUrl(card.image)} alt="" loading="lazy" />
                  </span>
                  <span className="deck-roster-tile-meta">
                    <strong>{zh ? card.nameZh : card.name}</strong>
                    <em>
                      {card.power}/{card.toughness} ·{' '}
                      {t('challenge.musterCost', { n: card.cost })}
                    </em>
                  </span>
                </button>
              )
            })}
          </div>

          {focus ? (
            <aside className="deck-roster-detail">
              <div className="deck-roster-art">
                <img src={assetUrl(focus.image)} alt="" />
              </div>
              <div className="deck-roster-detail-body">
                <h3>{zh ? focus.nameZh : focus.name}</h3>
                <p className="deck-roster-type">
                  {zh ? focus.typeLineZh : focus.typeLine}
                </p>
                <p className="deck-roster-stats">
                  {focus.power}/{focus.toughness} ·{' '}
                  {t('challenge.musterCost', { n: focus.cost })}
                </p>
                <p className="deck-roster-oracle">
                  {zh ? focus.oracleTextZh : focus.oracleText}
                </p>
              </div>
            </aside>
          ) : null}
        </div>

        <footer className="deck-roster-foot">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              onSelect(deckId)
              onClose()
            }}
          >
            {t('challenge.useDeck')}
          </button>
        </footer>
      </div>
    </div>
  )
}
