import type { DrawnCard, DrawnCardFace } from './randomCard'
import { defaultCardBackUrl } from './randomCard'

const STORAGE_KEY = 'magic-solo:pack-collection'
const EXPORT_VERSION = 1

export interface CollectedCard extends DrawnCard {
  collectedAt: string
}

export interface CollectionExport {
  version: number
  exportedAt: string
  cards: CollectedCard[]
}

export type CollectionRarityStats = {
  total: number
  mythic: number
  rare: number
  uncommon: number
  common: number
  other: number
}

function normalizeFace(raw: Partial<DrawnCardFace> | undefined): DrawnCardFace | null {
  if (!raw || (!raw.name && !raw.oracleText && !raw.typeLine)) return null
  return {
    name: raw.name || '',
    typeLine: raw.typeLine || '',
    oracleText: raw.oracleText || '',
    flavorText: raw.flavorText || '',
    manaCost: raw.manaCost || '',
    power: raw.power ?? null,
    toughness: raw.toughness ?? null,
    ...(raw.imageUrl ? { imageUrl: raw.imageUrl } : {}),
    ...(raw.nameZh ? { nameZh: raw.nameZh } : {}),
    ...(raw.typeLineZh ? { typeLineZh: raw.typeLineZh } : {}),
    ...(raw.oracleTextZh ? { oracleTextZh: raw.oracleTextZh } : {}),
    ...(raw.flavorTextZh ? { flavorTextZh: raw.flavorTextZh } : {}),
  }
}

function normalizeCard(raw: Partial<DrawnCard> & { id?: string }): DrawnCard | null {
  if (!raw?.id || !raw.name) return null
  const otherFaces = Array.isArray(raw.otherFaces)
    ? raw.otherFaces
        .map((f) => normalizeFace(f))
        .filter((f): f is DrawnCardFace => f != null)
    : []
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
    colors: Array.isArray(raw.colors) ? raw.colors : [],
    otherFaces,
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

/** Merge updated fields into an existing collection entry (keeps collectedAt). */
export function updateCollected(card: DrawnCard): CollectedCard[] {
  const existing = readRaw()
  let found = false
  const next = existing.map((row) => {
    if (row.id !== card.id) return row
    found = true
    return { ...card, collectedAt: row.collectedAt }
  })
  if (!found) return listCollected()
  writeRaw(next)
  return listCollected()
}

export function clearCollected(): CollectedCard[] {
  writeRaw([])
  return []
}

export function toggleCollected(card: DrawnCard): { collected: boolean; items: CollectedCard[] } {
  if (isCollected(card.id)) {
    return { collected: false, items: removeCollected(card.id) }
  }
  return { collected: true, items: addCollected(card) }
}

export function collectionRarityStats(items: CollectedCard[]): CollectionRarityStats {
  const stats: CollectionRarityStats = {
    total: items.length,
    mythic: 0,
    rare: 0,
    uncommon: 0,
    common: 0,
    other: 0,
  }
  for (const c of items) {
    if (c.rarity === 'mythic' || c.rarity === 'special') stats.mythic += 1
    else if (c.rarity === 'rare') stats.rare += 1
    else if (c.rarity === 'uncommon') stats.uncommon += 1
    else if (c.rarity === 'common') stats.common += 1
    else stats.other += 1
  }
  return stats
}

export function exportCollection(): CollectionExport {
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    cards: listCollected(),
  }
}

export function exportCollectionJson(): string {
  return `${JSON.stringify(exportCollection(), null, 2)}\n`
}

export type ImportCollectionResult =
  | { ok: true; items: CollectedCard[]; added: number; updated: number }
  | { ok: false; error: 'invalid' | 'empty' }

export function importCollectionJson(raw: string): ImportCollectionResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'invalid' }
  }

  let rows: Array<Partial<CollectedCard>> = []
  if (Array.isArray(parsed)) {
    rows = parsed as Array<Partial<CollectedCard>>
  } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as CollectionExport).cards)) {
    rows = (parsed as CollectionExport).cards
  } else {
    return { ok: false, error: 'invalid' }
  }

  const incoming: CollectedCard[] = []
  for (const row of rows) {
    const card = normalizeCard(row)
    if (!card || !card.frontImageUrl) continue
    incoming.push({
      ...card,
      collectedAt:
        typeof row.collectedAt === 'string'
          ? row.collectedAt
          : new Date().toISOString(),
    })
  }
  if (incoming.length === 0) return { ok: false, error: 'empty' }

  const byId = new Map(readRaw().map((c) => [c.id, c]))
  let added = 0
  let updated = 0
  for (const card of incoming) {
    const prev = byId.get(card.id)
    if (prev) {
      byId.set(card.id, {
        ...card,
        collectedAt: prev.collectedAt,
      })
      updated += 1
    } else {
      byId.set(card.id, card)
      added += 1
    }
  }
  const next = [...byId.values()].sort((a, b) =>
    b.collectedAt.localeCompare(a.collectedAt),
  )
  writeRaw(next)
  return { ok: true, items: listCollected(), added, updated }
}
