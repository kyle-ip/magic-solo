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

export interface DrawnCardFace {
  name: string
  typeLine: string
  oracleText: string
  flavorText: string
  manaCost: string
  power: string | null
  toughness: string | null
  nameZh?: string
  typeLineZh?: string
  oracleTextZh?: string
  flavorTextZh?: string
}

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
  /** WUBRG color letters from the English print (`colors`, else `color_identity`). */
  colors: string[]
  /** Extra faces (transform / MDFC / adventure back, etc.). */
  otherFaces: DrawnCardFace[]
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

export function displayFaceName(face: DrawnCardFace, lang?: string): string {
  if (wantsZh(lang) && face.nameZh) return face.nameZh
  return face.name
}

export function displayFaceTypeLine(face: DrawnCardFace, lang?: string): string {
  if (wantsZh(lang) && face.typeLineZh) return face.typeLineZh
  return face.typeLine
}

export function displayFaceOracle(face: DrawnCardFace, lang?: string): string {
  if (wantsZh(lang) && face.oracleTextZh) return face.oracleTextZh
  return face.oracleText
}

export function displayFaceFlavor(face: DrawnCardFace, lang?: string): string {
  if (wantsZh(lang) && face.flavorTextZh?.trim()) return face.flavorTextZh.trim()
  return (face.flavorText || '').trim()
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

export interface ScryfallCard {
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
  colors?: string[]
  color_identity?: string[]
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

function mapScryfallFace(face: ScryfallCardFace): DrawnCardFace {
  return {
    name: face.name || '',
    typeLine: face.type_line || '',
    oracleText: face.oracle_text || '',
    flavorText: (face.flavor_text || '').trim(),
    manaCost: face.mana_cost || '',
    power: face.power ?? null,
    toughness: face.toughness ?? null,
  }
}

function otherFacesFrom(card: ScryfallCard): DrawnCardFace[] {
  const faces = card.card_faces
  if (!faces || faces.length < 2) return []
  return faces.slice(1).map(mapScryfallFace)
}

function frontFlavor(card: ScryfallCard): string {
  const face = card.card_faces?.[0]
  if (face) return (face.flavor_text || '').trim()
  return (card.flavor_text || '').trim()
}

function pickColors(card: ScryfallCard): string[] {
  if (Array.isArray(card.colors) && card.colors.length > 0) {
    return [...card.colors]
  }
  if (Array.isArray(card.color_identity)) {
    return [...card.color_identity]
  }
  return []
}

function colorsFromManaCost(manaCost: string): string[] {
  const found = new Set<string>()
  for (const m of manaCost.matchAll(/\{([^}]+)\}/g)) {
    const raw = m[1].toUpperCase()
    for (const letter of raw) {
      if ('WUBRG'.includes(letter)) found.add(letter)
    }
  }
  return [...found]
}

/** Map a Scryfall card JSON object into the shared DrawnCard shape. */
export function drawnFromScryfall(card: ScryfallCard): DrawnCard | null {
  const face = card.card_faces?.[0]
  const frontImageUrl = pickImage(card.image_uris) || pickImage(face?.image_uris)
  if (!frontImageUrl) return null
  const manaCost = face?.mana_cost || card.mana_cost || ''
  const colors = pickColors(card)

  return {
    id: card.id,
    name: face?.name || card.name,
    typeLine: face?.type_line || card.type_line || '',
    oracleText: face?.oracle_text || card.oracle_text || '',
    power: face?.power ?? card.power ?? null,
    toughness: face?.toughness ?? card.toughness ?? null,
    manaCost,
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
    flavorText: frontFlavor(card),
    colors,
    otherFaces: otherFacesFrom(card),
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
    colors: colorsFromManaCost(card.manaCost),
    otherFaces: [],
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

/** Serialize Scryfall calls that need polite spacing (zhs overlay / collection). */
export function enqueueScryfall<T>(fn: () => Promise<T>): Promise<T> {
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

export async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    })
  } finally {
    window.clearTimeout(timer)
  }
}

interface ZhFaceOverlay {
  nameZh?: string
  typeLineZh?: string
  oracleTextZh?: string
  flavorTextZh?: string
}

interface ZhOverlay {
  nameZh?: string
  typeLineZh?: string
  oracleTextZh?: string
  flavorTextZh?: string
  otherFaceZh?: ZhFaceOverlay[]
}

/** Session cache: oracle_id → overlay (null = known miss). */
const zhsOverlayCache = new Map<string, ZhOverlay | null>()
const zhsOverlayInflight = new Map<string, Promise<ZhOverlay | null>>()

function overlayFromZhs(print: ScryfallCard): ZhOverlay | null {
  const face = print.card_faces?.[0]
  const nameZh = print.printed_name || face?.printed_name || ''
  const typeLineZh = print.printed_type_line || face?.printed_type_line || ''
  const oracleTextZh = print.printed_text || face?.printed_text || ''
  const flavorTextZh = face
    ? (face.flavor_text || '').trim()
    : (print.flavor_text || '').trim()
  const out: ZhOverlay = {}
  if (nameZh) out.nameZh = nameZh
  if (typeLineZh) out.typeLineZh = typeLineZh
  if (oracleTextZh) out.oracleTextZh = oracleTextZh
  if (flavorTextZh) out.flavorTextZh = flavorTextZh

  if (print.card_faces && print.card_faces.length > 1) {
    const otherFaceZh = print.card_faces.slice(1).map((f) => {
      const row: ZhFaceOverlay = {}
      if (f.printed_name) row.nameZh = f.printed_name
      if (f.printed_type_line) row.typeLineZh = f.printed_type_line
      if (f.printed_text) row.oracleTextZh = f.printed_text
      const fl = (f.flavor_text || '').trim()
      if (fl) row.flavorTextZh = fl
      return row
    })
    if (otherFaceZh.some((r) => Object.keys(r).length > 0)) {
      out.otherFaceZh = otherFaceZh
    }
  }

  return Object.keys(out).length > 0 ? out : null
}

