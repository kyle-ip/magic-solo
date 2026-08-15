import {
  extractCardUuid,
  pngUrlFromFaceUrl,
  preferredAssetUrl,
  scryfallCardFaceUrl,
} from '../utils/remoteAsset'
import { assetUrl } from '../utils/assetUrl'
import type { DrawnCard } from '../data/randomCard'
import type { DeckCard } from '../types'

export interface PrintCardItem {
  id: string
  name: string
  /** Absolute or site-relative URL for the full card face (prefer Scryfall png). */
  imageUrl: string
}

export function printItemsFromDrawn(
  cards: Array<Pick<DrawnCard, 'id' | 'name' | 'frontImageUrl'>>,
): PrintCardItem[] {
  return cards
    .filter((c) => c.frontImageUrl)
    .map((c) => ({
      id: c.id,
      name: c.name,
      imageUrl: pngUrlFromFaceUrl(c.frontImageUrl),
    }))
}

export function printItemsFromDeckCards(cards: DeckCard[]): PrintCardItem[] {
  return cards.map((card) => {
    const local = card.images.display || card.images.front
    const uuid = extractCardUuid(card.id) || extractCardUuid(local)
    let imageUrl: string
    if (uuid) {
      imageUrl = scryfallCardFaceUrl(uuid, 'png')
    } else if (local) {
      imageUrl = preferredAssetUrl(local, { id: card.id, kind: 'large' })
      if (!/^https?:\/\//i.test(imageUrl)) {
        imageUrl = assetUrl(local)
      }
    } else {
      imageUrl = ''
    }
    return {
      id: card.id,
      name: card.name,
      imageUrl,
    }
  }).filter((c) => c.imageUrl)
}
