import i18n from '../i18n'
import type { DeckCard } from '../types'
import { assetUrl } from '../utils/assetUrl'
import { preloadImage } from '../utils/imageCache'
import { getCardZh } from './locale/cardsZh'
import { getDeck, getDeckIndex } from './deckRegistry'

export type CardRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'mythic'
  | 'special'
  | 'bonus'
  | string

export interface DrawnCard {
  id: string
  name: string
  typeLine: string
  oracleText: string
  power: string | null
  toughness: string | null
  manaCost: string
  rarity: CardRarity
  setCode: string
  setName: string
  collectorNumber: string
  artist: string
  scryfallUri: string
  frontImageUrl: string
  backImageUrl: string
  source: 'scryfall' | 'local'
  oracleId: string
  keywords: string[]
  flavorText: string
  nameZh?: string
  typeLineZh?: string
  oracleTextZh?: string
  flavorTextZh?: string
}

export { preloadImage }

const SCRYFALL_RANDOM = 'https://api.scryfall.com/cards/random'
const SCRYFALL_SEARCH = 'https://api.scryfall.com/cards/search'
const FETCH_TIMEOUT_MS = 8000
const ZHS_TIMEOUT_MS = 5000
const MIN_DRAW_GAP_MS = 500
const SCRYFALL_GAP_MS = 90

/** Classic Magic card back (Scryfall card_back_id 0aeebaf5…), stored locally. */
const LOCAL_CARD_BACK = 'assets/cards/mtg-card-back.jpg'

const RARITY_WEIGHTS: { rarity: CardRarity; weight: number }[] = [
  { rarity: 'common', weight: 55 },
  { rarity: 'uncommon', weight: 25 },
  { rarity: 'rare', weight: 15 },
  { rarity: 'mythic', weight: 5 },
]

let lastDrawAt = 0
let lastScryfallAt = 0
let scryfallQueue: Promise<void> = Promise.resolve()

export function defaultCardBackUrl(): string {
  return assetUrl(LOCAL_CARD_BACK)
}

export function rollRarity(): CardRarity {
  const total = RARITY_WEIGHTS.reduce((sum, row) => sum + row.weight, 0)
  let roll = Math.random() * total
  for (const row of RARITY_WEIGHTS) {
    roll -= row.weight
    if (roll <= 0) return row.rarity
  }
  return 'common'
}

export function isPremiumRarity(rarity: CardRarity): boolean {
  return rarity === 'rare' || rarity === 'mythic' || rarity === 'special'
}

export function wantsZh(lang?: string): boolean {
  return (lang ?? i18n.language).startsWith('zh')
}

export function displayName(card: DrawnCard, lang?: string): string {
  if (wantsZh(lang) && card.nameZh) return card.nameZh
  return card.name
}

export function displayTypeLine(card: DrawnCard, lang?: string): string {
  if (wantsZh(lang) && card.typeLineZh) return card.typeLineZh
  return card.typeLine
}

export function displayOracle(card: DrawnCard, lang?: string): string {
  if (wantsZh(lang) && card.oracleTextZh) return card.oracleTextZh
  return card.oracleText
}

export function displayFlavor(card: DrawnCard, lang?: string): string {
  if (wantsZh(lang) && card.flavorTextZh?.trim()) return card.flavorTextZh.trim()
  return (card.flavorText || '').trim()
}

export function hasZhPrint(card: DrawnCard): boolean {
  return Boolean(card.nameZh || card.typeLineZh || card.oracleTextZh || card.flavorTextZh)
}

function normalizeRarity(raw: string | undefined): CardRarity {
  const r = (raw || 'common').toLowerCase()
  return r
}

interface ScryfallImageUris {
  small?: string
  normal?: string
  large?: string
  png?: string
  art_crop?: string
  border_crop?: string
}

interface ScryfallCardFace {
  name?: string
  type_line?: string
  oracle_text?: string
  flavor_text?: string
  mana_cost?: string
  power?: string
  toughness?: string
  artist?: string
  printed_name?: string
  printed_type_line?: string
  printed_text?: string
  image_uris?: ScryfallImageUris
}

interface ScryfallCard {
  id: string
  oracle_id?: string
  name: string
  type_line?: string
  oracle_text?: string
  flavor_text?: string
  mana_cost?: string
  power?: string | null
  toughness?: string | null
  rarity?: string
  set?: string
  set_name?: string
  collector_number?: string
  artist?: string
  scryfall_uri?: string
  keywords?: string[]
  lang?: string
  printed_name?: string
  printed_type_line?: string
  printed_text?: string
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallCardFace[]
}

