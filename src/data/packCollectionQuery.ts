import type { CollectedCard } from './packCollection'
import type { CardRarity, DrawnCard } from './randomCard'
import { displayName } from './randomCard'

export type CollectionColorFilter = 'all' | 'W' | 'U' | 'B' | 'R' | 'G' | 'C' | 'M'
export type CollectionRarityFilter = 'all' | CardRarity
export type CollectionSort =
  | 'newest'
  | 'oldest'
  | 'rarity'
  | 'name'
  | 'set'

const RARITY_RANK: Record<string, number> = {
  mythic: 5,
  special: 4,
  rare: 3,
  uncommon: 2,
  common: 1,
  bonus: 0,
}

function cardColors(card: DrawnCard): string[] {
  return Array.isArray(card.colors) ? card.colors : []
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ')
}

function matchesSearch(card: DrawnCard, query: string): boolean {
  const q = normalizeQuery(query)
  if (!q) return true
  const haystacks = [
    card.name,
    card.nameZh,
    card.typeLine,
    card.typeLineZh,
    card.setCode,
    card.setName,
    ...(card.otherFaces ?? []).flatMap((f) => [
      f.name,
      f.nameZh,
      f.typeLine,
      f.typeLineZh,
    ]),
  ]
  return haystacks.some((h) => h && h.toLowerCase().includes(q))
}

export function matchesColorFilter(
  card: DrawnCard,
  filter: CollectionColorFilter,
): boolean {
  if (filter === 'all') return true
  const colors = cardColors(card)
  if (filter === 'C') return colors.length === 0
  if (filter === 'M') return colors.length > 1
  return colors.length === 1 && colors[0] === filter
}

export function filterAndSortCollection(
  items: CollectedCard[],
  opts: {
    rarity: CollectionRarityFilter
    color: CollectionColorFilter
    setCode: string
    sort: CollectionSort
    lang?: string
    query?: string
  },
): CollectedCard[] {
  let out = items.filter((c) => {
    if (opts.rarity !== 'all' && c.rarity !== opts.rarity) return false
    if (!matchesColorFilter(c, opts.color)) return false
    if (opts.setCode && c.setCode.toUpperCase() !== opts.setCode.toUpperCase()) {
      return false
    }
    if (!matchesSearch(c, opts.query || '')) return false
    return true
  })

  const byName = (a: CollectedCard, b: CollectedCard) =>
    displayName(a, opts.lang).localeCompare(displayName(b, opts.lang), undefined, {
      sensitivity: 'base',
    })

  out = out.slice().sort((a, b) => {
    switch (opts.sort) {
      case 'oldest':
        return a.collectedAt.localeCompare(b.collectedAt)
      case 'rarity': {
        const d =
          (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0)
        return d !== 0 ? d : byName(a, b)
      }
      case 'name':
        return byName(a, b)
      case 'set': {
        const d = a.setCode.localeCompare(b.setCode)
        return d !== 0 ? d : byName(a, b)
      }
      case 'newest':
      default:
        return b.collectedAt.localeCompare(a.collectedAt)
    }
  })

  return out
}

export function uniqueSetCodes(items: CollectedCard[]): string[] {
  const set = new Set<string>()
  for (const c of items) {
    if (c.setCode) set.add(c.setCode.toUpperCase())
  }
  return [...set].sort()
}
