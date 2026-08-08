import type { MouseEventHandler, PointerEventHandler } from 'react'

interface ZonePileProps {
  label: string
  count: number
  kind: 'library' | 'graveyard' | 'exile'
  onClick?: () => void
  onDoubleClick?: () => void
  onContextMenu?: MouseEventHandler<HTMLButtonElement>
  onPointerDown?: PointerEventHandler<HTMLButtonElement>
  dropZone?: string
  dropPlacement?: string
  hint?: string
  activeDrop?: boolean
}

export function ZonePile({
  label,
  count,
  kind,
  onClick,
  onDoubleClick,
  onContextMenu,
  onPointerDown,
  dropZone,
  dropPlacement,
  hint,
  activeDrop,
}: ZonePileProps) {
  const interactive = Boolean(onClick || onDoubleClick || onPointerDown)
  return (
    <button
      type="button"
      className={[
        'zone-pile',
        `kind-${kind}`,
        activeDrop ? 'is-drop-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      disabled={!interactive && !dropZone}
      title={hint ? `${label}: ${count} — ${hint}` : `${label}: ${count}`}
      data-drop-zone={dropZone}
      data-drop-placement={dropPlacement}
    >
      <span className="zone-pile-stack" aria-hidden="true" />
      <span className="zone-pile-count">{count}</span>
      <span className="zone-pile-label">{label}</span>
    </button>
  )
}
