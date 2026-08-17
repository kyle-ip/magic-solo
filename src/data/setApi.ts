/**
 * Runtime Scryfall access for set gallery. Repo keeps config only;
 * lists, icons, and card faces are fetched live.
 */

import {
  compareSetsByReleaseDesc,
  EXCLUDE_DIGITAL,
  isGallerySetType,
} from './setConfig'
import {
  drawnFromScryfall,
  enqueueScryfall,
  fetchWithTimeout,
  type DrawnCard,
  type ScryfallCard,
} from './randomCard'
import {
  pngUrlFromFaceUrl,
  scryfallResizeFaceUrl,
  thumbUrlFromFaceUrl,
  withPngFace,
} from '../utils/remoteAsset'
import { scryfallApiUrl } from '../utils/scryfallApi'

export { withPngFace, withPngFace as withLargeFace }

export function thumbUrlFromDrawn(card: DrawnCard): string {
  return thumbUrlFromFaceUrl(card.frontImageUrl)
}

export function pngFaceUrlFromDrawn(card: DrawnCard): string {
  return pngUrlFromFaceUrl(card.frontImageUrl)
}

const SETS_URL = scryfallApiUrl('/sets')
const SEARCH_URL = scryfallApiUrl('/cards/search')
const FETCH_TIMEOUT_MS = 12_000
const SETS_CACHE_KEY = 'magic-solo:scryfall-sets-v1'
const CARDS_CACHE_PREFIX = 'magic-solo:scryfall-set-cards-v1:'

export interface GallerySet {
  code: string
  name: string
  setType: string
  releasedAt: string | null
  cardCount: number
  digital: boolean
  parentSetCode: string | null
  scryfallUri: string
  iconSvgUri: string
  searchUri: string
}

export interface SetCardsPage {
  cards: DrawnCard[]
  hasMore: boolean
  nextPage: string | null
  totalCards: number
}

interface ScryfallSetRaw {
  code?: string
  name?: string
  set_type?: string
  released_at?: string
  card_count?: number
  digital?: boolean
  parent_set_code?: string
  scryfall_uri?: string
  icon_svg_uri?: string
  search_uri?: string
}

interface ScryfallSetsResponse {
  data?: ScryfallSetRaw[]
}

interface ScryfallSearchPage {
  object?: string
  total_cards?: number
  has_more?: boolean
  next_page?: string
  data?: ScryfallCard[]
}

let setsMemory: GallerySet[] | null = null
let setsInflight: Promise<GallerySet[]> | null = null

const cardsMemory = new Map<string, SetCardsPage>()

function mapSet(raw: ScryfallSetRaw): GallerySet | null {
  const code = (raw.code || '').toLowerCase()
  if (!code || !raw.name) return null
  return {
    code,
    name: raw.name,
    setType: raw.set_type || '',
    releasedAt: raw.released_at || null,
    cardCount: raw.card_count ?? 0,
    digital: Boolean(raw.digital),
    parentSetCode: raw.parent_set_code?.toLowerCase() || null,
    scryfallUri: raw.scryfall_uri || '',
    iconSvgUri: raw.icon_svg_uri || '',
    searchUri: raw.search_uri || '',
  }
}

function acceptSet(set: GallerySet): boolean {
  if (!isGallerySetType(set.setType)) return false
  if (EXCLUDE_DIGITAL && set.digital) return false
  if (set.cardCount <= 0) return false
  return true
}

