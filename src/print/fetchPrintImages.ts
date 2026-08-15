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
): Promise<FetchedPrintImage> {
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
  return {
    id: item.id,
    name: item.name,
    bytes,
    contentType,
    objectUrl,
  }
}

/**
 * Fetch card face bytes with limited concurrency.
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
  let done = 0
  let cursor = 0

  const report = () => {
    options?.onProgress?.({
      done,
      total: items.length,
      failed: [...failed],
    })
  }

  async function worker() {
    while (cursor < items.length) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const index = cursor++
      const item = items[index]!
      try {
        results[index] = await fetchOne(item, signal)
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
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, items.length)) },
    () => worker(),
  )
  await Promise.all(workers)

  const images = results.filter((r): r is FetchedPrintImage => r != null)
  return { images, failed }
}

export function revokePrintImages(images: FetchedPrintImage[]): void {
  for (const img of images) {
    URL.revokeObjectURL(img.objectUrl)
  }
}
