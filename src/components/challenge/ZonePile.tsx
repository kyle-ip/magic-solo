import type {
  CSSProperties,
  MouseEventHandler,
  PointerEventHandler,
} from 'react'

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
  /** Optional card-back art for a physical stack look (library). */
  stackImage?: string
  /** Stable query hook for flight FX, e.g. `player-library`. */
  dataZone?: string
}

function stackDepth(count: number): number {
  if (count <= 0) return 0
  if (count <= 4) return 1
  if (count <= 16) return 2
  if (count <= 36) return 3
  return 4
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
  stackImage,
  dataZone,
}: ZonePileProps) {
  const interactive = Boolean(onClick || onDoubleClick || onPointerDown)
  const depth = stackDepth(count)
  const sheets = Math.max(depth, count > 0 ? 1 : 0)

  return (
    <button
      type="button"
      className={[
        'zone-pile',
        `kind-${kind}`,
        count <= 0 ? 'is-empty' : '',
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
      data-depth={depth}
      data-zone={dataZone}
    >
      <span className="zone-pile-stack" aria-hidden="true">
        {Array.from({ length: sheets }, (_, i) => (
          <span
            key={i}
            className={[
              'zone-pile-sheet',
              i === sheets - 1 ? 'is-top' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ '--sheet-i': i } as CSSProperties}
          >
            {i === sheets - 1 && stackImage ? (
              <img src={stackImage} alt="" draggable={false} />
            ) : null}
          </span>
        ))}
      </span>
      <span className="zone-pile-caption">
        <span className="zone-pile-label">{label}</span>
        <span className="zone-pile-count">{count}</span>
      </span>
    </button>
  )
}