function readSetsSession(): GallerySet[] | null {
  try {
    const raw = sessionStorage.getItem(SETS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GallerySet[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeSetsSession(sets: GallerySet[]) {
  try {
    sessionStorage.setItem(SETS_CACHE_KEY, JSON.stringify(sets))
  } catch {
    /* quota / private mode */
  }
}

function cardsCacheKey(code: string, pageUrl: string) {
  return `${CARDS_CACHE_PREFIX}${code.toLowerCase()}:${pageUrl}`
}

function readCardsSession(key: string): SetCardsPage | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as SetCardsPage
  } catch {
    return null
  }
}

function writeCardsSession(key: string, page: SetCardsPage) {
  try {
    sessionStorage.setItem(key, JSON.stringify(page))
  } catch {
    /* ignore */
  }
}

async function fetchAllSetsRaw(): Promise<GallerySet[]> {
  return enqueueScryfall(async () => {
    const res = await fetchWithTimeout(SETS_URL, FETCH_TIMEOUT_MS)
    if (!res.ok) throw new Error(`Scryfall sets HTTP ${res.status}`)
    const json = (await res.json()) as ScryfallSetsResponse
    const mapped = (json.data || [])
      .map(mapSet)
      .filter((s): s is GallerySet => !!s)
      .filter(acceptSet)
    mapped.sort(compareSetsByReleaseDesc)
    return mapped
  })
}

/** Filtered gallery set list (newest first). Cached in memory + sessionStorage. */
export async function loadGallerySets(): Promise<GallerySet[]> {
  if (setsMemory) return setsMemory
  const cached = readSetsSession()
  if (cached && cached.length > 0) {
    setsMemory = cached
    return cached
  }
  if (setsInflight) return setsInflight
  setsInflight = fetchAllSetsRaw()
    .then((sets) => {
      setsMemory = sets
      writeSetsSession(sets)
      setsInflight = null
      return sets
    })
    .catch((err) => {
      setsInflight = null
      throw err
    })
  return setsInflight
}

export async function getGallerySet(
  code: string,
): Promise<GallerySet | undefined> {
  const needle = code.toLowerCase()
  const sets = await loadGallerySets()
  return sets.find((s) => s.code === needle)
}

export function filterGallerySets(
  sets: GallerySet[],
  options: {
    type?: string
    q?: string
    /** Calendar year, e.g. 2023. Omit / 'all' = no year filter. */
    year?: number | 'all' | null
  },
): GallerySet[] {
  const type = options.type && options.type !== 'all' ? options.type : null
  const q = (options.q || '').trim().toLowerCase()
  const year =
    options.year != null && options.year !== 'all' ? options.year : null
  return sets.filter((s) => {
    if (type && s.setType !== type) return false
    if (year != null) {
      if (!s.releasedAt) return false
      const y = Number(s.releasedAt.slice(0, 4))
      if (y !== year) return false
    }
    if (!q) return true
    return (
      s.code.includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.setType.includes(q)
    )
  })
}

export type GallerySetSort =
  | 'release-desc'
  | 'release-asc'
  | 'name-asc'
  | 'name-desc'

export function sortGallerySets(
  sets: GallerySet[],
  sort: GallerySetSort,
  nameOf: (set: GallerySet) => string = (s) => s.name,
  locale?: string,
): GallerySet[] {
  const rows = [...sets]
  const collator = locale || undefined
  rows.sort((a, b) => {
    if (sort === 'release-desc' || sort === 'release-asc') {
      const da = a.releasedAt || ''
      const db = b.releasedAt || ''
      if (da !== db) {
        const cmp = da < db ? -1 : 1
        return sort === 'release-asc' ? cmp : -cmp
      }
      return nameOf(a).localeCompare(nameOf(b), collator, {
        sensitivity: 'base',
      })
    }
    const na = nameOf(a)
    const nb = nameOf(b)
    const cmp = na.localeCompare(nb, collator, { sensitivity: 'base' })
    if (cmp !== 0) return sort === 'name-asc' ? cmp : -cmp
    const da = a.releasedAt || ''
    const db = b.releasedAt || ''
    if (da === db) return 0
    return da < db ? 1 : -1
  })
  return rows
}

/** Distinct release years present in the catalog, newest first. */
export function gallerySetYears(sets: GallerySet[]): number[] {
  const years = new Set<number>()
  for (const s of sets) {
    if (!s.releasedAt) continue
    const y = Number(s.releasedAt.slice(0, 4))
    if (Number.isFinite(y)) years.add(y)
  }
  return [...years].sort((a, b) => b - a)
}

function firstPageUrl(code: string, searchUri?: string): string {
  if (searchUri) return searchUri
  const q = `set:${code.toLowerCase()}`
  return `${SEARCH_URL}?q=${encodeURIComponent(q)}&order=set&unique=prints`
}

function mapSearchPage(json: ScryfallSearchPage): SetCardsPage {
  const cards = (json.data || [])
    .map(drawnFromScryfall)
    .filter((c): c is DrawnCard => !!c)
  return {
    cards,
    hasMore: Boolean(json.has_more),
    nextPage: json.next_page || null,
    totalCards: json.total_cards ?? cards.length,
  }
}

async function fetchCardsPage(url: string): Promise<SetCardsPage> {
  return enqueueScryfall(async () => {
    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)
    if (!res.ok) throw new Error(`Scryfall search HTTP ${res.status}`)
    const json = (await res.json()) as ScryfallSearchPage
    return mapSearchPage(json)
  })
}

/** Ad-hoc Scryfall card search (first page, capped). Not cached. */
export async function searchScryfallCards(
  query: string,
  options?: { max?: number },
): Promise<{ cards: DrawnCard[]; totalCards: number; query: string }> {
  const q = query.trim()
  if (!q) return { cards: [], totalCards: 0, query: q }
  const max = options?.max ?? 24
  const url = `${SEARCH_URL}?q=${encodeURIComponent(q)}&unique=cards&order=name`
  const page = await fetchCardsPage(url)
  return {
    cards: page.cards.slice(0, max),
    totalCards: page.totalCards,
    query: q,
  }
}

/** One Scryfall search page for a set. Pass nextPage from a prior result to continue. */
export async function fetchSetCardsPage(
  code: string,
  options?: { searchUri?: string; pageUrl?: string | null },
): Promise<SetCardsPage> {
  const url =
    options?.pageUrl || firstPageUrl(code, options?.searchUri)
  const memKey = cardsCacheKey(code, url)
  const hit = cardsMemory.get(memKey) ?? readCardsSession(memKey)
  if (hit) {
    cardsMemory.set(memKey, hit)
    return hit
  }
  const page = await fetchCardsPage(url)
  cardsMemory.set(memKey, page)
  writeCardsSession(memKey, page)
  return page
}

/** All cards in a gallery set (follows Scryfall pagination). */
export async function fetchAllSetCards(
  code: string,
  options?: {
    searchUri?: string
    signal?: AbortSignal
    onPage?: (loaded: number, total: number) => void
  },
): Promise<DrawnCard[]> {
  const meta = await getGallerySet(code)
  const cards: DrawnCard[] = []
  let pageUrl: string | null | undefined = undefined
  let searchUri = options?.searchUri ?? meta?.searchUri
  let guard = 0

  for (;;) {
    if (options?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    const page = await fetchSetCardsPage(code, { searchUri, pageUrl })
    cards.push(...page.cards)
    options?.onPage?.(cards.length, page.totalCards || cards.length)
    if (!page.hasMore || !page.nextPage) break
    pageUrl = page.nextPage
    searchUri = undefined
    guard++
    if (guard > 80) break
  }

  return cards
}

/** Prefer rare/mythic art for hero; else first card with an image. */
export function pickHeroCard(cards: DrawnCard[]): DrawnCard | null {
  if (cards.length === 0) return null
  const premium = cards.find(
    (c) => c.rarity === 'mythic' || c.rarity === 'rare',
  )
  return premium || cards[0] || null
}

export function artCropUrlFromDrawn(card: DrawnCard): string {
  return scryfallResizeFaceUrl(card.frontImageUrl, 'art_crop')
}
