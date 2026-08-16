import {
  extractCardUuid,
  pngUrlFromFaceUrl,
  preferredAssetUrl,
  scryfallCardFaceUrl,
} from '../utils/remoteAsset'
import { assetUrl } from '../utils/assetUrl'
import type { DrawnCard } from '../data/randomCard'
import type { ClassicDeckListEntry, DeckCard } from '../types'

/** One printable face after quantity expansion (one slot on the sheet). */
export interface PrintCardItem {
  id: string
  name: string
  /** Absolute or site-relative URL for the print face (prefer Scryfall png). */
  imageUrl: string
}

/** Editable list row before quantity expansion. */
export interface PrintListEntry {
  id: string
  name: string
  imageUrl: string
  quantity: number
}

/** Build print entries from editor-exported face blobs / object URLs. */
export function printItemsFromEditorFaces(
  cards: Array<{ id: string; name: string; imageUrl: string; quantity?: number }>,
): PrintListEntry[] {
  return cards
    .filter((c) => c.imageUrl)
    .map((c) => ({
      id: c.id,
      name: c.name,
      imageUrl: c.imageUrl,
      quantity: Math.max(1, Math.floor(c.quantity ?? 1)),
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

/** Expand editable list rows into flat print slots (qty ≤ 0 skipped). */
export function expandPrintList(entries: PrintListEntry[]): PrintCardItem[] {
  return entries.flatMap((entry) => {
    const n = Math.floor(Number.isFinite(entry.quantity) ? entry.quantity : 0)
    if (n <= 0 || !entry.imageUrl) return []
    return expandPrintCopies(
      { id: entry.id, name: entry.name, imageUrl: entry.imageUrl },
      n,
    )
  })
}

export function printItemsFromDrawn(
  cards: Array<Pick<DrawnCard, 'id' | 'name' | 'frontImageUrl'>>,
): PrintListEntry[] {
  return cards
    .filter((c) => c.frontImageUrl)
    .map((c) => ({
      id: c.id,
      name: c.name,
      imageUrl: pngUrlFromFaceUrl(c.frontImageUrl),
      quantity: 1,
    }))
}

/** Challenge catalog cards — keep each entry’s `quantity`. */
export function printItemsFromDeckCards(cards: DeckCard[]): PrintListEntry[] {
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
    return [
      {
        id: card.id,
        name: card.name,
        imageUrl,
        quantity: Math.max(1, Math.floor(card.quantity || 1)),
      },
    ]
  })
}

/**
 * Classic sample list (main + side) — keep each row’s `qty`.
 * `resolved` is keyed by the list entry name.
 */
export function printItemsFromClassicList(
  rows: ClassicDeckListEntry[],
  resolved: Map<string, DrawnCard | null | undefined>,
): PrintListEntry[] {
  return rows.flatMap((row) => {
    const card = resolved.get(row.name)
    if (!card?.frontImageUrl) return []
    return [
      {
        id: card.id,
        name: card.name,
        imageUrl: pngUrlFromFaceUrl(card.frontImageUrl),
        quantity: Math.max(1, Math.floor(row.qty || 1)),
      },
    ]
  })
}
