import {
  drawnFromScryfall,
  enrichDrawnCardZh,
  enqueueScryfall,
  fetchWithTimeout,
  hasZhPrint,
  wantsZh,
  type DrawnCard,
  type ScryfallCard,
} from './randomCard'
import { preloadImage } from '../utils/imageCache'

const SCRYFALL_COLLECTION = 'https://api.scryfall.com/cards/collection'
const COLLECTION_TIMEOUT_MS = 12000
const BATCH_SIZE = 75

/** Session cache: lowercased oracle name → DrawnCard (or null miss). */
const cardByNameCache = new Map<string, DrawnCard | null>()

interface CollectionResponse {
  data?: ScryfallCard[]
  not_found?: { name?: string }[]
}

export type ResolveProgress = {
  /** English (or already-cached) cards — fire as soon as collection returns. */
  cards: Map<string, DrawnCard | null>
  /** True after ZH enrich finishes (or skipped). */
  done: boolean
}

function cacheKey(name: string): string {
  return name.trim().toLowerCase()
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of names) {
    const name = raw.trim()
    if (!name) continue
    const key = cacheKey(name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

function buildResultMap(names: string[]): Map<string, DrawnCard | null> {
  const result = new Map<string, DrawnCard | null>()
  for (const name of names) {
    result.set(name, cardByNameCache.get(cacheKey(name)) ?? null)
  }
  return result
}

async function fetchCollectionBatch(names: string[]): Promise<void> {
  if (names.length === 0) return

  await enqueueScryfall(async () => {
    try {
      const res = await fetchWithTimeout(SCRYFALL_COLLECTION, COLLECTION_TIMEOUT_MS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifiers: names.map((name) => ({ name })),
        }),
      })
      if (!res.ok) {
        for (const name of names) {
          if (!cardByNameCache.has(cacheKey(name))) {
            cardByNameCache.set(cacheKey(name), null)
          }
        }
        return
      }
      const json = (await res.json()) as CollectionResponse
      const cards = json.data ?? []

      const matchCard = (requestName: string): ScryfallCard | undefined => {
        const key = cacheKey(requestName)
        return cards.find((c) => {
          const full = cacheKey(c.name)
          const front = cacheKey(c.card_faces?.[0]?.name || c.name)
          const left = cacheKey(c.name.split(' // ')[0] || c.name)
          return (
            full === key ||
            front === key ||
            left === key ||
            full.startsWith(`${key} //`)
          )
        })
      }

      for (const name of names) {
        const key = cacheKey(name)
        const raw = matchCard(name)
        if (!raw) {
          if (!cardByNameCache.has(key)) cardByNameCache.set(key, null)
          continue
        }
        const drawn = drawnFromScryfall(raw)
        if (!drawn) {
          cardByNameCache.set(key, null)
          continue
        }
        cardByNameCache.set(key, drawn)
        cardByNameCache.set(cacheKey(drawn.name), drawn)
        cardByNameCache.set(cacheKey(raw.name), drawn)
      }

      for (const miss of json.not_found ?? []) {
        if (miss.name && !cardByNameCache.has(cacheKey(miss.name))) {
          cardByNameCache.set(cacheKey(miss.name), null)
        }
      }
    } catch {
      for (const name of names) {
        if (!cardByNameCache.has(cacheKey(name))) {
          cardByNameCache.set(cacheKey(name), null)
        }
      }
    }
  })
}

async function preloadFronts(cards: Iterable<DrawnCard | null>): Promise<void> {
  const urls = [...new Set(
    [...cards]
      .filter((c): c is DrawnCard => !!c?.frontImageUrl)
      .map((c) => c.frontImageUrl),
  )]
  await Promise.all(
    urls.map((url) => preloadImage(url).catch(() => undefined)),
  )
}

async function enrichAllZh(
  names: string[],
  result: Map<string, DrawnCard | null>,
): Promise<Map<string, DrawnCard | null>> {
  const targets = [...result.entries()].filter(
    (entry): entry is [string, DrawnCard] =>
      !!entry[1] && !hasZhPrint(entry[1]),
  )
  if (targets.length === 0) return result

  // Concurrent enrich — queue inside enrichDrawnCardZh still spaces API calls.
  const enriched = await Promise.all(
    targets.map(async ([reqName, card]) => {
      const next = await enrichDrawnCardZh(card)
      return [reqName, next] as const
    }),
  )

  const nextMap = new Map(result)
  for (const [reqName, card] of enriched) {
    nextMap.set(reqName, card)
    cardByNameCache.set(cacheKey(reqName), card)
    cardByNameCache.set(cacheKey(card.name), card)
  }
  // Keep unrelated request keys that share the same id in sync
  for (const name of names) {
    const cur = nextMap.get(name)
    if (!cur) continue
    const match = enriched.find(([, c]) => c.id === cur.id)
    if (match) nextMap.set(name, match[1])
  }
  return nextMap
}

/**
 * Resolve oracle names via Scryfall collection.
 * Invokes `onProgress` once EN cards + images are ready, again after ZH enrich.
 */
export async function resolveCardsByNameProgressive(
  names: string[],
  options?: {
    enrichZh?: boolean
    onProgress?: (progress: ResolveProgress) => void
  },
): Promise<Map<string, DrawnCard | null>> {
  const enrichZh = options?.enrichZh ?? wantsZh()
  const unique = uniqueNames(names)
  const pending = unique.filter((n) => !cardByNameCache.has(cacheKey(n)))

  // Collection batches run sequentially (API limit), but each batch resolves
  // many cards at once; image preloads run concurrently afterward.
  await Promise.all(
    Array.from({ length: Math.ceil(pending.length / BATCH_SIZE) || 0 }, (_, i) =>
      pending.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
    ).map((batch) => fetchCollectionBatch(batch)),
  )

  // If only one batch, Promise.all of one is fine; if multiple, they still go
  // through enqueueScryfall so spacing is preserved — but we kicked them all
  // into the queue without awaiting between loop iterations incorrectly.
  // Fix: the map above starts all batches concurrently into the queue which is
  // actually what we want (queue serializes). Good.

  let result = buildResultMap(unique)
  options?.onProgress?.({ cards: result, done: !enrichZh })
  void preloadFronts(result.values())

  if (enrichZh) {
    result = await enrichAllZh(unique, result)
    options?.onProgress?.({ cards: result, done: true })
  }

  return result
}

/**
 * Resolve oracle card names via Scryfall collection API.
 * Results are cached for the session. Missing names map to null.
 */
export async function resolveCardsByName(
  names: string[],
  options?: { enrichZh?: boolean },
): Promise<Map<string, DrawnCard | null>> {
  return resolveCardsByNameProgressive(names, options)
}

/** Look up a single previously-or-freshly resolved card by name. */
export async function resolveCardByName(
  name: string,
  options?: { enrichZh?: boolean },
): Promise<DrawnCard | null> {
  const map = await resolveCardsByName([name], options)
  return map.get(name.trim()) ?? null
}
