import {
  memo,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from 'react'
import { CardImage } from '../../hooks/useCardImageSrc'
import { parseManaCost, type ManaColor } from '../../game/mana'
import {
  KeywordGlyph,
  keywordLabel,
  normalizeBoardKeywords,
} from './keywordIcons'

export type ArenaCardVariant = 'full' | 'board'
export type ArenaFrameColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'M' | 'C'

export interface ArenaCounterBadge {
  id: string
  text: string
  title?: string
  tone?: 'buff' | 'gold' | 'neutral'
}

interface ArenaCardProps {
  image: string
  name: string
  /** Used for attack-arrow targeting */
  instanceId?: string
  /** `full` = hand/inspect face; `board` = battlefield (same full-card art as hand) */
  variant?: ArenaCardVariant
  /** Mana cost string e.g. `{2}{R}{G}` — drives board color rim */
  manaCost?: string | null
  /** Explicit colors (lands / produces) — overrides manaCost when set */
  colors?: ReadonlyArray<ManaColor> | null
  /** Keyword strings for board icons (flying, trample, …) */
  keywords?: ReadonlyArray<string> | null
  /** Prefer Chinese keyword tooltips */
  zhLabels?: boolean
  /** Top-right counter chips (+1/+1 stacks, monstrous, heads, …) */
  counters?: ReadonlyArray<ArenaCounterBadge> | null
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
  /** Play destroy / leave-battlefield exit animation */
  dying?: boolean
  onClick?: () => void
  onDoubleClick?: MouseEventHandler<HTMLElement>
  onMouseEnter?: MouseEventHandler<HTMLElement>
  onMouseLeave?: MouseEventHandler<HTMLElement>
  onContextMenu?: MouseEventHandler<HTMLElement>
  onPointerDown?: PointerEventHandler<HTMLElement>
  children?: ReactNode
}

export function frameColorFromMana(
  manaCost?: string | null,
  colors?: ReadonlyArray<ManaColor> | null,
): ArenaFrameColor {
  if (colors && colors.length > 0) {
    const unique = [...new Set(colors.filter((c) => c !== 'C'))]
    if (unique.length === 0) return 'C'
    if (unique.length === 1) return unique[0]!
    return 'M'
  }
  if (manaCost) {
    const p = parseManaCost(manaCost)
    const present = (['W', 'U', 'B', 'R', 'G'] as const).filter((c) => p[c] > 0)
    if (present.length === 0) return 'C'
    if (present.length === 1) return present[0]!
    return 'M'
  }
  return 'C'
}

function ArenaCardInner({
  image,
  name,
  instanceId,
  variant = 'full',
  manaCost,
  colors,
  keywords,
  zhLabels = false,
  counters,
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
  dying,
  onClick,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onContextMenu,
  onPointerDown,
  children,
}: ArenaCardProps) {
  const isBoard = variant === 'board'
  const frame = isBoard ? frameColorFromMana(manaCost, colors) : null
  const boardKeywords = isBoard && !compact ? normalizeBoardKeywords(keywords) : []
  const boardCounters =
    isBoard && !compact && counters?.length ? counters.slice(0, 3) : []

  const [ptFlash, setPtFlash] = useState<'up' | 'down' | null>(null)
  const [buffPop, setBuffPop] = useState(false)
  const [dmgPop, setDmgPop] = useState(false)
  const prevPt = useRef<{ p: number | null | undefined; t: number | null | undefined }>({
    p: power,
    t: toughness,
  })
  const prevEnh = useRef(enhancement ?? null)
  const prevDmg = useRef(markedDamage)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      prevPt.current = { p: power, t: toughness }
      prevEnh.current = enhancement ?? null
      prevDmg.current = markedDamage
      return
    }

    const prevPower = prevPt.current.p ?? 0
    const prevTough = prevPt.current.t ?? 0
    const nextPower = power ?? 0
    const nextTough = toughness ?? 0
    if (power != null || toughness != null) {
      if (nextPower > prevPower || nextTough > prevTough) {
        setPtFlash('up')
      } else if (nextPower < prevPower || nextTough < prevTough) {
        setPtFlash('down')
      }
    }
    prevPt.current = { p: power, t: toughness }

    const enh = enhancement ?? null
    if (enh && enh !== prevEnh.current) {
      setBuffPop(true)
    }
    prevEnh.current = enh

    if (markedDamage > prevDmg.current) {
      setDmgPop(true)
    }
    prevDmg.current = markedDamage
  }, [power, toughness, enhancement, markedDamage])

  useEffect(() => {
    if (!ptFlash) return
    const id = window.setTimeout(() => setPtFlash(null), 520)
    return () => window.clearTimeout(id)
  }, [ptFlash])

  useEffect(() => {
    if (!buffPop) return
    const id = window.setTimeout(() => setBuffPop(false), 560)
    return () => window.clearTimeout(id)
  }, [buffPop])

  useEffect(() => {
    if (!dmgPop) return
    const id = window.setTimeout(() => setDmgPop(false), 560)
    return () => window.clearTimeout(id)
  }, [dmgPop])

  const className = [
    'arena-card',
    isBoard ? 'is-board' : 'is-full',
    frame ? `is-frame-${frame}` : '',
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
    boardKeywords.length ? 'has-keywords' : '',
    boardCounters.length ? 'has-counters' : '',
    ptFlash === 'up' ? 'is-pt-flash-up' : '',
    ptFlash === 'down' ? 'is-pt-flash-down' : '',
    buffPop ? 'is-buff-pop' : '',
    dmgPop ? 'is-dmg-pop' : '',
    dying ? 'is-dying' : '',
    onPointerDown ? 'is-draggable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const damaged = toughness != null && markedDamage > 0
  const forcePt = showPt || isBoard
  const displayPt =
    toughness != null && (forcePt || damaged || Boolean(enhancement))
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

  const imageKind = 'normal'

  const inner = (
    <>
      <span className="arena-card-art">
        <CardImage
          localPath={image}
          kind={imageKind}
          alt={name}
          draggable={false}
        />
      </span>
      {isBoard ? <span className="arena-card-frame-bar" aria-hidden="true" /> : null}
      {boardCounters.length ? (
        <span className="arena-card-counters" aria-hidden="true">
          {boardCounters.map((c) => (
            <span
              key={c.id}
              className={`arena-card-counter tone-${c.tone ?? 'neutral'}`}
              title={c.title ?? c.text}
            >
              {c.text}
            </span>
          ))}
        </span>
      ) : null}
      {boardKeywords.length ? (
        <span className="arena-card-keywords" aria-hidden="true">
          {boardKeywords.map((id) => (
            <span
              key={id}
              className={`arena-kw is-${id}`}
              title={keywordLabel(id, zhLabels)}
            >
              <KeywordGlyph id={id} />
            </span>
          ))}
        </span>
      ) : null}
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
