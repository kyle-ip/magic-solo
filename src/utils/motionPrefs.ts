/** Shared motion / device preference helpers for FX timing. */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Touch phones / tablets — prefer cheaper compositing paths. */
export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(hover: none), (pointer: coarse)').matches
}

export function flightConcurrencyLimit(): number {
  if (prefersReducedMotion()) return 1
  return isCoarsePointer() ? 2 : 3
}
