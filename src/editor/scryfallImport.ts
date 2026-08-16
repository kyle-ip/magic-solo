import {
  drawnFromScryfall,
  enrichDrawnCardZh,
  enqueueScryfall,
  fetchWithTimeout,
  type DrawnCard,
  type ScryfallCard,
} from '../data/randomCard'
import { blankEditorCard, inferKind, normalizeRarity } from './defaults'
import type { EditorCardDocument } from './types'

const SEARCH_URL = 'https://api.scryfall.com/cards/search'
const NAMED_URL = 'https://api.scryfall.com/cards/named'
const RANDOM_URL = 'https://api.scryfall.com/cards/random'
const FETCH_MS = 12_000

export interface ScryfallSearchHit {
  id: string
  name: string
  setCode: string
  collectorNumber: string
  typeLine: string
  manaCost: string
  thumbUrl: string
}

function artUrlFromDrawn(card: DrawnCard): string {
  // Prefer art_crop when URL pattern is known; fall back to face.
  const face = card.frontImageUrl
  if (/\/normal\//.test(face)) return face.replace('/normal/', '/art_crop/')
  if (/\/large\//.test(face)) return face.replace('/large/', '/art_crop/')
  if (/\/png\//.test(face)) return face.replace('/png/', '/art_crop/').replace(/\.png(\?|$)/i, '.jpg$1')
  if (/\/small\//.test(face)) return face.replace('/small/', '/art_crop/')
  return face
}

export function drawnToEditorDocument(
  card: DrawnCard,
  base?: EditorCardDocument,
): EditorCardDocument {
  const doc = base ? { ...base } : blankEditorCard()
  const rarity = normalizeRarity(String(card.rarity))
  return {
    ...doc,
    id: card.id || doc.id,
    name: card.name,
    nameZh: card.nameZh || card.name,
    manaCost: card.manaCost || '',
    typeLine: card.typeLine,
    typeLineZh: card.typeLineZh || card.typeLine,
    oracleText: card.oracleText || '',
    oracleTextZh: card.oracleTextZh || card.oracleText || '',
    power: card.power,
    toughness: card.toughness,
    rarity,
    artUrl: artUrlFromDrawn(card),
    artCrop: { x: 0.5, y: 0.5, zoom: 1 },
    setCode: card.setCode || '',
    collectorNumber: card.collectorNumber || '',
    artist: card.artist || '',
    kind: inferKind(card.typeLine, card.power),
    keywords: [...(card.keywords || [])],
    quantity: 1,
    effect: { type: 'none' },
    frame: 'auto',
  }
}

async function fetchCardJson(url: string): Promise<ScryfallCard> {
  const res = await fetchWithTimeout(url, FETCH_MS)
  if (!res.ok) throw new Error(`Scryfall HTTP ${res.status}`)
  return (await res.json()) as ScryfallCard
}

async function drawnFromUrl(url: string): Promise<DrawnCard> {
  const raw = await enqueueScryfall(() => fetchCardJson(url))
  const drawn = drawnFromScryfall(raw)
  if (!drawn) throw new Error('Scryfall card missing images')
  return enrichDrawnCardZh(drawn)
}

/** Fuzzy name / Scryfall query → fill editor document. */
export async function importFromScryfallQuery(
  query: string,
): Promise<EditorCardDocument> {
  const q = query.trim()
  if (!q) throw new Error('Empty query')

  // Prefer exact/fuzzy named lookup for short queries without operators.
  const looksLikeSearch = /[:=()"]/.test(q) || /\b(or|and|-)\b/i.test(q)
  if (!looksLikeSearch) {
    try {
      const named = await drawnFromUrl(
        `${NAMED_URL}?fuzzy=${encodeURIComponent(q)}`,
      )
      return drawnToEditorDocument(named)
    } catch {
      // fall through to search
    }
  }

  const url = `${SEARCH_URL}?q=${encodeURIComponent(q)}&unique=cards`
  const res = await enqueueScryfall(() => fetchWithTimeout(url, FETCH_MS))
  if (!res.ok) throw new Error(`Scryfall HTTP ${res.status}`)
  const data = (await res.json()) as { data?: ScryfallCard[] }
  const first = data.data?.[0]
  if (!first) throw new Error('No cards found')
  const drawn = drawnFromScryfall(first)
  if (!drawn) throw new Error('Scryfall card missing images')
  const enriched = await enrichDrawnCardZh(drawn)
  return drawnToEditorDocument(enriched)
}

export async function importRandomScryfallCard(): Promise<EditorCardDocument> {
  const q = 'game:paper -is:funny -is:token'
  const drawn = await drawnFromUrl(
    `${RANDOM_URL}?q=${encodeURIComponent(q)}`,
  )
  return drawnToEditorDocument(drawn)
}

/** Lightweight search hits for picker UI. */
export async function searchScryfallHits(
  query: string,
  limit = 8,
): Promise<ScryfallSearchHit[]> {
  const q = query.trim()
  if (!q) return []
  const url = `${SEARCH_URL}?q=${encodeURIComponent(q)}&unique=cards`
  const res = await enqueueScryfall(() => fetchWithTimeout(url, FETCH_MS))
  if (!res.ok) return []
  const data = (await res.json()) as { data?: ScryfallCard[] }
  const rows = data.data ?? []
  return rows.slice(0, limit).map((c) => {
    const face = c.card_faces?.[0]
    const thumb =
      c.image_uris?.small ||
      face?.image_uris?.small ||
      c.image_uris?.normal ||
      ''
    return {
      id: c.id,
      name: face?.name || c.name,
      setCode: (c.set || '').toUpperCase(),
      collectorNumber: c.collector_number || '',
      typeLine: face?.type_line || c.type_line || '',
      manaCost: face?.mana_cost || c.mana_cost || '',
      thumbUrl: thumb,
    }
  })
}

export async function importScryfallById(
  id: string,
): Promise<EditorCardDocument> {
  const drawn = await drawnFromUrl(
    `https://api.scryfall.com/cards/${encodeURIComponent(id)}`,
  )
  return drawnToEditorDocument(drawn)
}
