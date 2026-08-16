import { useEffect, useState, type RefObject } from 'react'
import {
  computeArenaUiScale,
  ARENA_UI_SCALE_MAX,
  ARENA_UI_SCALE_MIN,
  ARENA_VIEW_ZOOM,
} from '../challenge/arenaScale'
import { chromeScaleFromUiScale } from '../challenge/regionBudget'

/**
 * Track viewport (or element) size and return Challenge UI scale vs 1920×1080.
 * Writes --arena-ui-scale and --arena-chrome-scale onto the target element.
 * {@link ARENA_VIEW_ZOOM} multiplies those tokens (no CSS zoom — keeps fixed chrome docked).
 */
export function useArenaScale(
  targetRef?: RefObject<HTMLElement | null>,
  enabled = true,
): number {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (!enabled) {
      setScale(1)
      return
    }

    const read = () => {
      const el = targetRef?.current
      const w = el?.clientWidth || window.innerWidth
      const h = el?.clientHeight || window.innerHeight
      const base = computeArenaUiScale(w, h, ARENA_UI_SCALE_MIN, ARENA_UI_SCALE_MAX)
      const next = base * ARENA_VIEW_ZOOM
      const chrome = chromeScaleFromUiScale(base) * ARENA_VIEW_ZOOM
      setScale(next)
      const target = el ?? document.documentElement
      target.style.setProperty('--arena-ui-scale', String(next))
      target.style.setProperty('--arena-chrome-scale', String(chrome))
      target.style.setProperty('--arena-view-zoom', String(ARENA_VIEW_ZOOM))
    }

    read()

    const el = targetRef?.current
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => read())
        : null
    if (el && ro) ro.observe(el)
    else if (ro) ro.observe(document.documentElement)

    window.addEventListener('resize', read)
    return () => {
      window.removeEventListener('resize', read)
      ro?.disconnect()
      const target = el ?? document.documentElement
      target.style.removeProperty('--arena-ui-scale')
      target.style.removeProperty('--arena-chrome-scale')
      target.style.removeProperty('--arena-view-zoom')
    }
  }, [targetRef, enabled])

  return scale
}
