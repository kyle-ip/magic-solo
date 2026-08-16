import { previewUrlFromPrintUrl } from '../utils/remoteAsset'
import {
  expandPrintList,
  type PrintCardItem,
  type PrintListEntry,
} from './printCards'

export interface FetchedPrintImage {
  id: string
  name: string
  bytes: Uint8Array
  contentType: string
  objectUrl: string
}

export type SharedPrintImage = {
  bytes: Uint8Array
  contentType: string
  objectUrl: string
}

export type FetchImagesProgress = {
  done: number
  total: number
  failed: string[]
}

const DEFAULT_CONCURRENCY = 4

async function fetchOne(
  imageUrl: string,
  signal?: AbortSignal,
): Promise<SharedPrintImage> {
  const res = await fetch(imageUrl, { signal, mode: 'cors' })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const buf = await res.arrayBuffer()
  const contentType =
    res.headers.get('content-type') ||
    (imageUrl.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg')
  const bytes = new Uint8Array(buf)
  const objectUrl = URL.createObjectURL(
    new Blob([bytes], { type: contentType }),
  )
  return { bytes, contentType, objectUrl }
}

/** Unique image URLs from list entries with quantity > 0. */
export function uniquePrintUrls(entries: PrintListEntry[]): PrintCardItem[] {
  const seen = new Set<string>()
  const out: PrintCardItem[] = []
  for (const e of entries) {
    if (!e.imageUrl || e.quantity <= 0) continue
    if (seen.has(e.imageUrl)) continue
    seen.add(e.imageUrl)
    out.push({ id: e.id, name: e.name, imageUrl: e.imageUrl })
  }
  return out
}

/**
 * Expand list quantities into fetched slots using a URL → image store.
 * Entries whose URL is missing from the store are skipped.
 */
export function materializePrintImages(
  entries: PrintListEntry[],
  store: Map<string, SharedPrintImage>,
): FetchedPrintImage[] {
  return expandPrintList(entries).flatMap((item) => {
    const shared = store.get(item.imageUrl)
    if (!shared) return []
    return [
      {
        id: item.id,
        name: item.name,
        bytes: shared.bytes,
        contentType: shared.contentType,
        objectUrl: shared.objectUrl,
      },
    ]
  })
}

/** Count printable slots without allocating the expanded array. */
export function countPrintableSlots(
  entries: PrintListEntry[],
  store: Map<string, SharedPrintImage>,
): number {
  let n = 0
  for (const entry of entries) {
    const q = Math.floor(Number.isFinite(entry.quantity) ? entry.quantity : 0)
    if (q <= 0 || !entry.imageUrl) continue
    if (!store.has(entry.imageUrl)) continue
    n += q
  }
  return n
}

/**
 * Materialize only one page of slots (for live preview while editing quantities).
 */
export function materializePageImages(
  entries: PrintListEntry[],
  store: Map<string, SharedPrintImage>,
  pageIndex: number,
  perPage: number,
): FetchedPrintImage[] {
  if (perPage <= 0 || pageIndex < 0) return []
  const start = pageIndex * perPage
  const end = start + perPage
  const out: FetchedPrintImage[] = []
  let slot = 0
  for (const entry of entries) {
    const q = Math.floor(Number.isFinite(entry.quantity) ? entry.quantity : 0)
    if (q <= 0 || !entry.imageUrl) continue
    const shared = store.get(entry.imageUrl)
    if (!shared) continue
    for (let i = 0; i < q; i++) {
      if (slot >= end) return out
      if (slot >= start) {
        out.push({
          id: q === 1 ? entry.id : `${entry.id}#${i + 1}`,
          name: entry.name,
          bytes: shared.bytes,
          contentType: shared.contentType,
          objectUrl: shared.objectUrl,
        })
      }
      slot++
    }
  }
  return out
}

export type FetchPrintImageStoreOptions = {
  concurrency?: number
  signal?: AbortSignal
  onProgress?: (p: FetchImagesProgress) => void
  /**
   * Map list `imageUrl` (print / png) to the URL actually fetched.
   * Preview uses Scryfall `normal`; PDF export leaves this unset (fetch png).
   * Store keys remain the original print `imageUrl`.
   */
  resolveFetchUrl?: (printImageUrl: string) => string
  /**
   * When the resolved fetch URL equals the print URL, reuse an existing
   * shared image instead of re-downloading (local / blob faces).
   */
  reuseFrom?: Map<string, SharedPrintImage>
}

/**
 * Fetch unique face images for list entries (deduped by print URL).
 * Returns a URL-keyed store for rematerializing after quantity edits.
 */
export async function fetchPrintImageStore(
  entries: PrintListEntry[],
  options?: FetchPrintImageStoreOptions,
): Promise<{ store: Map<string, SharedPrintImage>; failed: string[] }> {
  const unique = uniquePrintUrls(entries)
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY
  const signal = options?.signal
  const resolveFetchUrl = options?.resolveFetchUrl ?? ((url: string) => url)
  const reuseFrom = options?.reuseFrom
  const failed: string[] = []
  const store = new Map<string, SharedPrintImage>()
  let done = 0

  const report = () => {
    options?.onProgress?.({
      done,
      total: unique.length,
      failed: [...failed],
    })
  }

  let cursor = 0
  async function worker() {
    while (cursor < unique.length) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const index = cursor++
      const item = unique[index]!
      try {
        const fetchUrl = resolveFetchUrl(item.imageUrl)
        const reusable =
          fetchUrl === item.imageUrl ? reuseFrom?.get(item.imageUrl) : undefined
        if (reusable) {
          store.set(item.imageUrl, reusable)
        } else {
          const shared = await fetchOne(fetchUrl, signal)
          store.set(item.imageUrl, shared)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err
        failed.push(item.name || item.id)
      } finally {
        done++
        report()
      }
    }
  }

  report()
  if (unique.length === 0) return { store, failed }

  const workers = Array.from(
    { length: Math.min(concurrency, unique.length) },
    () => worker(),
  )
  await Promise.all(workers)
  return { store, failed }
}

/** Convenience: fetch Scryfall `normal` (or same URL) for on-screen preview. */
export async function fetchPrintPreviewImageStore(
  entries: PrintListEntry[],
  options?: Omit<FetchPrintImageStoreOptions, 'resolveFetchUrl'>,
): Promise<{ store: Map<string, SharedPrintImage>; failed: string[] }> {
  return fetchPrintImageStore(entries, {
    ...options,
    resolveFetchUrl: previewUrlFromPrintUrl,
  })
}

/**
 * Fetch card face bytes with limited concurrency.
 * Duplicate `imageUrl`s share one network fetch / object URL (quantity copies).
 * Successful images are returned in input order (failed slots omitted).
 */
export async function fetchPrintImages(
  items: PrintCardItem[],
  options?: {
    concurrency?: number
    signal?: AbortSignal
    onProgress?: (p: FetchImagesProgress) => void
  },
): Promise<{ images: FetchedPrintImage[]; failed: string[] }> {
  const asEntries: PrintListEntry[] = items.map((item) => ({
    ...item,
    quantity: 1,
  }))
  const { store, failed } = await fetchPrintImageStore(asEntries, options)
  const images = materializePrintImages(asEntries, store)
  return { images, failed }
}

/**
 * Revoke object URLs in a store.
 * Skips images also present in `preserve` (by objectUrl) so shared reuse is safe.
 */
export function revokePrintImageStore(
  store: Map<string, SharedPrintImage>,
  preserve?: Map<string, SharedPrintImage>,
): void {
  const keep = new Set<string>()
  if (preserve) {
    for (const img of preserve.values()) keep.add(img.objectUrl)
  }
  for (const img of store.values()) {
    if (keep.has(img.objectUrl)) continue
    URL.revokeObjectURL(img.objectUrl)
  }
  store.clear()
}

export function revokePrintImages(images: FetchedPrintImage[]): void {
  const seen = new Set<string>()
  for (const img of images) {
    if (seen.has(img.objectUrl)) continue
    seen.add(img.objectUrl)
    URL.revokeObjectURL(img.objectUrl)
  }
}
