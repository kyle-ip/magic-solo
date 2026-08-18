import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CardImage } from '../hooks/useCardImageSrc'

export type OrbitDeckPreview = {
  code: string
  thumb: string | undefined
  localizedName: string
}

type OrbitPos = {
  leftPct: number
  topPct: number
  rotate: number
  z: number
}

/** Visual order: God left, Hydra center-front, Horde right-back. */
const ORBIT_ORDER = [ 'tdag', 'tfth', 'tbth'] as const

/**
 * Triangle fan:
 * Xenagos left (over Horde), Hydra center on top of Xenagos,
 * Minotaur right-back under Xenagos.
 */
const ORBIT_DEFAULTS: OrbitPos[] = [
  { leftPct: 8, topPct: 8, rotate: 0, z: 1 },
  { leftPct: 28, topPct: 30, rotate: -4, z: 3 },
  { leftPct: 50, topPct: 0, rotate: 8, z: 2 },
]

/** Compact cluster so the front card stays inside the short mobile art box. */
const ORBIT_DEFAULTS_NARROW: OrbitPos[] = [
  { leftPct: 10, topPct: 7, rotate: 0, z: 1 },
  { leftPct: 30, topPct: 20, rotate: -4, z: 3 },
  { leftPct: 55, topPct: 3, rotate: 8, z: 2 },
]

function orderedOrbitDecks(decks: OrbitDeckPreview[]): OrbitDeckPreview[] {
  const byCode = new Map(decks.map((d) => [d.code, d]))
  const ordered: OrbitDeckPreview[] = []
  for (const code of ORBIT_ORDER) {
    const deck = byCode.get(code)
    if (deck) ordered.push(deck)
  }
  for (const deck of decks) {
    if (ordered.length >= 3) break
    if (!ordered.some((d) => d.code === deck.code)) ordered.push(deck)
  }
  return ordered.slice(0, 3)
}

const NARROW_ORBIT_MQ = '(max-width: 900px)'

function orbitDefaults(): OrbitPos[] {
  const narrow =
    typeof window !== 'undefined' && window.matchMedia(NARROW_ORBIT_MQ).matches
  return (narrow ? ORBIT_DEFAULTS_NARROW : ORBIT_DEFAULTS).map((p) => ({ ...p }))
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

type DragSession = {
  index: number
  pointerId: number
  originX: number
  originY: number
  startLeft: number
  startTop: number
  boxW: number
  boxH: number
  target: HTMLElement
}

type Props = {
  decks: OrbitDeckPreview[]
}

export function HomeOrbitArt({ decks }: Props) {
  const { t } = useTranslation()
  const artRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragSession | null>(null)
  const [positions, setPositions] = useState<OrbitPos[]>(orbitDefaults)
  const positionsRef = useRef(positions)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const orbitDecks = orderedOrbitDecks(decks)

  const commitPositions = useCallback((next: OrbitPos[]) => {
    positionsRef.current = next
    setPositions(next)
  }, [])

  useEffect(() => {
    // Drop legacy home-orbit layout keys from earlier iterations.
    try {
      localStorage.removeItem('magic-solo:home-orbit-v1')
      localStorage.removeItem('magic-solo:home-orbit-v2')
      localStorage.removeItem('magic-solo:home-orbit-v3')
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia(NARROW_ORBIT_MQ)
    const apply = () => {
      if (dragRef.current) return
      commitPositions(orbitDefaults())
    }
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [commitPositions])

  useEffect(() => {
    if (draggingIndex === null) return

    const onMove = (ev: PointerEvent) => {
      const session = dragRef.current
      if (!session || session.pointerId !== ev.pointerId) return
      ev.preventDefault()
      const dxPct = ((ev.clientX - session.originX) / session.boxW) * 100
      const dyPct = ((ev.clientY - session.originY) / session.boxH) * 100
      const leftPct = clamp(session.startLeft + dxPct, -8, 72)
      const topPct = clamp(session.startTop + dyPct, -8, 62)
      const prev = positionsRef.current
      commitPositions(
        prev.map((p, i) => (i === session.index ? { ...p, leftPct, topPct } : p)),
      )
    }

    const onUp = (ev: PointerEvent) => {
      const session = dragRef.current
      if (!session || session.pointerId !== ev.pointerId) return
      try {
        if (session.target.hasPointerCapture(ev.pointerId)) {
          session.target.releasePointerCapture(ev.pointerId)
        }
      } catch {
        /* ignore */
      }
      dragRef.current = null
      setDraggingIndex(null)
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [draggingIndex, commitPositions])

  const onPointerDown = useCallback(
    (index: number) => (e: ReactPointerEvent<HTMLImageElement>) => {
      if (e.button !== 0) return
      const box = artRef.current?.getBoundingClientRect()
      if (!box || box.width < 1 || box.height < 1) return
      e.preventDefault()
      e.stopPropagation()
      const el = e.currentTarget
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      const prev = positionsRef.current
      const pos = prev[index] ?? ORBIT_DEFAULTS[index]
      dragRef.current = {
        index,
        pointerId: e.pointerId,
        originX: e.clientX,
        originY: e.clientY,
        startLeft: pos.leftPct,
        startTop: pos.topPct,
        boxW: box.width,
        boxH: box.height,
        target: el,
      }
      const maxZ = Math.max(...prev.map((p) => p.z))
      commitPositions(prev.map((p, i) => (i === index ? { ...p, z: maxZ + 1 } : p)))
      setDraggingIndex(index)
    },
    [commitPositions],
  )

  return (
    <div
      ref={artRef}
      className="home-hero-art"
      role="group"
      aria-label={t('home.orbitArtLabel')}
    >
      {orbitDecks.map((deck, i) => {
        const pos = positions[i] ?? ORBIT_DEFAULTS[i]
        const dragging = draggingIndex === i
        return (
          <CardImage
            key={deck.code}
            className={`orbit-card orbit-${i} is-draggable${dragging ? ' is-dragging' : ''}`}
            localPath={deck.thumb}
            kind="normal"
            alt={deck.localizedName}
            draggable={false}
            fetchPriority={i === 1 ? 'high' : undefined}
            style={{
              left: `${pos.leftPct}%`,
              top: `${pos.topPct}%`,
              right: 'auto',
              bottom: 'auto',
              zIndex: pos.z,
              transform: `rotate(${pos.rotate}deg) scale(var(--card-img-scale))`,
            }}
            onPointerDown={onPointerDown(i)}
          />
        )
      })}
    </div>
  )
}
