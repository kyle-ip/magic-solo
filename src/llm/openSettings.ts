/** Decouple FloatingNav modal from footer / other entry points. */

const OPEN_EVENT = 'magic-solo:open-llm-settings'

export function requestOpenLlmSettings(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export function subscribeOpenLlmSettings(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  window.addEventListener(OPEN_EVENT, handler)
  return () => window.removeEventListener(OPEN_EVENT, handler)
}
