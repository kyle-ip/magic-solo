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

/**
 * Triangle fan matching the home hero reference:
 * Hydra left-back, Minotaur right-back (gap between top corners),
 * Xenagos upright in front, lower, overlapping both.
 */
const ORBIT_DEFAULTS: OrbitPos[] = [
  { leftPct: 8, topPct: 8, rotate: -7, z: 1 },
  { leftPct: 50, topPct: -1, rotate: 7, z: 2 },
  { leftPct: 30, topPct: 28, rotate: 0, z: 3 },
]

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
  const [positions, setPositions] = useState<OrbitPos[]>(() =>
    ORBIT_DEFAULTS.map((p) => ({ ...p })),
  )
  const positionsRef = useRef(positions)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

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

  const commitPositions = useCallback((next: OrbitPos[]) => {
    positionsRef.current = next
    setPositions(next)
  }, [])

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
      {decks.slice(0, 3).map((deck, i) => {
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
            fetchPriority={i === 0 ? 'high' : undefined}
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
