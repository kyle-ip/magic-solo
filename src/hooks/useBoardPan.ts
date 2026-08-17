import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

export interface BoardPanOffset {
  x: number
  y: number
}

const PAN_THRESHOLD_PX = 8
/** Show recenter when focus drifts farther than this from center. */
export const BOARD_PAN_RECENTER_THRESHOLD_PX = 96
/** Minimum free travel from center as a fraction of the stage. */
export const BOARD_PAN_RANGE_FRAC = 0.55
export const BOARD_PAN_RANGE_MIN_X = 280
export const BOARD_PAN_RANGE_MIN_Y = 220

function clamp(n: number, min: number, max: number): number {
  if (max < min) return (min + max) / 2
  return Math.min(max, Math.max(min, n))
}

/** Center the board content in the stage (used on mount / reset). */
export function centerBoardPan(
  stageW: number,
  stageH: number,
  contentW: number,
  contentH: number,
): BoardPanOffset {
  return {
    x: (stageW - contentW) / 2,
    y: (stageH - contentH) / 2,
  }
}

/** Always-available free pan travel from the centered focus. */
export function freePanRange(stageW: number, stageH: number): BoardPanOffset {
  return {
    x: Math.max(Math.round(stageW * BOARD_PAN_RANGE_FRAC), BOARD_PAN_RANGE_MIN_X),
    y: Math.max(Math.round(stageH * BOARD_PAN_RANGE_FRAC), BOARD_PAN_RANGE_MIN_Y),
  }
}

/**
 * Clamp pan inside a generous free-travel window around center —
 * not only when content overflows the viewport.
 */
export function clampBoardPan(
  x: number,
  y: number,
  stageW: number,
  stageH: number,
  contentW: number,
  contentH: number,
): BoardPanOffset {
  const c = centerBoardPan(stageW, stageH, contentW, contentH)
  const r = freePanRange(stageW, stageH)
  return {
    x: clamp(x, c.x - r.x, c.x + r.x),
    y: clamp(y, c.y - r.y, c.y + r.y),
  }
}

export function isBoardPanOffCenter(
  offset: BoardPanOffset,
  center: BoardPanOffset,
  threshold = BOARD_PAN_RECENTER_THRESHOLD_PX,
): boolean {
  return Math.hypot(offset.x - center.x, offset.y - center.y) > threshold
}

/**
 * Drag-to-pan the Challenge board stage. Clicks under the threshold stay clicks.
 * Free pan is always available; recenter UI appears once focus leaves the home zone.
 */
export function useBoardPan(
  stageRef: RefObject<HTMLElement | null>,
  panRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): {
  offset: BoardPanOffset
  dragging: boolean
  offCenter: boolean
  resetPan: () => void
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
} {
  const [offset, setOffset] = useState<BoardPanOffset>({ x: 0, y: 0 })
  const [center, setCenter] = useState<BoardPanOffset>({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    armed: boolean
  } | null>(null)

  const measureContent = useCallback(() => {
    const stage = stageRef.current
    const pan = panRef.current
    if (!stage || !pan) return null
    return {
      stageW: stage.clientWidth,
      stageH: stage.clientHeight,
      contentW: Math.max(pan.scrollWidth, pan.offsetWidth),
      contentH: Math.max(pan.scrollHeight, pan.offsetHeight),
    }
  }, [panRef, stageRef])

  const measureAndClamp = useCallback(
    (next: BoardPanOffset): BoardPanOffset => {
      const m = measureContent()
      if (!m) return next
      const c = centerBoardPan(m.stageW, m.stageH, m.contentW, m.contentH)
      setCenter(c)
      return clampBoardPan(next.x, next.y, m.stageW, m.stageH, m.contentW, m.contentH)
    },
    [measureContent],
  )

  const resetPan = useCallback(() => {
    const m = measureContent()
    if (!m) {
      setOffset({ x: 0, y: 0 })
      setCenter({ x: 0, y: 0 })
      return
    }
    const c = centerBoardPan(m.stageW, m.stageH, m.contentW, m.contentH)
    setCenter(c)
    setOffset(c)
  }, [measureContent])

  useEffect(() => {
    if (!enabled) {
      setOffset({ x: 0, y: 0 })
      setCenter({ x: 0, y: 0 })
      setDragging(false)
      dragRef.current = null
      return
    }
    const onResize = () => setOffset((prev) => measureAndClamp(prev))
    window.addEventListener('resize', onResize)
    const stage = stageRef.current
    const pan = panRef.current
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(onResize)
        : null
    if (ro && stage) ro.observe(stage)
    if (ro && pan) ro.observe(pan)
    const m = measureContent()
    if (m) {
      const c = centerBoardPan(m.stageW, m.stageH, m.contentW, m.contentH)
      setCenter(c)
      setOffset(c)
    } else {
      onResize()
    }
    return () => {
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
    }
  }, [enabled, measureAndClamp, measureContent, panRef, stageRef])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return
      // Middle click recenters (and blocks browser auto-scroll).
      if (e.button === 1) {
        e.preventDefault()
        resetPan()
        return
      }
      if (e.button !== 0) return
      const target = e.target as HTMLElement | null
      // Don't steal drags from cards / buttons inside the board.
      if (
        target?.closest(
          'button, a, input, [data-instance-id], .arena-card, .land-stack, .hero-chip, .assistant-card-slot, .assistant-drag-source, .assistant-slot-ctrl, .named-values',
        )
      ) {
        return
      }
      const stage = stageRef.current
      if (!stage) return
      stage.setPointerCapture(e.pointerId)
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: offset.x,
        originY: offset.y,
        armed: false,
      }
    },
    [enabled, offset.x, offset.y, resetPan, stageRef],
  )

  useEffect(() => {
    if (!enabled) return
    const stage = stageRef.current
    if (!stage) return

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (!drag.armed) {
        if (Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return
        drag.armed = true
        setDragging(true)
      }
      e.preventDefault()
      setOffset(
        measureAndClamp({
          x: drag.originX + dx,
          y: drag.originY + dy,
        }),
      )
    }

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      dragRef.current = null
      setDragging(false)
      try {
        stage.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    }

    const onAuxClick = (e: MouseEvent) => {
      if (e.button !== 1) return
      e.preventDefault()
      resetPan()
    }

    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerup', onUp)
    stage.addEventListener('pointercancel', onUp)
    stage.addEventListener('auxclick', onAuxClick)
    return () => {
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerup', onUp)
      stage.removeEventListener('pointercancel', onUp)
      stage.removeEventListener('auxclick', onAuxClick)
    }
  }, [enabled, measureAndClamp, resetPan, stageRef])

  const offCenter = isBoardPanOffCenter(offset, center)

  return { offset, dragging, offCenter, resetPan, onPointerDown }
}
