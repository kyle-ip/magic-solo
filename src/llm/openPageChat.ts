/** Decouple FloatingNav / footer from the page chat modal host. */

const OPEN_EVENT = 'magic-solo:open-page-chat'

export function requestOpenPageChat(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export function subscribeOpenPageChat(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  window.addEventListener(OPEN_EVENT, handler)
  return () => window.removeEventListener(OPEN_EVENT, handler)
}
