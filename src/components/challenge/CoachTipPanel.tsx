import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

const GEOM_KEY = 'magic-solo-coach-geom'

type Geom = { x: number; y: number; w: number; h: number }

const MIN_W = 220
const MIN_H = 96
const DEFAULT_W = 300
const DEFAULT_H = 132

function clampGeom(g: Geom, vw: number, vh: number): Geom {
  const w = Math.min(Math.max(g.w, MIN_W), Math.max(MIN_W, vw - 16))
  const h = Math.min(Math.max(g.h, MIN_H), Math.max(MIN_H, vh - 16))
  const x = Math.min(Math.max(g.x, 8), Math.max(8, vw - w - 8))
  const y = Math.min(Math.max(g.y, 8), Math.max(8, vh - h - 8))
  return { x, y, w, h }
}

function defaultGeom(vw: number, vh: number): Geom {
  return clampGeom(
    {
      x: vw - DEFAULT_W - 18,
      y: vh - DEFAULT_H - 28,
      w: DEFAULT_W,
      h: DEFAULT_H,
    },
    vw,
    vh,
  )
}

function readGeom(): Geom {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  try {
    const raw = localStorage.getItem(GEOM_KEY)
    if (!raw) return defaultGeom(vw, vh)
    const parsed = JSON.parse(raw) as Partial<Geom>
    if (
      typeof parsed.x !== 'number' ||
      typeof parsed.y !== 'number' ||
      typeof parsed.w !== 'number' ||
      typeof parsed.h !== 'number'
    ) {
      return defaultGeom(vw, vh)
    }
    return clampGeom(
      { x: parsed.x, y: parsed.y, w: parsed.w, h: parsed.h },
      vw,
      vh,
    )
  } catch {
    return defaultGeom(vw, vh)
  }
}

function persistGeom(g: Geom) {
  try {
    localStorage.setItem(GEOM_KEY, JSON.stringify(g))
  } catch {
    /* ignore quota */
  }
}

type Props = {
  label: string
  children: ReactNode
}

export function CoachTipPanel({ label, children }: Props) {
  const [geom, setGeom] = useState<Geom>(() => readGeom())
  const dragRef = useRef<{
    mode: 'move' | 'resize'
    ox: number
    oy: number
    sx: number
    sy: number
    sw: number
    sh: number
  } | null>(null)

  useEffect(() => {
    const onResize = () => {
      setGeom((g) => clampGeom(g, window.innerWidth, window.innerHeight))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (d.mode === 'move') {
      setGeom((g) =>
        clampGeom(
          { ...g, x: d.sx + (e.clientX - d.ox), y: d.sy + (e.clientY - d.oy) },
          vw,
          vh,
        ),
      )
    } else {
      setGeom((g) =>
        clampGeom(
          {
            ...g,
            w: d.sw + (e.clientX - d.ox),
            h: d.sh + (e.clientY - d.oy),
          },
          vw,
          vh,
        ),
      )
    }
  }, [])

  const endDrag = useCallback(() => {
    if (!dragRef.current) return
    dragRef.current = null
    setGeom((g) => {
      persistGeom(g)
      return g
    })
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', endDrag)
    window.removeEventListener('pointercancel', endDrag)
  }, [onPointerMove])

  const startDrag = useCallback(
    (mode: 'move' | 'resize', e: ReactPointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = {
        mode,
        ox: e.clientX,
        oy: e.clientY,
        sx: geom.x,
        sy: geom.y,
        sw: geom.w,
        sh: geom.h,
      }
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', endDrag)
      window.addEventListener('pointercancel', endDrag)
    },
    [endDrag, geom.h, geom.w, geom.x, geom.y, onPointerMove],
  )

  return (
    <aside
      className="coach-tip-float"
      role="status"
      style={{
        left: geom.x,
        top: geom.y,
        width: geom.w,
        height: geom.h,
      }}
    >
      <header
        className="coach-tip-float-head"
        onPointerDown={(e) => startDrag('move', e)}
      >
        <span className="coach-tip-label">{label}</span>
      </header>
      <div className="coach-tip-float-body">{children}</div>
      <button
        type="button"
        className="coach-tip-float-resize"
        aria-label="Resize"
        onPointerDown={(e) => startDrag('resize', e)}
      />
    </aside>
  )
}
