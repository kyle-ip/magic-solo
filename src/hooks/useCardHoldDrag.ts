import {
  useCallback,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react'

/** Match swipe claim so hold-drag feels the same before a tap-to-flip. */
const DRAG_CLAIM_PX = 28
const DRAG_RATIO = 1.15
const DRAG_VISUAL_MAX = 28
/** Past this travel (after claim), release commits the shake action. */
const SHAKE_COMMIT_PX = 52

type HoldHandlers = {
  onPointerDown: (e: PointerEvent) => void
  onPointerMove: (e: PointerEvent) => void
  onPointerUp: (e: PointerEvent) => void
  onPointerCancel: (e: PointerEvent) => void
  onClickCapture: (e: MouseEvent | PointerEvent) => void
}

export type CardHoldDragOptions = {
  /**
   * `x` — horizontal browse tremor (default).
   * `any` — drag in any direction (used for single-draw redraw).
   */
  axis?: 'x' | 'any'
  /** Fired on pointer-up once the drag has entered the shake zone. */
  onShakeCommit?: () => void
}

export type CardHoldDragResult = {
  bind: HoldHandlers
  holding: boolean
  dragging: boolean
  dragX: number
  /** -1 = drag right, 1 = drag left (same sign as pack browse hints). */
  dragHint: -1 | 0 | 1
  /** True once travel is far enough that release will commit. */
  shakeArmed: boolean
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
 * Hold-to-float + drag tremor.
 * Optional `onShakeCommit` fires on release after the shake threshold
 * (used by single-draw to redraw).
 *
 * Pointer capture is deferred until the gesture is claimed as a drag —
 * same pattern as pack swipe — so a quick tap can still flip the card.
 */
export function useCardHoldDrag(
  enabled = true,
  options: CardHoldDragOptions = {},
): CardHoldDragResult {
  const axis = options.axis ?? 'x'
  const onShakeCommit = options.onShakeCommit

  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const draggingRef = useRef(false)
  const travelRef = useRef(0)
  const shakeArmedRef = useRef(false)
  const hinted = useRef(false)
  const suppressClick = useRef(false)
  const suppressTimer = useRef<number | null>(null)
  const holdTimer = useRef<number | null>(null)
  const commitRef = useRef(onShakeCommit)
  commitRef.current = onShakeCommit

  const [holding, setHolding] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [dragHint, setDragHint] = useState<-1 | 0 | 1>(0)
  const [shakeArmed, setShakeArmed] = useState(false)

  const clearHoldTimer = useCallback(() => {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }, [])

  const resetVisual = useCallback(() => {
    clearHoldTimer()
    draggingRef.current = false
    travelRef.current = 0
    shakeArmedRef.current = false
    setHolding(false)
    setDragging(false)
    setDragX(0)
    setDragHint(0)
    setShakeArmed(false)
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
      travelRef.current = 0
      shakeArmedRef.current = false
      hinted.current = false
      suppressClick.current = false
      setDragging(false)
      setDragX(0)
      setDragHint(0)
      setShakeArmed(false)
      clearHoldTimer()
      // Delay lift so a quick tap-to-flip does not flash the hold float.
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
      const travel =
        axis === 'any' ? Math.hypot(dx, dy) : Math.abs(dx)

      if (!draggingRef.current) {
        if (axis === 'any') {
          if (travel < DRAG_CLAIM_PX) return
        } else {
          if (Math.abs(dx) < DRAG_CLAIM_PX) return
          if (Math.abs(dx) < Math.abs(dy) * DRAG_RATIO) return
        }
        draggingRef.current = true
        clearHoldTimer()
        setHolding(true)
        setDragging(true)
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }

      travelRef.current = travel
      const visualAxis = axis === 'any' ? (Math.abs(dx) >= Math.abs(dy) ? dx : dy) : dx
      const visual = Math.max(
        -DRAG_VISUAL_MAX,
        Math.min(DRAG_VISUAL_MAX, visualAxis * 0.45),
      )
      setDragX(visual)

      const armed = travel >= SHAKE_COMMIT_PX
      if (armed !== shakeArmedRef.current) {
        shakeArmedRef.current = armed
        setShakeArmed(armed)
        if (armed) holdHaptic([10, 24, 10])
      }

      const hint: -1 | 0 | 1 =
        travel < DRAG_CLAIM_PX * 1.15 ? 0 : visualAxis < 0 ? 1 : -1
      setDragHint(hint)
      if (hint !== 0 && !hinted.current) {
        hinted.current = true
        holdHaptic(8)
      }
    },
    [enabled, clearHoldTimer, axis],
  )

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      if (!enabled || !start.current || start.current.id !== e.pointerId) {
        resetVisual()
        return
      }
      const didDrag = draggingRef.current
      const shouldCommit = didDrag && shakeArmedRef.current
      start.current = null
      resetVisual()
      if (didDrag) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        // Clear drag should not also flip the card.
        armClickSuppress()
      }
      if (shouldCommit) {
        holdHaptic([18, 30, 22])
        commitRef.current?.()
      }
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
    shakeArmed,
  }
}
