import { useCallback, useRef, useState } from 'react'
import type { DragPayload, DropTarget } from '../../assistant/dnd'

export type DragState = {
  payload: DragPayload
  x: number
  y: number
  image: string
  name: string
} | null

type Options = {
  onDrop: (payload: DragPayload, target: DropTarget) => void
  resolveDropTarget: (el: Element | null) => DropTarget | null
  /** Fires on pointer-up when the gesture never crossed the drag threshold. */
  onTap?: (payload: DragPayload) => void
}

const DRAG_THRESHOLD_PX = 6

export function usePointerDrag({ onDrop, resolveDropTarget, onTap }: Options) {
  const [drag, setDrag] = useState<DragState>(null)
  const dragRef = useRef<DragState>(null)
  const onDropRef = useRef(onDrop)
  const resolveRef = useRef(resolveDropTarget)
  const onTapRef = useRef(onTap)
  const cleanupRef = useRef<(() => void) | null>(null)
  onDropRef.current = onDrop
  resolveRef.current = resolveDropTarget
  onTapRef.current = onTap

  const startDrag = useCallback(
    (
      e: React.PointerEvent,
      payload: DragPayload,
      meta: { image: string; name: string },
    ) => {
      if (e.button !== 0) return
      // Allow double-click / click handlers; only capture after move threshold.
      e.stopPropagation()

      cleanupRef.current?.()

      const originX = e.clientX
      const originY = e.clientY
      let active = false
      const target = e.currentTarget as HTMLElement

      const pending: DragState = {
        payload,
        x: e.clientX,
        y: e.clientY,
        image: meta.image,
        name: meta.name,
      }

      const activate = (ev: PointerEvent) => {
        if (active) return
        active = true
        try {
          target.setPointerCapture(ev.pointerId)
        } catch {
          /* ignore */
        }
        window.getSelection()?.removeAllRanges()
        const next = { ...pending, x: ev.clientX, y: ev.clientY }
        dragRef.current = next
        setDrag(next)
      }

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - originX
        const dy = ev.clientY - originY
        if (!active) {
          if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return
          ev.preventDefault()
          activate(ev)
        }
        const cur = dragRef.current
        if (!cur) return
        ev.preventDefault()
        const moved = { ...cur, x: ev.clientX, y: ev.clientY }
        dragRef.current = moved
        setDrag(moved)
      }

      const finish = (ev: PointerEvent) => {
        const cur = dragRef.current
        const wasActive = active
        const cleanup = cleanupRef.current
        cleanupRef.current = null
        cleanup?.()
        dragRef.current = null
        setDrag(null)
        active = false

        try {
          if (target.hasPointerCapture(ev.pointerId)) {
            target.releasePointerCapture(ev.pointerId)
          }
        } catch {
          /* ignore */
        }

        if (!wasActive) {
          onTapRef.current?.(payload)
          return
        }
        if (!cur) return
        const el = document.elementFromPoint(ev.clientX, ev.clientY)
        const drop = resolveRef.current(el)
        if (drop) onDropRef.current(cur.payload, drop)
      }

      const prevent = (ev: Event) => {
        if (active) ev.preventDefault()
      }

      window.addEventListener('pointermove', onMove, { passive: false })
      window.addEventListener('pointerup', finish)
      window.addEventListener('pointercancel', finish)
      window.addEventListener('selectstart', prevent, true)
      window.addEventListener('dragstart', prevent, true)

      cleanupRef.current = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', finish)
        window.removeEventListener('pointercancel', finish)
        window.removeEventListener('selectstart', prevent, true)
        window.removeEventListener('dragstart', prevent, true)
      }
    },
    [],
  )

  return { drag, startDrag }
}

export function findDropAttr(el: Element | null): HTMLElement | null {
  let node: Element | null = el
  while (node) {
    if (node instanceof HTMLElement && node.dataset.dropZone) return node
    node = node.parentElement
  }
  return null
}
