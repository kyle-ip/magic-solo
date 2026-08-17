import { useEffect, type RefObject } from 'react'

/**
 * While a floating card preview is open, forward mouse-wheel deltas to the
 * oracle/copy region — the pane is mostly pointer-events:none and follows the
 * cursor, so the wheel usually lands on the hovered card instead.
 */
export function usePreviewCopyWheel(
  enabled: boolean,
  paneRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!enabled) return

    const onWheel = (e: WheelEvent) => {
      const pane = paneRef.current
      if (!pane) return
      const copy = pane.querySelector('.card-preview-copy')
      if (!(copy instanceof HTMLElement)) return

      const canScroll = copy.scrollHeight > copy.clientHeight + 1
      if (!canScroll) return

      // Don't steal wheel from other scrollable UI (modals, logs, etc.).
      const rawTarget = e.target
      if (rawTarget instanceof Element) {
        const otherScroll = rawTarget.closest(
          '.assistant-modal, .prompt-backdrop, .arena-log, .pack-draw-modal',
        )
        if (otherScroll && !pane.contains(otherScroll)) return
      }

      const atTop = copy.scrollTop <= 0
      const atBottom =
        copy.scrollTop + copy.clientHeight >= copy.scrollHeight - 1
      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) return

      e.preventDefault()
      e.stopPropagation()
      copy.scrollTop += e.deltaY
    }

    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    return () => window.removeEventListener('wheel', onWheel, true)
  }, [enabled, paneRef])
}
