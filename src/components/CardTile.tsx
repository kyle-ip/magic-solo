import { useTranslation } from 'react-i18next'
import { useLocalizedCard } from '../hooks/useLocalizedCard'
import { CardImage } from '../hooks/useCardImageSrc'
import type { DeckCard } from '../types'
import { preloadAssetCandidates } from '../utils/remoteAsset'

interface CardTileProps {
  card: DeckCard
  setCode: string
  onOpen: (card: DeckCard) => void
  index: number
}

export function CardTile({ card, setCode, onOpen, index }: CardTileProps) {
  const { t } = useTranslation()
  const localized = useLocalizedCard(setCode, card)
  const facePath = card.images.display || card.images.front

  const warmImages = () => {
    void preloadAssetCandidates(facePath, {
      id: card.id,
      kind: 'normal',
    }).catch(() => undefined)
    void preloadAssetCandidates(card.images.back, {
      id: card.id,
      kind: 'card_back',
    }).catch(() => undefined)
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
        <CardImage
          localPath={facePath}
          cardId={card.id}
          kind="normal"
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