interface ScryfallSearchResponse {
  data?: ScryfallCard[]
}

function pickImage(uris?: ScryfallImageUris): string {
  return uris?.normal || uris?.large || uris?.png || uris?.small || ''
}

function collectFlavorText(card: ScryfallCard): string {
  if (card.card_faces?.length) {
    const parts = card.card_faces
      .map((f) => (f.flavor_text || '').trim())
      .filter(Boolean)
    if (parts.length > 0) return parts.join('\n\n')
  }
  return (card.flavor_text || '').trim()
}

function fromScryfall(card: ScryfallCard): DrawnCard | null {
  const face = card.card_faces?.[0]
  const frontImageUrl = pickImage(card.image_uris) || pickImage(face?.image_uris)
  if (!frontImageUrl) return null

  return {
    id: card.id,
    name: face?.name || card.name,
    typeLine: face?.type_line || card.type_line || '',
    oracleText: face?.oracle_text || card.oracle_text || '',
    power: face?.power ?? card.power ?? null,
    toughness: face?.toughness ?? card.toughness ?? null,
    manaCost: face?.mana_cost || card.mana_cost || '',
    rarity: normalizeRarity(card.rarity),
    setCode: (card.set || '').toUpperCase(),
    setName: card.set_name || '',
    collectorNumber: card.collector_number || '',
    artist: face?.artist || card.artist || '',
    scryfallUri: card.scryfall_uri || '',
    frontImageUrl,
    backImageUrl: defaultCardBackUrl(),
    source: 'scryfall',
    oracleId: card.oracle_id || '',
    keywords: Array.isArray(card.keywords) ? [...card.keywords] : [],
    flavorText: collectFlavorText(card),
  }
}

function applyLocalZh(card: DrawnCard, setCode: string): DrawnCard {
  const zh = getCardZh(setCode.toLowerCase(), card.name)
  if (!zh) return card
  return {
    ...card,
    nameZh: zh.name,
    typeLineZh: zh.typeLine,
    oracleTextZh: zh.oracleText,
  }
}

/** Map a fixed challenge-deck card into the shared details shape (EN + ZH). */
export function deckCardToDrawn(
  card: DeckCard,
  setCode: string,
  options?: { setName?: string; useDeckBack?: boolean },
): DrawnCard {
  const base: DrawnCard = {
    id: card.id,
    name: card.name,
    typeLine: card.typeLine,
    oracleText: card.oracleText,
    power: card.power,
    toughness: card.toughness,
    manaCost: card.manaCost,
    rarity: normalizeRarity(card.rarity),
    setCode: setCode.toUpperCase(),
    setName: options?.setName ?? '',
    collectorNumber: card.collectorNumber,
    artist: card.artist,
    scryfallUri: card.scryfallUri,
    frontImageUrl: assetUrl(card.images.display || card.images.front),
    backImageUrl: options?.useDeckBack
      ? assetUrl(card.images.back)
      : defaultCardBackUrl(),
    source: 'local',
    oracleId: '',
    keywords: Array.isArray(card.keywords) ? [...card.keywords] : [],
    flavorText: '',
  }
  return applyLocalZh(base, setCode)
}

function fromLocalDeckCard(card: DeckCard, setCode: string): DrawnCard {
  return deckCardToDrawn(card, setCode)
}

function allLocalCards(): DrawnCard[] {
  const out: DrawnCard[] = []
  for (const entry of getDeckIndex()) {
    const deck = getDeck(entry.code)
    if (!deck) continue
    for (const card of deck.cards) {
      out.push(fromLocalDeckCard(card, deck.setCode || entry.setCode))
    }
  }
  return out
}

function pickLocal(rarity: CardRarity): DrawnCard {
  const pool = allLocalCards()
  if (pool.length === 0) {
    throw new Error('No local cards available for pack draw fallback')
  }
  const matched = pool.filter((c) => c.rarity === rarity)
  const use = matched.length > 0 ? matched : pool
  return use[Math.floor(Math.random() * use.length)]
}

async function waitScryfallGap(): Promise<void> {
  const elapsed = Date.now() - lastScryfallAt
  if (elapsed < SCRYFALL_GAP_MS) {
    await new Promise((r) => setTimeout(r, SCRYFALL_GAP_MS - elapsed))
  }
  lastScryfallAt = Date.now()
}

