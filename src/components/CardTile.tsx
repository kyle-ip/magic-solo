import { useTranslation } from 'react-i18next'
import { useLocalizedCard } from '../hooks/useLocalizedCard'
import type { DeckCard } from '../types'
import { assetUrl } from '../utils/assetUrl'

interface CardTileProps {
  card: DeckCard
  setCode: string
  onOpen: (card: DeckCard) => void
  index: number
}

export function CardTile({ card, setCode, onOpen, index }: CardTileProps) {
  const { t } = useTranslation()
  const localized = useLocalizedCard(setCode, card)

  return (
    <button
      type="button"
      className="card-tile"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      onClick={() => onOpen(card)}
    >
      <span className="card-tile-frame">
        <img
          src={assetUrl(card.images.display || card.images.front)}
          alt={localized.name}
          loading="lazy"
        />
      </span>
      <span className="card-tile-meta">
        <strong>{localized.name}</strong>
        <em>
          {t('deck.quantity', { n: card.quantity })} · #{card.collectorNumber}
        </em>
      </span>
    </button>
  )
}
