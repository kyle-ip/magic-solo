import {
  memo,
  type ButtonHTMLAttributes,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from 'react'
import { CardImage } from '../../hooks/useCardImageSrc'

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
  /** Bottom-left buff / monstrosity marker, e.g. "+2/+1" or "M +3/+3" */
  enhancement?: string | null
  /** Force showing the P/T chip even without damage */
  showPt?: boolean
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

function ArenaCardInner({
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
  enhancement,
  showPt = false,
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
    enhancement ? 'is-enhanced' : '',
    onPointerDown ? 'is-draggable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const damaged = toughness != null && markedDamage > 0
  const displayPt =
    toughness != null && (showPt || damaged || Boolean(enhancement))
      ? `${power ?? 0}/${Math.max(0, toughness - markedDamage)}`
      : null

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
      <CardImage
        localPath={image}
        kind="normal"
        alt={name}
        draggable={false}
      />
      {badge ? <span className="arena-card-badge">{badge}</span> : null}
      {note ? <span className="arena-card-note">{note}</span> : null}
      {enhancement ? (
        <span className="arena-card-buff" title={enhancement}>
          {enhancement}
        </span>
      ) : null}
      {markedDamage > 0 ? (
        <span className="arena-card-dmg" title={`−${markedDamage}`}>
          −{markedDamage}
        </span>
      ) : null}
      {displayPt ? (
        <span
          className={`arena-card-pt${damaged ? ' is-damaged' : ''}${
            enhancement && !damaged ? ' is-buffed' : ''
          }`}
          title={displayPt}
        >
          {displayPt}
        </span>
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

  const damageTitle =
    markedDamage > 0 && toughness != null
      ? `${name} (−${markedDamage}, ${power ?? 0}/${Math.max(0, toughness - markedDamage)})`
      : badge
        ? `${name} — ${badge}`
        : name

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
      title: damageTitle,
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
      title={damageTitle}
      {...dataProps}
    >
      {inner}
    </div>
  )
}

export const ArenaCard = memo(ArenaCardInner)