/** Serialize Scryfall calls that need polite spacing (zhs overlay). */
function enqueueScryfall<T>(fn: () => Promise<T>): Promise<T> {
  const run = scryfallQueue.then(async () => {
    await waitScryfallGap()
    return fn()
  })
  scryfallQueue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
  } finally {
    window.clearTimeout(timer)
  }
}

function overlayFromZhs(print: ScryfallCard): Partial<DrawnCard> {
  const face = print.card_faces?.[0]
  const nameZh = print.printed_name || face?.printed_name || ''
  const typeLineZh = print.printed_type_line || face?.printed_type_line || ''
  const oracleTextZh = print.printed_text || face?.printed_text || ''
  const flavorTextZh = collectFlavorText(print)
  const out: Partial<DrawnCard> = {}
  if (nameZh) out.nameZh = nameZh
  if (typeLineZh) out.typeLineZh = typeLineZh
  if (oracleTextZh) out.oracleTextZh = oracleTextZh
  if (flavorTextZh) out.flavorTextZh = flavorTextZh
  return out
}

async function fetchZhsOverlay(oracleId: string): Promise<Partial<DrawnCard> | null> {
  if (!oracleId) return null
  return enqueueScryfall(async () => {
    try {
      const q = `oracleid:${oracleId} lang:zhs`
      const url = `${SCRYFALL_SEARCH}?q=${encodeURIComponent(q)}&unique=prints`
      const res = await fetchWithTimeout(url, ZHS_TIMEOUT_MS)
      if (!res.ok) return null
      const data = (await res.json()) as ScryfallSearchResponse
      const print =
        data.data?.find((c) => c.printed_name || c.card_faces?.[0]?.printed_name) ??
        data.data?.[0]
      if (!print) return null
      const overlay = overlayFromZhs(print)
      return Object.keys(overlay).length > 0 ? overlay : null
    } catch {
      return null
    }
  })
}

async function maybeEnrichZh(card: DrawnCard): Promise<DrawnCard> {
  if (!wantsZh()) return card
  if (card.source === 'local') return card
  if (!card.oracleId) return card
  const overlay = await fetchZhsOverlay(card.oracleId)
  if (!overlay) return card
  return { ...card, ...overlay }
}

async function fetchScryfallRandom(rarity: CardRarity): Promise<DrawnCard> {
  const q = `rarity:${rarity} game:paper -is:funny -is:token`
  const url = `${SCRYFALL_RANDOM}?q=${encodeURIComponent(q)}`

  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)
  if (!res.ok) {
    throw new Error(`Scryfall HTTP ${res.status}`)
  }
  const json = (await res.json()) as ScryfallCard
  const drawn = fromScryfall(json)
  if (!drawn) throw new Error('Scryfall card missing images')
  return drawn
}

async function waitForDrawGap(): Promise<void> {
  const elapsed = Date.now() - lastDrawAt
  if (elapsed < MIN_DRAW_GAP_MS) {
    await new Promise((r) => setTimeout(r, MIN_DRAW_GAP_MS - elapsed))
  }
}

async function drawOneUnchecked(): Promise<DrawnCard> {
  const rarity = rollRarity()
  try {
    let card = await fetchScryfallRandom(rarity)
    card = await maybeEnrichZh(card)
    try {
      await preloadImage(card.frontImageUrl)
    } catch {
      /* still usable if CDN is flaky */
    }
    return card
  } catch {
    const local = pickLocal(rarity)
    try {
      await preloadImage(local.frontImageUrl)
    } catch {
      /* ignore */
    }
    return local
  }
}

/**
 * Weighted random draw: Scryfall first, local challenge decks on failure.
 */
export async function drawWeightedCard(): Promise<DrawnCard> {
  await waitForDrawGap()
  lastDrawAt = Date.now()
  return drawOneUnchecked()
}

/**
 * Open a pack of `count` cards. Requests run concurrently (one rate-limit gap for the pack).
 */
export async function drawWeightedPack(count = 3): Promise<DrawnCard[]> {
  const n = Math.max(1, Math.floor(count))
  await waitForDrawGap()
  lastDrawAt = Date.now()

  let cards = await Promise.all(Array.from({ length: n }, () => drawOneUnchecked()))

  // Concurrent random can collide — replace duplicate ids when possible.
  const seen = new Set<string>()
  cards = await Promise.all(
    cards.map(async (card) => {
      if (!seen.has(card.id)) {
        seen.add(card.id)
        return card
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        const next = await drawOneUnchecked()
        if (!seen.has(next.id)) {
          seen.add(next.id)
          return next
        }
      }
      return card
    }),
  )

  return cards
}
