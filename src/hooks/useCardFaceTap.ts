import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent, PointerEvent as ReactPointerEvent } from 'react'

/** Short enough that single-tap zoom feels snappy; long enough to catch double-tap flip. */
const DOUBLE_TAP_MS = 220

/**
 * Card face gestures for pack / collection / deck details.
 * - Single tap/click → toggle art zoom (delayed so a double-tap can cancel it)
 * - Double tap/click → flip (no zoom)
 *
 * Face-down pack reveals (`immediateFlip`) still flip on pointerup. The trailing
 * click must be ignored even after React re-renders with immediateFlip=false,
 * or the card would flip face-up then immediately schedule a zoom.
 */
export function useCardFaceTap(options: {
  onFlip: () => void
  onToggleZoom: () => void
  enabled?: boolean
  /** Flip on first tap without waiting for double-tap detection — pack reveals. */
  immediateFlip?: boolean
}): {
  onClick: (e: MouseEvent) => void
  onDoubleClick: (e: MouseEvent) => void
  onPointerDown: (e: ReactPointerEvent) => void
  onPointerUp: (e: ReactPointerEvent) => void
} {
  const {
    onFlip,
    onToggleZoom,
    enabled = true,
    immediateFlip = false,
  } = options
  const timerRef = useRef<number | null>(null)
  const clickCountRef = useRef(0)
  const flippedFromClicksRef = useRef(false)
  /** Swallow the click that follows a pointerup flip (survives immediateFlip toggle). */
  const suppressClickRef = useRef(false)
  const pointerStartRef = useRef<{ x: number; y: number; id: number } | null>(
    null,
  )
  const onFlipRef = useRef(onFlip)
  const onToggleZoomRef = useRef(onToggleZoom)
  onFlipRef.current = onFlip
  onToggleZoomRef.current = onToggleZoom

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
    }
    timerRef.current = null
  }, [])

  useEffect(
    () => () => {
      clearTimer()
    },
    [clearTimer],
  )

  // Drop a pending delayed zoom when the face becomes inactive (e.g. browsed away).
  useEffect(() => {
    if (enabled) return
    clearTimer()
    clickCountRef.current = 0
    flippedFromClicksRef.current = false
    suppressClickRef.current = false
    pointerStartRef.current = null
  }, [enabled, clearTimer])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!enabled || !immediateFlip) return
      if (e.button !== 0) return
      pointerStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        id: e.pointerId,
      }
      suppressClickRef.current = false
    },
    [enabled, immediateFlip],
  )

  const onPointerUp = useCallback(
    (e: ReactPointerEvent) => {
      if (!enabled || !immediateFlip) return
      const start = pointerStartRef.current
      pointerStartRef.current = null
      if (!start || start.id !== e.pointerId) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      // Ignore if this was a drag/swipe, not a tap.
      if (dx * dx + dy * dy > 100) return
      suppressClickRef.current = true
      clearTimer()
      clickCountRef.current = 0
      onFlipRef.current()
    },
    [clearTimer, enabled, immediateFlip],
  )

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return
      if ('button' in e && e.button !== 0) return

      // Always honor suppress first — immediateFlip may already be false after reveal.
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        return
      }

      if (immediateFlip) {
        // Fallback when pointerup did not run (e.g. some keyboard/AT paths).
        clearTimer()
        clickCountRef.current = 0
        onFlipRef.current()
        return
      }

      clickCountRef.current += 1
      clearTimer()

      if (clickCountRef.current >= 2) {
        clickCountRef.current = 0
        flippedFromClicksRef.current = true
        onFlipRef.current()
        return
      }

      flippedFromClicksRef.current = false
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        clickCountRef.current = 0
        onToggleZoomRef.current()
      }, DOUBLE_TAP_MS)
    },
    [clearTimer, enabled, immediateFlip],
  )

  const onDoubleClick = useCallback(
    (e: MouseEvent) => {
      if (!enabled || immediateFlip) return
      e.preventDefault()
      e.stopPropagation()
      clearTimer()
      clickCountRef.current = 0
      // click×2 already flipped; don't flip again on the synthetic dblclick.
      if (flippedFromClicksRef.current) {
        flippedFromClicksRef.current = false
        return
      }
      onFlipRef.current()
    },
    [clearTimer, enabled, immediateFlip],
  )

  return { onClick, onDoubleClick, onPointerDown, onPointerUp }
}
