import { useLayoutEffect, useState, type RefObject } from 'react'
import type { AttackLink } from '../../game/types'

interface Point {
  x: number
  y: number
}

interface ResolvedArrow extends AttackLink {
  key: string
  fromPt: Point
  toPt: Point
  curve: number
  pathD: string
}

interface AttackArrowsProps {
  rootRef: RefObject<HTMLElement | null>
  links: AttackLink[]
  /** Remeasure when the board pan transform changes. */
  panOffset?: { x: number; y: number }
  /** Combat resolve pulse — brighter trails + traveling bolts. */
  resolving?: boolean
}

function centerOf(el: Element, root: DOMRect): Point {
  const r = el.getBoundingClientRect()
  return {
    x: r.left + r.width / 2 - root.left,
    y: r.top + r.height / 2 - root.top,
  }
}

function shorten(from: Point, to: Point, pad: number): { from: Point; to: Point } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const inset = Math.min(pad, len * 0.35)
  return {
    from: { x: from.x + ux * inset, y: from.y + uy * inset },
    to: { x: to.x - ux * inset, y: to.y - uy * inset },
  }
}

function readUiScale(root: HTMLElement): number {
  const raw = getComputedStyle(root).getPropertyValue('--arena-ui-scale').trim()
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function pathFor(from: Point, to: Point, curve: number): string {
  const midX = (from.x + to.x) / 2
  const midY = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const cx = midX - (dy / len) * curve
  const cy = midY + (dx / len) * curve
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`
}

export function AttackArrows({
  rootRef,
  links,
  panOffset,
  resolving = false,
}: AttackArrowsProps) {
  const [arrows, setArrows] = useState<ResolvedArrow[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || links.length === 0) {
      setArrows([])
      return
    }

    const measure = () => {
      const rr = root.getBoundingClientRect()
      const scale = readUiScale(root)
      const pad = 28 * scale
      const curve = 12 * scale
      setSize({ w: rr.width, h: rr.height })
      const next: ResolvedArrow[] = []
      for (const link of links) {
        const fromEl = root.querySelector(
          `[data-instance-id="${CSS.escape(link.from)}"]`,
        )
        const toEl = root.querySelector(
          `[data-instance-id="${CSS.escape(link.to)}"]`,
        )
        if (!fromEl || !toEl) continue
        const rawFrom = centerOf(fromEl, rr)
        const rawTo = centerOf(toEl, rr)
        const { from, to } = shorten(rawFrom, rawTo, pad)
        next.push({
          ...link,
          key: `${link.from}->${link.to}-${link.tone ?? 'player'}`,
          fromPt: from,
          toPt: to,
          curve,
          pathD: pathFor(from, to, curve),
        })
      }
      setArrows(next)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    const board =
      root.querySelector('.arena-board-pan') ??
      root.querySelector('.arena-battlefield')
    if (board) ro.observe(board)
    window.addEventListener('resize', measure)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(measure)
    })
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      cancelAnimationFrame(raf)
    }
  }, [rootRef, links, panOffset?.x, panOffset?.y])

  if (arrows.length === 0 || size.w === 0) return null

  return (
    <svg
      className={`attack-arrows${resolving ? ' is-resolving' : ''}`}
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
      aria-hidden
    >
      <defs>
        <marker
          id="attack-arrow-player"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="2.5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0.4 L5,2.5 L0,4.6 Z" className="attack-arrow-head is-player" />
        </marker>
        <marker
          id="attack-arrow-challenge"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="2.5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M0,0.4 L5,2.5 L0,4.6 Z"
            className="attack-arrow-head is-challenge"
          />
        </marker>
        <marker
          id="attack-arrow-block"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="2.5"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0.4 L5,2.5 L0,4.6 Z" className="attack-arrow-head is-block" />
        </marker>
        <radialGradient id="attack-bolt-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 236, 196, 0.95)" />
          <stop offset="55%" stopColor="rgba(232, 168, 90, 0.7)" />
          <stop offset="100%" stopColor="rgba(232, 168, 90, 0)" />
        </radialGradient>
        <radialGradient id="attack-bolt-glow-challenge" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 220, 200, 0.95)" />
          <stop offset="55%" stopColor="rgba(255, 120, 80, 0.75)" />
          <stop offset="100%" stopColor="rgba(255, 100, 60, 0)" />
        </radialGradient>
      </defs>
      {arrows.map((a) => {
        const tone = a.tone ?? 'player'
        return (
          <g key={a.key} className={`attack-arrow-group is-${tone}`}>
            <path
              className={`attack-arrow-line is-${tone}`}
              d={a.pathD}
              fill="none"
              markerEnd={`url(#attack-arrow-${tone})`}
            />
            {resolving ? (
              <circle
                className={`attack-bolt is-${tone}`}
                r={tone === 'challenge' ? 7 : 6}
                fill={
                  tone === 'challenge'
                    ? 'url(#attack-bolt-glow-challenge)'
                    : 'url(#attack-bolt-glow)'
                }
              >
                <animateMotion
                  dur="0.55s"
                  repeatCount="1"
                  fill="freeze"
                  path={a.pathD}
                  keyTimes="0;1"
                  calcMode="spline"
                  keySplines="0.22 0.61 0.36 1"
                />
              </circle>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
