import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocalizedCard } from '../hooks/useLocalizedCard'
import type { DeckCard } from '../types'
import { assetUrl } from '../utils/assetUrl'

interface CardModalProps {
  card: DeckCard | null
  setCode: string
  onClose: () => void
}

export function CardModal({ card, setCode, onClose }: CardModalProps) {
  if (!card) return null
  return <CardModalBody card={card} setCode={setCode} onClose={onClose} />
}

function CardModalBody({
  card,
  setCode,
  onClose,
}: {
  card: DeckCard
  setCode: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const [flipTurns, setFlipTurns] = useState(0)
  const localized = useLocalizedCard(setCode.toLowerCase(), card)

  useEffect(() => {
    setFlipTurns(0)
  }, [card.id])

  useEffect(() => {
    const front = assetUrl(card.images.display || card.images.front)
    const back = assetUrl(card.images.back)
    ;[front, back].forEach((src) => {
      const img = new Image()
      img.decoding = 'async'
      img.src = src
    })
  }, [card])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pt =
    card.power != null && card.toughness != null
      ? `${card.power}/${card.toughness}`
      : null

  const frontSrc = assetUrl(card.images.display || card.images.front)

  const flipOnce = () => {
    requestAnimationFrame(() => setFlipTurns((n) => n + 1))
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose}>
          {t('deck.close')}
        </button>

        <div className="card-flip">
          <div
            className="card-flip-inner"
            role="button"
            tabIndex={0}
            aria-label={t('deck.flip')}
            style={{ transform: `translate3d(0, 0, 0) rotateY(${flipTurns * 180}deg)` }}
            onClick={flipOnce}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                flipOnce()
              }
            }}
          >
            <span className="card-face front">
              <img src={frontSrc} alt={localized.name} draggable={false} />
            </span>
            <span className="card-face back">
              <img
                src={assetUrl(card.images.back)}
                alt={t('deck.backHint')}
                draggable={false}
              />
            </span>
          </div>
        </div>

        <div className="modal-copy">
          <p className="eyebrow">
            {t('deck.collector', {
              set: setCode.toUpperCase(),
              number: card.collectorNumber,
            })}
          </p>
          <h2 id={titleId}>{localized.name}</h2>
          <p className="type-line">{localized.typeLine}</p>
          {pt ? <p className="pt-line">{pt}</p> : null}
          <h3>{t('deck.oracle')}</h3>
          <p className="oracle-text">{localized.oracleText || '—'}</p>
          {card.artist ? (
            <p className="artist">{t('deck.artist', { name: card.artist })}</p>
          ) : null}
          <p className="qty">{t('deck.quantity', { n: card.quantity })}</p>
          <a href={card.scryfallUri} target="_blank" rel="noreferrer">
            Scryfall
          </a>
        </div>
      </div>
    </div>
  )
}
