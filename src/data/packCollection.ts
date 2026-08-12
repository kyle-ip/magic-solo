import type { DrawnCard } from './randomCard'
import { defaultCardBackUrl } from './randomCard'

const STORAGE_KEY = 'magic-solo:pack-collection'

export interface CollectedCard extends DrawnCard {
  collectedAt: string
}

function normalizeCard(raw: Partial<DrawnCard> & { id?: string }): DrawnCard | null {
  if (!raw?.id || !raw.name) return null
  return {
    id: raw.id,
    name: raw.name,
    typeLine: raw.typeLine || '',
    oracleText: raw.oracleText || '',
    power: raw.power ?? null,
    toughness: raw.toughness ?? null,
    manaCost: raw.manaCost || '',
    rarity: raw.rarity || 'common',
    setCode: raw.setCode || '',
    setName: raw.setName || '',
    collectorNumber: raw.collectorNumber || '',
    artist: raw.artist || '',
    scryfallUri: raw.scryfallUri || '',
    frontImageUrl: raw.frontImageUrl || '',
    backImageUrl: raw.backImageUrl || defaultCardBackUrl(),
    source: raw.source === 'local' ? 'local' : 'scryfall',
    oracleId: raw.oracleId || '',
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    flavorText: raw.flavorText || '',
    ...(raw.nameZh ? { nameZh: raw.nameZh } : {}),
    ...(raw.typeLineZh ? { typeLineZh: raw.typeLineZh } : {}),
    ...(raw.oracleTextZh ? { oracleTextZh: raw.oracleTextZh } : {}),
    ...(raw.flavorTextZh ? { flavorTextZh: raw.flavorTextZh } : {}),
  }
}

function readRaw(): CollectedCard[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<Partial<CollectedCard>>
    if (!Array.isArray(parsed)) return []
    const out: CollectedCard[] = []
    for (const row of parsed) {
      const card = normalizeCard(row)
      if (!card || !card.frontImageUrl) continue
      out.push({
        ...card,
        collectedAt:
          typeof row.collectedAt === 'string'
            ? row.collectedAt
            : new Date(0).toISOString(),
      })
    }
    return out
  } catch {
    return []
  }
}

function writeRaw(items: CollectedCard[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* quota / private mode */
  }
}

export function listCollected(): CollectedCard[] {
  return readRaw().slice().sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
}

export function isCollected(id: string): boolean {
  return readRaw().some((c) => c.id === id)
}

export function addCollected(card: DrawnCard): CollectedCard[] {
  const existing = readRaw()
  if (existing.some((c) => c.id === card.id)) return listCollected()
  const next: CollectedCard[] = [
    { ...card, collectedAt: new Date().toISOString() },
    ...existing,
  ]
  writeRaw(next)
  return listCollected()
}

export function removeCollected(id: string): CollectedCard[] {
  const next = readRaw().filter((c) => c.id !== id)
  writeRaw(next)
  return listCollected()
}

export function toggleCollected(card: DrawnCard): { collected: boolean; items: CollectedCard[] } {
  if (isCollected(card.id)) {
    return { collected: false, items: removeCollected(card.id) }
  }
  return { collected: true, items: addCollected(card) }
}
