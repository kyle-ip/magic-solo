import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { useCardFaceTap } from '../hooks/useCardFaceTap'

/** Shared flip / double-click zoom hit target for pack, collection, and deck details. */
export function CardFaceButton({
  onFlip,
  onToggleZoom,
  enabled = true,
  immediateFlip = false,
  className,
  style,
  ariaLabel,
  children,
}: {
  onFlip: () => void
  onToggleZoom: () => void
  enabled?: boolean
  /** Flip on first tap without waiting for double-tap detection. */
  immediateFlip?: boolean
  className?: string
  style?: CSSProperties
  ariaLabel: string
  children: ReactNode
}) {
  const { onClick, onDoubleClick, onPointerDown, onPointerUp } = useCardFaceTap({
    onFlip,
    onToggleZoom,
    enabled,
    immediateFlip,
  })

  const onKeyDown = (e: KeyboardEvent) => {
    if (!enabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onFlip()
    }
  }

  return (
    <div
      className={className}
      role="button"
      tabIndex={enabled ? 0 : -1}
      aria-label={ariaLabel}
      style={style}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  )
}
