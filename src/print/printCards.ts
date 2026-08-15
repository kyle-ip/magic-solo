import {
  extractCardUuid,
  pngUrlFromFaceUrl,
  preferredAssetUrl,
  scryfallCardFaceUrl,
} from '../utils/remoteAsset'
import { assetUrl } from '../utils/assetUrl'
import type { DrawnCard } from '../data/randomCard'
import type { ClassicDeckListEntry, DeckCard } from '../types'

export interface PrintCardItem {
  id: string
  name: string
  /** Absolute or site-relative URL for the full card face (prefer Scryfall png). */
  imageUrl: string
}

/** Build print items from editor-exported face blobs / object URLs. */
export function printItemsFromEditorFaces(
  cards: Array<{ id: string; name: string; imageUrl: string }>,
): PrintCardItem[] {
  return cards
    .filter((c) => c.imageUrl)
    .map((c) => ({
      id: c.id,
      name: c.name,
      imageUrl: c.imageUrl,
    }))
}

/** Expand one face into N print slots (deck quantity / classic qty). */
export function expandPrintCopies(
  item: PrintCardItem,
  copies: number,
): PrintCardItem[] {
  const n = Math.max(1, Math.floor(Number.isFinite(copies) ? copies : 1))
  if (n === 1) return [item]
  return Array.from({ length: n }, (_, i) => ({
    ...item,
    id: `${item.id}#${i + 1}`,
  }))
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

/** Challenge catalog cards — expand each entry by `quantity`. */
export function printItemsFromDeckCards(cards: DeckCard[]): PrintCardItem[] {
  return cards.flatMap((card) => {
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
    if (!imageUrl) return []
    return expandPrintCopies(
      { id: card.id, name: card.name, imageUrl },
      card.quantity,
    )
  })
}

/**
 * Classic sample list (main + side) — expand each row by `qty`.
 * `resolved` is keyed by the list entry name.
 */
export function printItemsFromClassicList(
  rows: ClassicDeckListEntry[],
  resolved: Map<string, DrawnCard | null | undefined>,
): PrintCardItem[] {
  return rows.flatMap((row) => {
    const card = resolved.get(row.name)
    if (!card?.frontImageUrl) return []
    return expandPrintCopies(
      {
        id: card.id,
        name: card.name,
        imageUrl: pngUrlFromFaceUrl(card.frontImageUrl),
      },
      row.qty,
    )
  })
}
