import { useMemo } from 'react'
import { useResolvedCardImageUrl } from '../hooks/useCardImageSrc'
import type { DeckData } from '../types'

type Props = {
  deck: Pick<DeckData, 'heroArt' | 'cards'>
}

/**
 * Shared hero-art atmosphere — identical on deck hubs and Challenge / Paper Play.
 */
export function DeckAtmosphere({ deck }: Props) {
  const hero = useMemo(
    () => deck.cards.find((c) => c.images.artCrop === deck.heroArt) ?? deck.cards[0],
    [deck],
  )
  const heroArtUrl = useResolvedCardImageUrl(hero?.images.artCrop, {
    id: hero?.id,
    kind: 'art_crop',
  })

  return (
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
  )
}
