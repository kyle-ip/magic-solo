/**
 * Revoke blob URLs / clear print image stores off the critical path so
 * closing modals does not freeze the UI while tearing down large PDFs/images.
 */

import type { SharedPrintImage } from './fetchPrintImages'

const CHUNK = 8

function scheduleIdle(cb: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => cb(), { timeout: 500 })
    return
  }
  setTimeout(cb, 0)
}

/** Revoke object URLs in small chunks after the next paint. */
export function deferRevokeObjectUrls(urls: readonly string[]): void {
  if (urls.length === 0) return
  const queue = urls.slice()
  const drain = () => {
    const batch = queue.splice(0, CHUNK)
    for (const url of batch) {
      try {
        URL.revokeObjectURL(url)
      } catch {
        /* ignore */
      }
    }
    if (queue.length > 0) scheduleIdle(drain)
  }
  // Let the modal unmount / close paint first.
  requestAnimationFrame(() => {
    scheduleIdle(drain)
  })
}

/** Clear a print image store and revoke its URLs without blocking close. */
export function deferRevokePrintImageStore(
  store: Map<string, SharedPrintImage>,
  /** Skip URLs still used by another store (e.g. preview normals reused for local faces). */
  preserve?: Map<string, SharedPrintImage>,
): void {
  if (store.size === 0) return
  const keep = new Set<string>()
  if (preserve) {
    for (const img of preserve.values()) keep.add(img.objectUrl)
  }
  const urls: string[] = []
  for (const img of store.values()) {
    if (keep.has(img.objectUrl)) continue
    urls.push(img.objectUrl)
  }
  store.clear()
  if (urls.length > 0) deferRevokeObjectUrls(urls)
}

/** Drop a large PDF buffer after paint (helps GC without stalling close). */
export function deferDropLargeBuffer(bytes: Uint8Array | null | undefined): void {
  if (!bytes || bytes.byteLength === 0) return
  requestAnimationFrame(() => {
    scheduleIdle(() => {
      // Touch length so the closure keeps the reference until idle, then drop.
      void bytes.byteLength
    })
  })
}
