import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

const PAN_THRESHOLD_PX = 4

/**
 * Drag-to-pan while art zoom is on (PC oversized zoom may clip edges).
 * Resets offset when zoom turns off.
 */
export function useArtZoomPan(zoomed: boolean): {
  panStyle: CSSProperties | undefined
  panBind: {
    onPointerDown: (e: ReactPointerEvent) => void
  }
  panning: boolean
} {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const offsetRef = useRef(offset)
  offsetRef.current = offset
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    if (!zoomed) {
      setOffset({ x: 0, y: 0 })
      setPanning(false)
      dragRef.current = null
    }
  }, [zoomed])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!zoomed || e.button !== 0) return
      const target = e.currentTarget as HTMLElement
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: offsetRef.current.x,
        originY: offsetRef.current.y,
        moved: false,
      }

      const onMove = (ev: PointerEvent) => {
        const drag = dragRef.current
        if (!drag || ev.pointerId !== drag.pointerId) return
        const dx = ev.clientX - drag.startX
        const dy = ev.clientY - drag.startY
        if (!drag.moved) {
          if (dx * dx + dy * dy < PAN_THRESHOLD_PX * PAN_THRESHOLD_PX) return
          drag.moved = true
          setPanning(true)
          try {
            target.setPointerCapture(ev.pointerId)
          } catch {
            /* ignore */
          }
        }
        ev.preventDefault()
        setOffset({
          x: drag.originX + dx,
          y: drag.originY + dy,
        })
      }

      const onUp = (ev: PointerEvent) => {
        const drag = dragRef.current
        if (!drag || ev.pointerId !== drag.pointerId) return
        const didPan = drag.moved
        dragRef.current = null
        setPanning(false)
        try {
          target.releasePointerCapture(ev.pointerId)
        } catch {
          /* ignore */
        }
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        // Swallow the click that follows a pan so we don't flip / toggle zoom.
        if (didPan) {
          const suppressClick = (clickEv: MouseEvent) => {
            clickEv.preventDefault()
            clickEv.stopPropagation()
            window.removeEventListener('click', suppressClick, true)
          }
          window.addEventListener('click', suppressClick, true)
          window.setTimeout(() => {
            window.removeEventListener('click', suppressClick, true)
          }, 0)
        }
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [zoomed],
  )

  return {
    panStyle: zoomed
      ? {
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          cursor: panning ? 'grabbing' : 'grab',
          touchAction: 'none',
        }
      : undefined,
    panBind: { onPointerDown },
    panning,
  }
}
