import { useEffect, useRef, type RefObject } from 'react'
import { renderCardToCanvas } from '../../editor/renderCardCanvas'
import type { EditorCardDocument } from '../../editor/types'

type CardPreviewCanvasProps = {
  doc: EditorCardDocument
  className?: string
  /** Optional ref to the live canvas for export. */
  canvasRef?: RefObject<HTMLCanvasElement | null>
}

export function CardPreviewCanvas({
  doc,
  className,
  canvasRef,
}: CardPreviewCanvasProps) {
  const localRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const genRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef?.current ?? localRef.current
    if (!canvas) return

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const gen = ++genRef.current
      const offscreen = document.createElement('canvas')
      void renderCardToCanvas(offscreen, doc, { scale: 1 }).then(() => {
        if (gen !== genRef.current) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        if (canvas.width !== offscreen.width) canvas.width = offscreen.width
        if (canvas.height !== offscreen.height) canvas.height = offscreen.height
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(offscreen, 0, 0)
      })
    })

    return () => cancelAnimationFrame(rafRef.current)
  }, [doc, canvasRef])

  return (
    <canvas
      ref={canvasRef ?? localRef}
      className={className ?? 'card-editor-preview-canvas'}
      width={745}
      height={1040}
      aria-label={doc.name}
    />
  )
}
