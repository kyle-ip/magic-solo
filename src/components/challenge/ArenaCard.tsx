import type {
  ButtonHTMLAttributes,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
} from 'react'
import { assetUrl } from '../../utils/assetUrl'

interface ArenaCardProps {
  image: string
  name: string
  /** Used for attack-arrow targeting */
  instanceId?: string
  power?: number | null
  toughness?: number | null
  markedDamage?: number
  tapped?: boolean
  selected?: boolean
  attacking?: boolean
  targetable?: boolean
  /** Soft highlight: can be declared as attacker */
  attackReady?: boolean
  dimmed?: boolean
  compact?: boolean
  badge?: string | null
  /** Transient combat VFX */
  hitFx?: boolean
  strikeFx?: boolean
  floater?: { kind: 'damage' | 'attack' | 'heal' | 'mill'; amount?: number } | null
  /** Free-form note overlay on the card. */
  note?: string | null
  onClick?: () => void
  onDoubleClick?: MouseEventHandler<HTMLElement>
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onContextMenu?: MouseEventHandler<HTMLElement>
  onPointerDown?: PointerEventHandler<HTMLElement>
  children?: ReactNode
}

export function ArenaCard({
  image,
  name,
  instanceId,
  power,
  toughness,
  markedDamage = 0,
  tapped,
  selected,
  attacking,
  targetable,
  attackReady,
  dimmed,
  compact,
  badge,
  hitFx,
  strikeFx,
  floater,
  note,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onContextMenu,
  onPointerDown,
  children,
}: ArenaCardProps) {
  const className = [
    'arena-card',
    compact ? 'is-compact' : '',
    tapped ? 'is-tapped' : '',
    selected ? 'is-selected' : '',
    attacking ? 'is-attacking' : '',
    targetable ? 'is-targetable' : '',
    attackReady ? 'is-attack-ready' : '',
    dimmed ? 'is-dimmed' : '',
    hitFx ? 'is-hit' : '',
    strikeFx ? 'is-striking' : '',
    onPointerDown ? 'is-draggable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Card art already prints P/T — only overlay when damage changes the effective toughness.
  const showPt = power != null && toughness != null && markedDamage > 0
  const pt = showPt ? `${power}/${Math.max(0, toughness - markedDamage)}` : null

  const floaterText =
    floater?.amount != null
      ? floater.kind === 'heal'
        ? `+${floater.amount}`
        : floater.kind === 'attack'
          ? `${floater.amount}`
          : `−${floater.amount}`
      : null

  const inner = (
    <>
      <img src={assetUrl(image)} alt={name} draggable={false} />
      {badge ? <span className="arena-card-badge">{badge}</span> : null}
      {note ? <span className="arena-card-note">{note}</span> : null}
      {pt ? <span className="arena-card-pt">{pt}</span> : null}
      {markedDamage > 0 ? (
        <span className="arena-card-dmg">−{markedDamage}</span>
      ) : null}
      {floaterText ? (
        <span
          className={`combat-floater kind-${floater!.kind}`}
          key={`${floater!.kind}-${floaterText}`}
        >
          {floaterText}
        </span>
      ) : null}
      {children}
    </>
  )

  const dataProps = instanceId ? { 'data-instance-id': instanceId } : {}
  const interactive = Boolean(
    onClick || onDoubleClick || onPointerDown || onContextMenu,
  )

  if (interactive) {
    const btnProps: ButtonHTMLAttributes<HTMLButtonElement> = {
      type: 'button',
      className,
      onClick,
      onDoubleClick,
      onMouseEnter,
      onMouseLeave,
      onContextMenu,
      onPointerDown,
      onDragStart: (e) => e.preventDefault(),
      title: badge ? `${name} — ${badge}` : name,
      style: onPointerDown ? { touchAction: 'none', userSelect: 'none' } : undefined,
      ...dataProps,
    }
    return <button {...btnProps}>{inner}</button>
  }

  return (
    <div
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title={name}
      {...dataProps}
    >
      {inner}
    </div>
  )
}
