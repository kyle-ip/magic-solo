/** Session-scoped image preload: same URL reuses one Promise. */

const cache = new Map<string, Promise<void>>()

export function preloadImage(src: string): Promise<void> {
  if (!src) return Promise.resolve()

  const hit = cache.get(src)
  if (hit) return hit

  const promise = new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      const finish = () => resolve()
      if (typeof img.decode === 'function') {
        void img.decode().then(finish).catch(finish)
      } else {
        finish()
      }
    }
    img.onerror = () => {
      cache.delete(src)
      reject(new Error(`Failed to load ${src}`))
    }
    img.src = src
  })

  cache.set(src, promise)
  return promise
}
