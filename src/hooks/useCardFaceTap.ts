import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'

/** Short enough that single-tap flip feels snappy; long enough to catch double-tap zoom. */
const DOUBLE_TAP_MS = 260

/**
 * Card face gestures for pack / collection / deck details.
 * - Single tap/click → flip (delayed so a double-tap can cancel it)
 * - Double tap/click → toggle art zoom (no flip)
 *
 * Uses click counting + native `dblclick` so zoom isn't lost to two flips
 * when the second tap lands after a short delay.
 */
export function useCardFaceTap(options: {
  onFlip: () => void
  onToggleZoom: () => void
  enabled?: boolean
}): {
  onClick: (e: MouseEvent) => void
  onDoubleClick: (e: MouseEvent) => void
} {
  const { onFlip, onToggleZoom, enabled = true } = options
  const timerRef = useRef<number | null>(null)
  const clickCountRef = useRef(0)
  const zoomedFromClicksRef = useRef(false)
  const onFlipRef = useRef(onFlip)
  const onToggleZoomRef = useRef(onToggleZoom)
  onFlipRef.current = onFlip
  onToggleZoomRef.current = onToggleZoom

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(
    () => () => {
      clearTimer()
    },
    [clearTimer],
  )

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return
      if ('button' in e && e.button !== 0) return

      clickCountRef.current += 1
      clearTimer()

      if (clickCountRef.current >= 2) {
        clickCountRef.current = 0
        zoomedFromClicksRef.current = true
        onToggleZoomRef.current()
        return
      }

      zoomedFromClicksRef.current = false
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        clickCountRef.current = 0
        onFlipRef.current()
      }, DOUBLE_TAP_MS)
    },
    [clearTimer, enabled],
  )

  const onDoubleClick = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return
      e.preventDefault()
      e.stopPropagation()
      clearTimer()
      clickCountRef.current = 0
      // click×2 already toggled zoom; don't toggle again on the synthetic dblclick.
      if (zoomedFromClicksRef.current) {
        zoomedFromClicksRef.current = false
        return
      }
      onToggleZoomRef.current()
    },
    [clearTimer, enabled],
  )

  return { onClick, onDoubleClick }
}
