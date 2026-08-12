import { useTranslation } from 'react-i18next'
import { useLocalizedCard } from '../hooks/useLocalizedCard'
import type { DeckCard } from '../types'
import { assetUrl } from '../utils/assetUrl'
import { preloadImage } from '../utils/imageCache'

interface CardTileProps {
  card: DeckCard
  setCode: string
  onOpen: (card: DeckCard) => void
  index: number
}

export function CardTile({ card, setCode, onOpen, index }: CardTileProps) {
  const { t } = useTranslation()
  const localized = useLocalizedCard(setCode, card)
  const displaySrc = assetUrl(card.images.display || card.images.front)
  const backSrc = assetUrl(card.images.back)

  const warmImages = () => {
    void preloadImage(displaySrc).catch(() => undefined)
    void preloadImage(backSrc).catch(() => undefined)
  }

  return (
    <button
      type="button"
      className="card-tile"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      onClick={() => onOpen(card)}
      onPointerEnter={warmImages}
      onFocus={warmImages}
    >
      <span className="card-tile-frame">
        <img
          src={displaySrc}
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
