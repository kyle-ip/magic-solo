import type { DeckCard } from '../types'
import { assetUrl } from '../utils/assetUrl'
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
  collectorNumber: string
  artist: string
  scryfallUri: string
  frontImageUrl: string
  backImageUrl: string
  source: 'scryfall' | 'local'
}

const SCRYFALL_RANDOM = 'https://api.scryfall.com/cards/random'
const FETCH_TIMEOUT_MS = 8000
const MIN_DRAW_GAP_MS = 500

/** Classic Magic card back (Scryfall card_back_id 0aeebaf5…), stored locally. */
const LOCAL_CARD_BACK = 'assets/cards/mtg-card-back.jpg'

const RARITY_WEIGHTS: { rarity: CardRarity; weight: number }[] = [
  { rarity: 'common', weight: 55 },
  { rarity: 'uncommon', weight: 25 },
  { rarity: 'rare', weight: 15 },
  { rarity: 'mythic', weight: 5 },
]

let lastDrawAt = 0

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
  mana_cost?: string
  power?: string
  toughness?: string
  artist?: string
  image_uris?: ScryfallImageUris
}

interface ScryfallCard {
  id: string
  name: string
  type_line?: string
  oracle_text?: string
  mana_cost?: string
  power?: string | null
  toughness?: string | null
  rarity?: string
  set?: string
  collector_number?: string
  artist?: string
  scryfall_uri?: string
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallCardFace[]
}

function pickImage(uris?: ScryfallImageUris): string {
  return uris?.normal || uris?.large || uris?.png || uris?.small || ''
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
    collectorNumber: card.collector_number || '',
    artist: face?.artist || card.artist || '',
    scryfallUri: card.scryfall_uri || '',
    frontImageUrl,
    backImageUrl: defaultCardBackUrl(),
    source: 'scryfall',
  }
}

function fromLocalDeckCard(card: DeckCard, setCode: string): DrawnCard {
  return {
    id: card.id,
    name: card.name,
    typeLine: card.typeLine,
    oracleText: card.oracleText,
    power: card.power,
    toughness: card.toughness,
    manaCost: card.manaCost,
    rarity: normalizeRarity(card.rarity),
    setCode: setCode.toUpperCase(),
    collectorNumber: card.collectorNumber,
    artist: card.artist,
    scryfallUri: card.scryfallUri,
    frontImageUrl: assetUrl(card.images.display || card.images.front),
    backImageUrl: defaultCardBackUrl(),
    source: 'local',
  }
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

async function fetchScryfallRandom(rarity: CardRarity): Promise<DrawnCard> {
  const q = `rarity:${rarity} game:paper -is:funny -is:token`
  const url = `${SCRYFALL_RANDOM}?q=${encodeURIComponent(q)}`
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      throw new Error(`Scryfall HTTP ${res.status}`)
    }
    const json = (await res.json()) as ScryfallCard
    const drawn = fromScryfall(json)
    if (!drawn) throw new Error('Scryfall card missing images')
    return drawn
  } finally {
    window.clearTimeout(timer)
  }
}

export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve()
      return
    }
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Failed to load ${src}`))
    img.src = src
  })
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
    const card = await fetchScryfallRandom(rarity)
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
