import type { PrintCardItem } from './printCards'

export interface FetchedPrintImage {
  id: string
  name: string
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
  item: PrintCardItem,
  signal?: AbortSignal,
): Promise<Omit<FetchedPrintImage, 'id' | 'name'>> {
  const res = await fetch(item.imageUrl, { signal, mode: 'cors' })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  const buf = await res.arrayBuffer()
  const contentType =
    res.headers.get('content-type') ||
    (item.imageUrl.toLowerCase().includes('.png')
      ? 'image/png'
      : 'image/jpeg')
  const bytes = new Uint8Array(buf)
  const objectUrl = URL.createObjectURL(
    new Blob([bytes], { type: contentType }),
  )
  return { bytes, contentType, objectUrl }
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
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY
  const signal = options?.signal
  const failed: string[] = []
  const results: (FetchedPrintImage | null)[] = new Array(items.length).fill(
    null,
  )
  const urlCache = new Map<
    string,
    Promise<Omit<FetchedPrintImage, 'id' | 'name'>>
  >()
  let done = 0

  const report = () => {
    options?.onProgress?.({
      done,
      total: items.length,
      failed: [...failed],
    })
  }

  async function loadCached(item: PrintCardItem) {
    let pending = urlCache.get(item.imageUrl)
    if (!pending) {
      pending = fetchOne(item, signal)
      urlCache.set(item.imageUrl, pending)
    }
    const shared = await pending
    return {
      id: item.id,
      name: item.name,
      bytes: shared.bytes,
      contentType: shared.contentType,
      objectUrl: shared.objectUrl,
    }
  }

  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const index = cursor++
      const item = items[index]!
      try {
        results[index] = await loadCached(item)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err
        failed.push(item.name || item.id)
        urlCache.delete(item.imageUrl)
      } finally {
        done++
        report()
      }
    }
  }

  report()
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    () => worker(),
  )
  await Promise.all(workers)

  const images = results.filter((r): r is FetchedPrintImage => r != null)
  return { images, failed }
}

export function revokePrintImages(images: FetchedPrintImage[]): void {
  const seen = new Set<string>()
  for (const img of images) {
    if (seen.has(img.objectUrl)) continue
    seen.add(img.objectUrl)
    URL.revokeObjectURL(img.objectUrl)
  }
}
