import { useCallback, useRef, useState, type MouseEvent, type PointerEvent } from 'react'

/** Match swipe claim so hold-drag feels the same before a tap-to-flip. */
const DRAG_CLAIM_PX = 28
const DRAG_RATIO = 1.15
const DRAG_VISUAL_MAX = 28

type HoldHandlers = {
  onPointerDown: (e: PointerEvent) => void
  onPointerMove: (e: PointerEvent) => void
  onPointerUp: (e: PointerEvent) => void
  onPointerCancel: (e: PointerEvent) => void
  onClickCapture: (e: MouseEvent | PointerEvent) => void
}

export type CardHoldDragResult = {
  bind: HoldHandlers
  holding: boolean
  dragging: boolean
  dragX: number
  /** -1 = drag right, 1 = drag left (same sign as pack browse hints). */
  dragHint: -1 | 0 | 1
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function holdHaptic(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  if (prefersReducedMotion()) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}

/**
 * Hold-to-float + horizontal drag tremor for single-card previews.
 * Does not change cards — only visual feedback to distinguish from tap-flip.
 */
export function useCardHoldDrag(enabled = true): CardHoldDragResult {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const draggingRef = useRef(false)
  const hinted = useRef(false)
  const suppressClick = useRef(false)
  const suppressTimer = useRef<number | null>(null)
  const holdTimer = useRef<number | null>(null)

  const [holding, setHolding] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [dragHint, setDragHint] = useState<-1 | 0 | 1>(0)

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }, [])

  const resetVisual = useCallback(() => {
    clearHoldTimer()
    draggingRef.current = false
    setHolding(false)
    setDragging(false)
    setDragX(0)
    setDragHint(0)
    hinted.current = false
  }, [clearHoldTimer])

  const armClickSuppress = useCallback(() => {
    suppressClick.current = true
    if (suppressTimer.current != null) window.clearTimeout(suppressTimer.current)
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
      draggingRef.current = false
      hinted.current = false
      suppressClick.current = false
      setDragging(false)
      setDragX(0)
      setDragHint(0)
      clearHoldTimer()
      holdTimer.current = window.setTimeout(() => {
        holdTimer.current = null
        setHolding(true)
      }, 90)
    },
    [enabled, clearHoldTimer],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!enabled || !start.current || start.current.id !== e.pointerId) return
      const dx = e.clientX - start.current.x
      const dy = e.clientY - start.current.y

      if (!draggingRef.current) {
        if (Math.abs(dx) < DRAG_CLAIM_PX) return
        if (Math.abs(dx) < Math.abs(dy) * DRAG_RATIO) return
        draggingRef.current = true
        clearHoldTimer()
        setHolding(true)
        setDragging(true)
      }

      const visual = Math.max(-DRAG_VISUAL_MAX, Math.min(DRAG_VISUAL_MAX, dx * 0.45))
      setDragX(visual)
      const hint: -1 | 0 | 1 =
        Math.abs(dx) < DRAG_CLAIM_PX * 1.2 ? 0 : dx < 0 ? 1 : -1
      setDragHint(hint)
      if (hint !== 0 && !hinted.current) {
        hinted.current = true
        holdHaptic(8)
      }
    },
    [enabled, clearHoldTimer],
  )

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!enabled || !start.current || start.current.id !== e.pointerId) {
        resetVisual()
        return
      }
      const didDrag = draggingRef.current
      start.current = null
      resetVisual()
      // Clear drag should not also flip the card.
      if (didDrag) armClickSuppress()
    },
    [enabled, resetVisual, armClickSuppress],
  )

  const onPointerCancel = useCallback(
    (e: PointerEvent) => {
      if (start.current?.id === e.pointerId) {
        start.current = null
        resetVisual()
      }
    },
    [resetVisual],
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
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture,
    },
    holding,
    dragging,
    dragX,
    dragHint,
  }
}
