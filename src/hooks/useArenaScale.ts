import { useEffect, useState, type RefObject } from 'react'
import {
  computeArenaUiScale,
  ARENA_UI_SCALE_MAX,
  ARENA_UI_SCALE_MIN,
} from '../challenge/arenaScale'

/**
 * Track viewport (or element) size and return Challenge UI scale vs 1920×1080.
 * Writes --arena-ui-scale onto the target element when provided.
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
      const next = computeArenaUiScale(w, h, ARENA_UI_SCALE_MIN, ARENA_UI_SCALE_MAX)
      setScale(next)
      if (el) el.style.setProperty('--arena-ui-scale', String(next))
      else document.documentElement.style.setProperty('--arena-ui-scale', String(next))
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
      if (el) el.style.removeProperty('--arena-ui-scale')
      else document.documentElement.style.removeProperty('--arena-ui-scale')
    }
  }, [targetRef, enabled])

  return scale
}