async function fetchZhsOverlay(oracleId: string): Promise<ZhOverlay | null> {
  if (!oracleId) return null
  return enqueueScryfall(async () => {
    try {
      const q = `oracleid:${oracleId} lang:zhs`
      // API defaults to English-only; multilingual prints need this flag
      // or `lang:zhs` always 404s even when Simplified Chinese exists.
      const url = `${SCRYFALL_SEARCH}?q=${encodeURIComponent(q)}&unique=prints&include_multilingual=true`
      const res = await fetchWithTimeout(url, ZHS_TIMEOUT_MS)
      if (!res.ok) return null
      const data = (await res.json()) as ScryfallSearchResponse
      const print =
        data.data?.find((c) => c.printed_name || c.card_faces?.[0]?.printed_name) ??
        data.data?.[0]
      if (!print) return null
      return overlayFromZhs(print)
    } catch {
      return null
    }
  })
}

async function fetchZhsOverlayCached(oracleId: string): Promise<ZhOverlay | null> {
  if (!oracleId) return null
  if (zhsOverlayCache.has(oracleId)) {
    return zhsOverlayCache.get(oracleId) ?? null
  }
  const pending = zhsOverlayInflight.get(oracleId)
  if (pending) return pending

  const task = fetchZhsOverlay(oracleId).then((overlay) => {
    zhsOverlayCache.set(oracleId, overlay)
    zhsOverlayInflight.delete(oracleId)
    return overlay
  })
  zhsOverlayInflight.set(oracleId, task)
  return task
}

function applyZhOverlay(card: DrawnCard, overlay: ZhOverlay): DrawnCard {
  const next: DrawnCard = {
    ...card,
    ...(overlay.nameZh ? { nameZh: overlay.nameZh } : {}),
    ...(overlay.typeLineZh ? { typeLineZh: overlay.typeLineZh } : {}),
    ...(overlay.oracleTextZh ? { oracleTextZh: overlay.oracleTextZh } : {}),
    ...(overlay.flavorTextZh ? { flavorTextZh: overlay.flavorTextZh } : {}),
  }
  if (card.otherFaces.length > 0 && overlay.otherFaceZh?.length) {
    next.otherFaces = card.otherFaces.map((face, i) => {
      const zh = overlay.otherFaceZh?.[i]
      if (!zh) return face
      return {
        ...face,
        ...(zh.nameZh ? { nameZh: zh.nameZh } : {}),
        ...(zh.typeLineZh ? { typeLineZh: zh.typeLineZh } : {}),
        ...(zh.oracleTextZh ? { oracleTextZh: zh.oracleTextZh } : {}),
        ...(zh.flavorTextZh ? { flavorTextZh: zh.flavorTextZh } : {}),
      }
    })
  }
  return next
}

/**
 * Attach Simplified Chinese printed fields when available.
 * Safe to call after reveal (progressive) or when inspecting a collected card.
 * Results are cached per oracle_id for the session.
 */
export async function enrichDrawnCardZh(card: DrawnCard): Promise<DrawnCard> {
  if (card.source === 'local') return card
  if (!card.oracleId) return card
  if (hasZhPrint(card)) {
    // Warm cache from an already-localized card for later draws.
    if (!zhsOverlayCache.has(card.oracleId)) {
      zhsOverlayCache.set(card.oracleId, {
        ...(card.nameZh ? { nameZh: card.nameZh } : {}),
        ...(card.typeLineZh ? { typeLineZh: card.typeLineZh } : {}),
        ...(card.oracleTextZh ? { oracleTextZh: card.oracleTextZh } : {}),
        ...(card.flavorTextZh ? { flavorTextZh: card.flavorTextZh } : {}),
        ...(card.otherFaces.some((f) => f.nameZh || f.oracleTextZh)
          ? {
              otherFaceZh: card.otherFaces.map((f) => ({
                ...(f.nameZh ? { nameZh: f.nameZh } : {}),
                ...(f.typeLineZh ? { typeLineZh: f.typeLineZh } : {}),
                ...(f.oracleTextZh ? { oracleTextZh: f.oracleTextZh } : {}),
                ...(f.flavorTextZh ? { flavorTextZh: f.flavorTextZh } : {}),
              })),
            }
          : {}),
      })
    }
    return card
  }
  const overlay = await fetchZhsOverlayCached(card.oracleId)
  if (!overlay) return card
  return applyZhOverlay(card, overlay)
}

async function fetchScryfallRandom(rarity: CardRarity): Promise<DrawnCard> {
  const q = `rarity:${rarity} game:paper -is:funny -is:token`
  const url = `${SCRYFALL_RANDOM}?q=${encodeURIComponent(q)}`

  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)
  if (!res.ok) {
    throw new Error(`Scryfall HTTP ${res.status}`)
  }
  const json = (await res.json()) as ScryfallCard
  const drawn = drawnFromScryfall(json)
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
