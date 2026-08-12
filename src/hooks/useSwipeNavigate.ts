import { useCallback, useRef, type MouseEvent, type PointerEvent, type TouchEvent } from 'react'

const SWIPE_MIN_PX = 48
const SWIPE_RATIO = 1.15

type SwipeHandlers = {
  onTouchStart: (e: TouchEvent) => void
  onTouchEnd: (e: TouchEvent) => void
  onTouchCancel: () => void
  onClickCapture: (e: MouseEvent | PointerEvent) => void
}

/**
 * Horizontal swipe → prev/next. Ignores mostly-vertical gestures so oracle
 * text can still scroll. Suppresses the synthetic click after a swipe so
 * card flip doesn't fire.
 */
export function useSwipeNavigate(
  onStep: (delta: -1 | 1) => void,
  enabled = true,
): SwipeHandlers {
  const start = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return
      const t = e.touches[0]
      if (!t) return
      start.current = { x: t.clientX, y: t.clientY }
      suppressClick.current = false
    },
    [enabled],
  )

  const onTouchCancel = useCallback(() => {
    start.current = null
  }, [])

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !start.current) return
      const t = e.changedTouches[0]
      const origin = start.current
      start.current = null
      if (!t) return
      const dx = t.clientX - origin.x
      const dy = t.clientY - origin.y
      if (Math.abs(dx) < SWIPE_MIN_PX) return
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return
      suppressClick.current = true
      onStep(dx < 0 ? 1 : -1)
    },
    [enabled, onStep],
  )

  const onClickCapture = useCallback((e: MouseEvent | PointerEvent) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return { onTouchStart, onTouchEnd, onTouchCancel, onClickCapture }
}
