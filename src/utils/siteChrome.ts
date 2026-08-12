/** Site chrome (header/footer) visibility while challenge arena is playing. */

let hideSiteChrome = false
const listeners = new Set<() => void>()

export function setHideSiteChrome(hide: boolean): void {
  if (hideSiteChrome === hide) return
  hideSiteChrome = hide
  for (const fn of listeners) fn()
}

export function subscribeHideSiteChrome(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

export function getHideSiteChrome(): boolean {
  return hideSiteChrome
}
