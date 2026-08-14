import { useCallback, useRef, type MouseEvent, type PointerEvent } from 'react'

const SWIPE_MIN_PX = 48
const SWIPE_RATIO = 1.15
/** Ignore jitter below this so a click with slight drift still flips. */
const SWIPE_CLAIM_PX = 28

type SwipeHandlers = {
  onPointerDown: (e: PointerEvent) => void
  onPointerMove: (e: PointerEvent) => void
  onPointerUp: (e: PointerEvent) => void
  onPointerCancel: (e: PointerEvent) => void
  onClickCapture: (e: MouseEvent | PointerEvent) => void
}

/**
 * Horizontal swipe / left-button drag → prev/next.
 * Touch and mouse both use Pointer Events. Ignores mostly-vertical gestures
 * so oracle text can still scroll. Suppresses the synthetic click after a
 * swipe so card flip doesn't fire.
 */
export function useSwipeNavigate(
  onStep: (delta: -1 | 1) => void,
  enabled = true,
): SwipeHandlers {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const suppressClick = useRef(false)
  const capturing = useRef(false)
  const suppressTimer = useRef<number | null>(null)

  const endGesture = useCallback(() => {
    start.current = null
    capturing.current = false
  }, [])

  const armClickSuppress = useCallback(() => {
    suppressClick.current = true
    if (suppressTimer.current != null) window.clearTimeout(suppressTimer.current)
    // Clear if no click arrives (common after pointer capture on touch).
    suppressTimer.current = window.setTimeout(() => {
      suppressClick.current = false
      suppressTimer.current = null
    }, 80)
  }, [])

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (!enabled) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
      suppressClick.current = false
      capturing.current = false
    },
    [enabled],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!enabled || !start.current || start.current.id !== e.pointerId) return
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y
      if (!capturing.current) {
        // Don't claim (or capture) until movement is clearly a swipe —
        // early capture was eating the click after small horizontal jitter.
        if (Math.abs(dx) < SWIPE_CLAIM_PX) return
        if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return
        capturing.current = true
        try {
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }
      if (capturing.current) e.preventDefault()
    },
    [enabled],
  )

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!enabled || !start.current || start.current.id !== e.pointerId) return
      const origin = start.current
      const wasCapturing = capturing.current
      endGesture()
      if (wasCapturing) {
        try {
          ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }
      const dx = e.clientX - origin.x
      const dy = e.clientY - origin.y
      if (Math.abs(dx) < SWIPE_MIN_PX) return
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return
      armClickSuppress()
      onStep(dx < 0 ? 1 : -1)
    },
    [enabled, endGesture, onStep, armClickSuppress],
  )

  const onPointerCancel = useCallback(
    (e: PointerEvent) => {
      if (start.current?.id === e.pointerId) endGesture()
    },
    [endGesture],
  )

  const onClickCapture = useCallback((e: MouseEvent | PointerEvent) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    if (suppressTimer.current != null) {
      window.clearTimeout(suppressTimer.current)
      suppressTimer.current = null
    }
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
  }
}
