import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useSwipeNavigate } from '../hooks/useSwipeNavigate'
import { assetUrl } from '../utils/assetUrl'
import '../styles/pack.css'
import '../styles/deck.css'
import { CardFaceButton } from './CardFaceButton'
import {
  addCollected,
  clearCollected,
  collectionRarityStats,
  exportCollectionJson,
  importCollectionJson,
  isCollected,
  listCollected,
  removeCollected,
  updateCollected,
  type CollectedCard,
} from '../data/packCollection'
import {
  filterAndSortCollection,
  uniqueSetCodes,
  type CollectionColorFilter,
  type CollectionRarityFilter,
  type CollectionSort,
} from '../data/packCollectionQuery'
import {
  defaultCardBackUrl,
  drawWeightedPack,
  enrichDrawnCardZh,
  hasZhPrint,
  wantsZh,
  type DrawnCard,
} from '../data/randomCard'
import { CardDetailsBody } from './CardDetailsBody'

const PACK_ART = assetUrl('assets/pack/booster-pack.png')
const TEAR_EDGE = assetUrl('assets/pack/tear-edge.png')
const PACK_SIZE = 3

type RevealPhase = 'sealed' | 'tearing' | 'parting' | 'pull' | 'flip' | 'revealed'
type ModalView = 'pack' | 'collection'

/** Tear pace while the request is in flight (masks latency, must not outlast a fast response). */
const TEAR_PACE_MS = 620
/** Shortest tear so a cached/fast reply still reads as an open — not a hard wait after data arrives. */
const TEAR_FLOOR_MS = 260
/** One motion: finish the rip and fly halves away. */
const EXIT_MS = 300
/** Same in-pack stack scales up before the deck peeks settle. */
const EXPAND_MS = 400
const FLIP_MS = 400

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Random peel direction in degrees (0 = right, 90 = down). Not limited to axis-aligned. */
function randomTearAngle(): number {
  return Math.random() * 360
}

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) ** 3
}

function hash01(seed: number, i: number): number {
  const x = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** Multi-frequency offset in [-1, 1] for a paper-like serration. */
function jaggedNoise(seed: number, i: number): number {
  const a = hash01(seed, i) * 2 - 1
  const b = hash01(seed + 17, i * 2 + 1) * 2 - 1
  const c = hash01(seed + 31, Math.floor(i / 2)) * 2 - 1
  return a * 0.52 + b * 0.33 + c * 0.15
}

/** Irregular spacing along [0,1] so teeth aren't a even comb. */
function irregularParams(seed: number, count: number): number[] {
  const params = [0]
  for (let i = 1; i < count; i++) {
    const base = i / count
    const jitter = (hash01(seed + 41, i) - 0.5) * (0.7 / count)
    params.push(Math.min(0.985, Math.max(0.015, base + jitter)))
  }
  params.push(1)
  params.sort((a, b) => a - b)
  params[0] = 0
  params[params.length - 1] = 1
  return params
}

function formatPolygon(pts: [number, number][]): string {
  return (
    'polygon(' +
    pts
      .map(([x, y]) => (x * 100).toFixed(2) + '% ' + (y * 100).toFixed(2) + '%')
      .join(', ') +
    ')'
  )
}

/** Intersect a line through the unit square; return entry/exit points. */
function unitSquareSpan(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
): [[number, number], [number, number]] {
  const hits: number[] = []
  const tryT = (t: number | null) => {
    if (t == null || !Number.isFinite(t)) return
    const x = ox + t * dx
    const y = oy + t * dy
    if (x >= -1e-5 && x <= 1 + 1e-5 && y >= -1e-5 && y <= 1 + 1e-5) hits.push(t)
  }
  tryT(dx !== 0 ? (0 - ox) / dx : null)
  tryT(dx !== 0 ? (1 - ox) / dx : null)
  tryT(dy !== 0 ? (0 - oy) / dy : null)
  tryT(dy !== 0 ? (1 - oy) / dy : null)
  hits.sort((a, b) => a - b)
  const uniq: number[] = []
  for (const t of hits) {
    if (uniq.length === 0 || Math.abs(uniq[uniq.length - 1] - t) > 1e-5) uniq.push(t)
  }
  if (uniq.length < 2) {
    return [
      [0.5 - dx * 0.75, 0.5 - dy * 0.75],
      [0.5 + dx * 0.75, 0.5 + dy * 0.75],
    ]
  }
  const t0 = uniq[0]
  const t1 = uniq[uniq.length - 1]
  return [
    [ox + t0 * dx, oy + t0 * dy],
    [ox + t1 * dx, oy + t1 * dy],
  ]
}

type TearSpec = {
  angleDeg: number
  peelClip: string
  remainClip: string
  /** Unit-space seam points for overlays. */
  seam: [number, number][]
  /** Mild twist so halves don’t look hinged. */
  twistBias: number
}

/** Map a point on the unit-square border to perimeter parameter in [0, 4). */
function borderParam(x: number, y: number): number {
  const eps = 1e-4
  if (Math.abs(y) <= eps) return x // top 0→1
  if (Math.abs(x - 1) <= eps) return 1 + y // right 1→2
  if (Math.abs(y - 1) <= eps) return 2 + (1 - x) // bottom 2→3
  if (Math.abs(x) <= eps) return 3 + (1 - y) // left 3→4
  // Fallback: project to nearest edge
  const d = [
    { p: x, e: 0, dist: Math.abs(y) },
    { p: 1 + y, e: 1, dist: Math.abs(x - 1) },
    { p: 2 + (1 - x), e: 2, dist: Math.abs(y - 1) },
    { p: 3 + (1 - y), e: 3, dist: Math.abs(x) },
  ]
  d.sort((a, b) => a.dist - b.dist)
  return d[0].p
}

function pointOnBorder(param: number): [number, number] {
  let t = ((param % 4) + 4) % 4
  if (t < 1) return [t, 0]
  if (t < 2) return [1, t - 1]
  if (t < 3) return [1 - (t - 2), 1]
  return [0, 1 - (t - 3)]
}

/** Walk unit-square border from `from` toward `to` by the shorter arc that prefers `keepSide`. */
function borderWalk(
  from: [number, number],
  to: [number, number],
  nx: number,
  ny: number,
  positive: boolean,
): [number, number][] {
  const a = borderParam(from[0], from[1])
  const b = borderParam(to[0], to[1])
  const keep = positive ? 1 : -1
  const side = (x: number, y: number) => nx * (x - 0.5) + ny * (y - 0.5)

  const score = (forward: boolean) => {
    let len = forward ? (b - a + 4) % 4 : (a - b + 4) % 4
    if (len < 1e-6) len = 4
    let acc = 0
    const samples = 8
    for (let i = 1; i <= samples; i++) {
      const u = i / (samples + 1)
      const p = forward ? (a + len * u) % 4 : (a - len * u + 4) % 4
      const [x, y] = pointOnBorder(p)
      acc += side(x, y) * keep
    }
    return acc
  }

  const forward = score(true) >= score(false)
  let len = forward ? (b - a + 4) % 4 : (a - b + 4) % 4
  if (len < 1e-6) len = 0
  const out: [number, number][] = []
  // Insert corners crossed along the walk (not endpoints).
  const corners = [0, 1, 2, 3, 4]
  for (const c of corners) {
    let hit = false
    if (forward) {
      const end = a + len
      if (c > a + 1e-6 && c < end - 1e-6) hit = true
      if (end > 4 && c + 4 > a + 1e-6 && c + 4 < end - 1e-6) hit = true
    } else {
      const end = a - len
      if (c < a - 1e-6 && c > end + 1e-6) hit = true
      if (end < 0 && c - 4 < a - 1e-6 && c - 4 > end + 1e-6) hit = true
    }
    if (hit) out.push(pointOnBorder(c))
  }
  // Order corners along the walk
  out.sort((p, q) => {
    const dp = borderParam(p[0], p[1])
    const dq = borderParam(q[0], q[1])
    if (forward) {
      const rp = (dp - a + 4) % 4
      const rq = (dq - a + 4) % 4
      return rp - rq
    }
    const rp = (a - dp + 4) % 4
    const rq = (a - dq + 4) % 4
    return rp - rq
  })
  return out
}

/** Build complementary jagged clip-paths once per open (stable across RAF). */
function createTearSpec(angleDeg: number): TearSpec {
  const rad = (angleDeg * Math.PI) / 180
  const nx = Math.cos(rad)
  const ny = Math.sin(rad)
  const tx = -ny
  const ty = nx
  const seed = Math.floor(Math.random() * 10_000) + 1
  // Organic rip: denser teeth, uneven spacing, occasional deep bites.
  const teeth = 15 + Math.floor(Math.random() * 6) // 15–20
  const amp = 0.02 + Math.random() * 0.014 // ~2.0%–3.4% of pack
  const twistBias = (Math.random() * 2 - 1) * 1.8
  // Tiny gap between complementary clips so the crack reads as a dark seam.
  const crackGap = 0.0038 + Math.random() * 0.0014

  const [start, end] = unitSquareSpan(0.5, 0.5, tx, ty)
  const params = irregularParams(seed, teeth)
  const waveFreq = 1.8 + hash01(seed, 5) * 1.4
  const seam: [number, number][] = []
  for (let i = 0; i < params.length; i++) {
    const u = params[i]
    let x = start[0] + (end[0] - start[0]) * u
    let y = start[1] + (end[1] - start[1]) * u
    // Fuller mid-pack tear; pin the rim endpoints.
    const envelope = Math.pow(Math.sin(u * Math.PI), 0.72)
    const wave = Math.sin(u * Math.PI * waveFreq + hash01(seed, 8) * 6) * 0.38
    const tooth = jaggedNoise(seed, i)
    // Sharp micro-nicks between larger fibers
    const nick =
      (hash01(seed + 19, i * 3) * 2 - 1) *
      (hash01(seed + 23, i) > 0.55 ? 0.55 : 0.18)
    // Occasional deeper bite for a ripped look
    const bite =
      hash01(seed + 9, i) > 0.78
        ? (hash01(seed + 11, i) * 2 - 1) * 0.7
        : 0
    const jag =
      (wave * 0.28 + tooth * 0.42 + nick * 0.22 + bite * 0.38) * amp * envelope
    x += nx * jag
    y += ny * jag
    if (i === 0 || i === params.length - 1) {
      x = i === 0 ? start[0] : end[0]
      y = i === 0 ? start[1] : end[1]
    }
    seam.push([
      Math.min(1, Math.max(0, x)),
      Math.min(1, Math.max(0, y)),
    ])
  }

  const halfPolygon = (positive: boolean): string => {
    const sign = positive ? 1 : -1
    const raw = positive ? seam : [...seam].reverse()
    // Push interior seam points inward so a thin crack opens; keep rim pins tight.
    const edge: [number, number][] = raw.map(([x, y], i) => {
      if (i === 0 || i === raw.length - 1) return [x, y]
      return [
        Math.min(1, Math.max(0, x + nx * crackGap * sign)),
        Math.min(1, Math.max(0, y + ny * crackGap * sign)),
      ]
    })
    const mid = borderWalk(
      edge[edge.length - 1],
      edge[0],
      nx,
      ny,
      positive,
    )
    return formatPolygon([...edge, ...mid])
  }

  return {
    angleDeg,
    peelClip: halfPolygon(true),
    remainClip: halfPolygon(false),
    seam,
    twistBias,
  }
}

/**
 * 2D rip along a jagged seam: halves move opposite along the tear normal.
 * progress 0→1 = tear open; >1 = fly farther apart and fade.
 */
function tear2dStyles(
  spec: TearSpec,
  progress: number,
  packAlongPx = 280,
): { peel: CSSProperties; remain: CSSProperties; seamOpacity: number } {
  const p = Math.max(0, progress)
  const rad = (spec.angleDeg * Math.PI) / 180
  const nx = Math.cos(rad)
  const ny = Math.sin(rad)
  const unit = Math.max(44, Math.min(packAlongPx * 0.26, 100))
  const sep = Math.min(p, 2.4) * unit
  const rot = Math.min(p, 2.4) * (packAlongPx < 260 ? 12 : 9)
  const fade = p <= 1 ? 1 : Math.max(0, 1 - (p - 1) / 1.35)
  const twist =
    rot * (0.55 + Math.abs(Math.sin(rad * 2)) * 0.45) +
    spec.twistBias * Math.min(1, p)
  // Fibers peak early while the crack is readable, then fade as halves fly.
  const seamOpacity =
    p <= 0.12 ? p / 0.12 : Math.max(0, 1 - (p - 0.12) / 0.88)

  return {
    peel: {
      clipPath: spec.peelClip,
      transform:
        'translate3d(' +
        (nx * sep).toFixed(1) +
        'px, ' +
        (ny * sep).toFixed(1) +
        'px, 0) rotate(' +
        twist.toFixed(2) +
        'deg)',
      opacity: fade,
    },
    remain: {
      clipPath: spec.remainClip,
      transform:
        'translate3d(' +
        (-nx * sep).toFixed(1) +
        'px, ' +
        (-ny * sep).toFixed(1) +
        'px, 0) rotate(' +
        (-twist).toFixed(2) +
        'deg)',
      opacity: fade,
    },
    seamOpacity,
  }
}

function rarityFxClass(card: DrawnCard | null | undefined): string {
  if (!card) return ''
  const r = card.rarity
  if (r === 'mythic' || r === 'special') return 'pack-fx-mythic'
  if (r === 'rare') return 'pack-fx-rare'
  if (r === 'uncommon') return 'pack-fx-uncommon'
  return 'pack-fx-common'
}

/** Peak flash duration — shared across all rarity tiers (ms). */
function rarityFxDurationMs(_card: DrawnCard): number {
  return 2500
}

const FX_FADE_MS = 900

/** Odd flipTurns show card art (`.card-face.back`). */
function isShowingCardFront(turns: number): boolean {
  return turns % 2 === 1
}

export function PackDrawButton() {
  const { t, i18n } = useTranslation()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ModalView>('pack')
  const [phase, setPhase] = useState<RevealPhase>('sealed')
  const [cards, setCards] = useState<DrawnCard[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [flipTurns, setFlipTurns] = useState<number[]>(() =>
    Array.from({ length: PACK_SIZE }, () => 0),
  )
  const [flippingIdx, setFlippingIdx] = useState<number | null>(null)
  const [deckFlipping, setDeckFlipping] = useState(false)
  const [tearAngle, setTearAngle] = useState(0)
  const [fxIds, setFxIds] = useState<string[]>([])
  const [fxFadeIds, setFxFadeIds] = useState<string[]>([])
  const [drawing, setDrawing] = useState(false)
  const [collected, setCollected] = useState(false)
  const [collection, setCollection] = useState<CollectedCard[]>([])
  const [inspect, setInspect] = useState<CollectedCard | null>(null)
  const [inspectFlipTurns, setInspectFlipTurns] = useState(0)
  const [inspectFlipping, setInspectFlipping] = useState(false)
  /** Double-click toggles large art preview inside the detail layout. */
  const [artZoomed, setArtZoomed] = useState(false)
  const [filterRarity, setFilterRarity] =
    useState<CollectionRarityFilter>('all')
  const [filterColor, setFilterColor] =
    useState<CollectionColorFilter>('all')
  const [filterSet, setFilterSet] = useState('')
  const [sortBy, setSortBy] = useState<CollectionSort>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const enrichGen = useRef(0)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const drawPromise = useRef<Promise<DrawnCard[]> | null>(null)
  const timers = useRef<number[]>([])
  const fxTimers = useRef<number[]>([])
  const tearRaf = useRef(0)
  const tearProgressRef = useRef(0)
  const tearAngleRef = useRef(0)
  const tearSpecRef = useRef<TearSpec | null>(null)
  const peelRef = useRef<HTMLSpanElement | null>(null)
  const remainRef = useRef<HTMLSpanElement | null>(null)
  const packShellRef = useRef<HTMLDivElement | null>(null)
  const peelEdgeRef = useRef<HTMLSpanElement | null>(null)
  const remainEdgeRef = useRef<HTMLSpanElement | null>(null)
  /** Bumps on each FX trigger so CSS one-shots remount and restart. */
  const [fxEpoch, setFxEpoch] = useState(0)

  const clearTimers = () => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }

  const clearFxTimers = () => {
    for (const id of fxTimers.current) window.clearTimeout(id)
    fxTimers.current = []
  }

  const scheduleFx = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    fxTimers.current.push(id)
  }

  const clearTearRaf = () => {
    if (tearRaf.current) {
      cancelAnimationFrame(tearRaf.current)
      tearRaf.current = 0
    }
  }

  const measurePackAlong = () => {
    const el = packShellRef.current
    if (!el) return 280
    const along = Math.max(el.clientWidth, el.clientHeight)
    return along > 0 ? along : 280
  }

  const applyClipPath = (el: HTMLElement, value: string) => {
    el.style.clipPath = value
    // iOS Safari still needs the prefixed property for JS-driven polygons.
    el.style.setProperty('-webkit-clip-path', value)
  }

  const applyTearVisual = (progress: number) => {
    const spec = tearSpecRef.current
    if (!spec) return
    tearProgressRef.current = progress
    const flaps = tear2dStyles(spec, progress, measurePackAlong())
    if (peelRef.current) {
      applyClipPath(peelRef.current, String(flaps.peel.clipPath ?? ''))
      peelRef.current.style.transform = String(flaps.peel.transform ?? 'none')
      peelRef.current.style.opacity = String(flaps.peel.opacity ?? 1)
    }
    if (remainRef.current) {
      applyClipPath(remainRef.current, String(flaps.remain.clipPath ?? ''))
      remainRef.current.style.transform = String(flaps.remain.transform ?? 'none')
      remainRef.current.style.opacity = String(flaps.remain.opacity ?? 1)
    }
    if (peelEdgeRef.current) {
      peelEdgeRef.current.style.opacity = String(flaps.seamOpacity * 0.95)
    }
    if (remainEdgeRef.current) {
      remainEdgeRef.current.style.opacity = String(flaps.seamOpacity * 0.95)
    }
  }

  const waitAnimationFrame = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
  }

  const resetPack = useCallback(() => {
    clearTimers()
    clearFxTimers()
    clearTearRaf()
    drawPromise.current = null
    enrichGen.current += 1
    setPhase('sealed')
    setCards([])
    setActiveIdx(0)
    setFlipTurns(Array.from({ length: PACK_SIZE }, () => 0))
    tearProgressRef.current = 0
    tearSpecRef.current = null
    setFxIds([])
    setFxFadeIds([])
    setFxEpoch(0)
    setDrawing(false)
    setCollected(false)
    setInspect(null)
    setInspectFlipTurns(0)
    setInspectFlipping(false)
    setArtZoomed(false)
    setFlippingIdx(null)
    setDeckFlipping(false)
    setView('pack')
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (artZoomed) {
          setArtZoomed(false)
          return
        }
        if (clearConfirmOpen) {
          setClearConfirmOpen(false)
          return
        }
        if (inspect) {
          setInspect(null)
          setArtZoomed(false)
          return
        }
        if (view === 'collection') {
          setView('pack')
          return
        }
        setOpen(false)
        return
      }
      if (inspect) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          stepInspect(-1)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          stepInspect(1)
        }
        return
      }
      if (view !== 'pack') return
      if (phase !== 'revealed' && phase !== 'flip') return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        selectCard(activeIdx - 1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        selectCard(activeIdx + 1)
      }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, view, inspect, phase, activeIdx, cards.length, clearConfirmOpen, artZoomed])

  useEffect(() => {
    if (!open) {
      resetPack()
      return
    }
    setCollection(listCollected())
  }, [open, resetPack])

  useEffect(() => () => {
    clearTimers()
    clearFxTimers()
    clearTearRaf()
  }, [])

  const triggerFrontFx = (card: DrawnCard | null | undefined) => {
    // Still apply glow classes when reduced-motion is on — CSS keeps a static
    // peak (box-shadow) so phones with "Reduce Motion" aren't FX-blank.
    if (!card) return
    const id = card.id
    // Always restart from a clean slate so switching cards remounts animations.
    clearFxTimers()
    setFxFadeIds([])
    setFxIds([])
    setFxEpoch((n) => n + 1)
    // Double-rAF: wait until is-flipping has painted clear. WebKit will not
    // restart animations that began under `.is-flipping { animation: none }`.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFxIds([id])
        scheduleFx(() => {
          setFxIds((prev) => prev.filter((x) => x !== id))
          setFxFadeIds([id])
          scheduleFx(() => {
            setFxFadeIds((prev) => prev.filter((x) => x !== id))
          }, FX_FADE_MS)
        }, rarityFxDurationMs(card))
      })
    })
  }

  const finishReveal = (drawn: DrawnCard[]) => {
    setCards(drawn)
    setActiveIdx(0)
    setCollected(isCollected(drawn[0]?.id ?? ''))
    setPhase('flip')
    setDeckFlipping(true)
    requestAnimationFrame(() => {
      setFlipTurns(drawn.map(() => 1))
    })
    const flipMs = prefersReducedMotion() ? 0 : FLIP_MS
    schedule(() => {
      setDeckFlipping(false)
      setPhase('revealed')
      // Glow must start after is-flipping clears (Safari animation restart).
      triggerFrontFx(drawn[0])
    }, flipMs)
    hydratePackZh(drawn)
  }

  const hydratePackZh = (drawn: DrawnCard[]) => {
    if (!wantsZh()) return
    const gen = ++enrichGen.current
    drawn.forEach((card, index) => {
      if (hasZhPrint(card) || !card.oracleId || card.source === 'local') return
      void enrichDrawnCardZh(card).then((enriched) => {
        if (gen !== enrichGen.current) return
        if (!hasZhPrint(enriched)) return
        setCards((prev) => {
          if (prev[index]?.id !== card.id) return prev
          const next = prev.slice()
          next[index] = enriched
          return next
        })
        if (isCollected(card.id)) {
          setCollection(updateCollected(enriched))
        }
      })
    })
  }

  const showRevealCard =
    phase === 'tearing' ||
    phase === 'parting' ||
    phase === 'pull' ||
    phase === 'flip' ||
    phase === 'revealed'
  const cardInPack = phase === 'tearing' || phase === 'parting'
  const slots = cards.length > 0 ? cards : Array.from({ length: PACK_SIZE }, () => null)

  const runOpenSequence = async () => {
    if (drawing || phase !== 'sealed') return
    setDrawing(true)
    enrichGen.current += 1
    setCards([])
    setActiveIdx(0)
    setFlipTurns(Array.from({ length: PACK_SIZE }, () => 0))
    setFxIds([])
    setFxFadeIds([])
    const angle = randomTearAngle()
    const spec = createTearSpec(angle)
    tearAngleRef.current = angle
    tearSpecRef.current = spec
    setTearAngle(angle)
    applyTearVisual(0)

    const reduced = prefersReducedMotion()
    // Concurrent pack draw starts immediately on click.
    drawPromise.current = drawWeightedPack(PACK_SIZE)

    // Always run the tear sequence. Reduced-motion only shortens floors —
    // jumping straight to reveal made real phones look "FX-less" when OS
    // Reduce Motion is on (DevTools mobile emulation usually is not).
    setPhase('tearing')
    await waitAnimationFrame()
    await waitAnimationFrame()
    applyTearVisual(0)

    const tearPace = reduced ? Math.round(TEAR_PACE_MS * 0.45) : TEAR_PACE_MS
    const tearFloor = reduced ? Math.round(TEAR_FLOOR_MS * 0.5) : TEAR_FLOOR_MS
    const exitMs = reduced ? Math.round(EXIT_MS * 0.55) : EXIT_MS
    const expandMs = reduced ? Math.round(EXPAND_MS * 0.55) : EXPAND_MS

    const t0 = performance.now()
    let fetchSettled = false

    const pumpTear = (now: number) => {
      if (fetchSettled) return
      const elapsed = now - t0
      const p =
        elapsed <= tearPace
          ? 0.88 * easeOutCubic(elapsed / tearPace)
          : 0.88 + 0.1 * (1 - Math.exp(-(elapsed - tearPace) / 650))
      applyTearVisual(Math.min(0.97, p))
      tearRaf.current = requestAnimationFrame(pumpTear)
    }
    tearRaf.current = requestAnimationFrame(pumpTear)

    try {
      const drawn = await drawPromise.current
      fetchSettled = true
      clearTearRaf()

      setCards(drawn)
      setActiveIdx(0)
      setCollected(isCollected(drawn[0]?.id ?? ''))

      const elapsed = performance.now() - t0
      if (elapsed < tearFloor) {
        await new Promise<void>((resolve) => {
          const waitFloor = (now: number) => {
            const e = now - t0
            applyTearVisual(0.88 * easeOutCubic(Math.min(1, e / tearPace)))
            if (e < tearFloor) {
              tearRaf.current = requestAnimationFrame(waitFloor)
            } else {
              resolve()
            }
          }
          tearRaf.current = requestAnimationFrame(waitFloor)
        })
      }

      clearTearRaf()
      setPhase('parting')
      const from = tearProgressRef.current
      const exitStart = performance.now()
      await new Promise<void>((resolve) => {
        const exitAway = (now: number) => {
          const u = Math.min(1, (now - exitStart) / exitMs)
          applyTearVisual(from + (2.35 - from) * easeOutCubic(u))
          if (u < 1) {
            tearRaf.current = requestAnimationFrame(exitAway)
          } else {
            resolve()
          }
        }
        tearRaf.current = requestAnimationFrame(exitAway)
      })

      setPhase('pull')
      await new Promise<void>((resolve) => schedule(resolve, expandMs))
      finishReveal(drawn)
    } catch {
      fetchSettled = true
      clearTearRaf()
      setPhase('sealed')
      applyTearVisual(0)
    } finally {
      setDrawing(false)
    }
  }

  const onDrawAgain = () => {
    if (drawing) return
    clearTimers()
    clearFxTimers()
    clearTearRaf()
    setPhase('sealed')
    setCards([])
    setActiveIdx(0)
    setFlipTurns(Array.from({ length: PACK_SIZE }, () => 0))
    tearProgressRef.current = 0
    tearSpecRef.current = null
    setFxIds([])
    setFxFadeIds([])
    setCollected(false)
    setFlippingIdx(null)
    setDeckFlipping(false)
    schedule(() => {
      void runOpenSequence()
    }, 120)
  }

  const onToggleCollect = () => {
    const card = cards[activeIdx]
    if (!card) return
    if (collected) {
      setCollection(removeCollected(card.id))
      setCollected(false)
    } else {
      setCollection(addCollected(card))
      setCollected(true)
    }
  }

  const onToggleCollectInspect = (item: CollectedCard) => {
    setCollection(removeCollected(item.id))
    setInspect(null)
    if (cards[activeIdx]?.id === item.id) setCollected(false)
  }

  const openInspect = (item: CollectedCard) => {
    setInspectFlipTurns(0)
    setInspectFlipping(false)
    setArtZoomed(false)
    setInspect(item)
    triggerFrontFx(item)
    if (
      wantsZh() &&
      !hasZhPrint(item) &&
      item.oracleId &&
      item.source === 'scryfall'
    ) {
      void enrichDrawnCardZh(item).then((enriched) => {
        if (!hasZhPrint(enriched)) return
        const updated: CollectedCard = {
          ...enriched,
          collectedAt: item.collectedAt,
        }
        setInspect((cur) => (cur?.id === item.id ? updated : cur))
        setCollection(updateCollected(enriched))
      })
    }
  }

  const filteredCollection = filterAndSortCollection(collection, {
    rarity: filterRarity,
    color: filterColor,
    setCode: filterSet,
    sort: sortBy,
    lang: i18n.language,
    query: searchQuery,
  })
  const setOptions = uniqueSetCodes(collection)
  const rarityStats = collectionRarityStats(collection)

  const downloadCollection = () => {
    const json = exportCollectionJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `magic-solo-collection-${stamp}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImportFile = async (file: File | null) => {
    if (!file) return
    try {
      const text = await file.text()
      const result = importCollectionJson(text)
      if (!result.ok) {
        setImportMessage(
          result.error === 'empty'
            ? t('packDraw.importEmpty')
            : t('packDraw.importInvalid'),
        )
        return
      }
      setCollection(result.items)
      setImportMessage(
        t('packDraw.importOk', {
          added: result.added,
          updated: result.updated,
        }),
      )
    } catch {
      setImportMessage(t('packDraw.importInvalid'))
    }
  }

  const onClearCollection = () => {
    if (collection.length === 0) return
    setClearConfirmOpen(true)
  }

  const confirmClearCollection = () => {
    setCollection(clearCollected())
    setInspect(null)
    setImportMessage(null)
    setCollected(false)
    setClearConfirmOpen(false)
  }

  const stepInspect = (delta: number) => {
    const list = filteredCollection.length > 0 ? filteredCollection : collection
    if (!inspect || list.length === 0) return
    const idx = list.findIndex((c) => c.id === inspect.id)
    if (idx < 0) return
    const next =
      list[((idx + delta) % list.length + list.length) % list.length]
    if (!next || next.id === inspect.id) return
    openInspect(next)
  }

  const selectCard = (index: number) => {
    if (cards.length === 0) return
    const next = ((index % cards.length) + cards.length) % cards.length
    setActiveIdx(next)
    setArtZoomed(false)
    const card = cards[next]
    setCollected(card ? isCollected(card.id) : false)
    // Flash when browsing onto a card already showing its front.
    if (card && isShowingCardFront(flipTurns[next] ?? 0)) {
      triggerFrontFx(card)
    }
  }

  const stepCard = (delta: number) => {
    if (phase !== 'revealed' && phase !== 'flip') return
    selectCard(activeIdx + delta)
  }

  const packSwipe = useSwipeNavigate(
    (delta) => stepCard(delta),
    open && view === 'pack' && (phase === 'revealed' || phase === 'flip') && cards.length > 1,
  )
  const inspectSwipe = useSwipeNavigate(
    (delta) => stepInspect(delta),
    open && view === 'collection' && !!inspect,
  )

  const flipOnce = (index: number) => {
    if (phase !== 'revealed' && phase !== 'flip') return
    setFlippingIdx(index)
    const nextTurns = (flipTurns[index] ?? 0) + 1
    requestAnimationFrame(() =>
      setFlipTurns((prev) => prev.map((n, i) => (i === index ? n + 1 : n))),
    )
    schedule(() => {
      setFlippingIdx((cur) => (cur === index ? null : cur))
      // Flash only after is-flipping clears — mid-flip triggers die on WebKit.
      if (isShowingCardFront(nextTurns)) {
        triggerFrontFx(cards[index])
      }
    }, FLIP_MS)
  }

  const tearFlaps = tearSpecRef.current
    ? tear2dStyles(
        tearSpecRef.current,
        phase === 'parting'
          ? Math.max(tearProgressRef.current, 1)
          : tearProgressRef.current,
        measurePackAlong(),
      )
    : null
  const peelStyle: CSSProperties = tearFlaps?.peel ?? {}
  const remainStyle: CSSProperties = tearFlaps?.remain ?? {}
  const tearEdgeStyle: CSSProperties = {
    backgroundImage: `url(${TEAR_EDGE})`,
    transform: `translate(-50%, -50%) rotate(${tearAngle + 90}deg)`,
  }

  const packBackSrc = defaultCardBackUrl()
  const card = cards[activeIdx] ?? null

  const dialog =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="pack-draw-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false)
            }}
          >
            <div
              className={[
                'pack-draw-modal',
                view === 'collection' ? 'is-collection' : '',
                view !== 'collection' &&
                (phase === 'tearing' ||
                  phase === 'parting' ||
                  phase === 'pull' ||
                  phase === 'flip' ||
                  fxIds.length > 0 ||
                  fxFadeIds.length > 0)
                  ? 'is-fx-open'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <header className="pack-draw-head">
                <h2 id={titleId}>
                  {view === 'collection'
                    ? t('packDraw.collection')
                    : t('packDraw.title')}
                </h2>
                <div className="pack-draw-head-actions">
                  {view === 'pack' ? (
                    <button
                      type="button"
                      className="references-text-btn"
                      onClick={() => {
                        setCollection(listCollected())
                        setView('collection')
                      }}
                    >
                      {t('packDraw.collection')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="references-text-btn"
                      onClick={() => {
                        setInspect(null)
                        setInspectFlipTurns(0)
                        setView('pack')
                      }}
                    >
                      {t('packDraw.backToPack')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="references-text-btn"
                    onClick={() => setOpen(false)}
                  >
                    {t('deck.close')}
                  </button>
                </div>
              </header>

              {view === 'collection' ? (
                <div className="pack-collection">
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      void onImportFile(file)
                      e.target.value = ''
                    }}
                  />
                  {collection.length === 0 ? (
                    <div className="pack-collection-empty">
                      <p className="pack-draw-hint">{t('packDraw.emptyCollection')}</p>
                      <div className="pack-collection-manage">
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => importInputRef.current?.click()}
                        >
                          {t('packDraw.import')}
                        </button>
                      </div>
                      {importMessage ? (
                        <p className="pack-draw-hint" role="status">
                          {importMessage}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <div className="pack-collection-stats" aria-label={t('packDraw.statsLabel')}>
                        <span>
                          {t('packDraw.statsTotal', { n: rarityStats.total })}
                        </span>
                        <span className="rarity-mythic">
                          {t('packDraw.rarity.mythic')} {rarityStats.mythic}
                        </span>
                        <span className="rarity-rare">
                          {t('packDraw.rarity.rare')} {rarityStats.rare}
                        </span>
                        <span className="rarity-uncommon">
                          {t('packDraw.rarity.uncommon')} {rarityStats.uncommon}
                        </span>
                        <span className="rarity-common">
                          {t('packDraw.rarity.common')} {rarityStats.common}
                        </span>
                        {rarityStats.other > 0 ? (
                          <span>
                            {t('packDraw.statsOther', { n: rarityStats.other })}
                          </span>
                        ) : null}
                      </div>
                      <div className="pack-collection-toolbar">
                        <label className="pack-collection-filter pack-collection-search">
                          <span>{t('packDraw.search')}</span>
                          <input
                            type="search"
                            value={searchQuery}
                            placeholder={t('packDraw.searchPlaceholder')}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </label>
                        <label className="pack-collection-filter">
                          <span>{t('packDraw.filterRarity')}</span>
                          <select
                            value={filterRarity}
                            onChange={(e) =>
                              setFilterRarity(
                                e.target.value as CollectionRarityFilter,
                              )
                            }
                          >
                            <option value="all">{t('packDraw.filterAll')}</option>
                            <option value="mythic">
                              {t('packDraw.rarity.mythic')}
                            </option>
                            <option value="rare">
                              {t('packDraw.rarity.rare')}
                            </option>
                            <option value="uncommon">
                              {t('packDraw.rarity.uncommon')}
                            </option>
                            <option value="common">
                              {t('packDraw.rarity.common')}
                            </option>
                          </select>
                        </label>
                        <label className="pack-collection-filter">
                          <span>{t('packDraw.filterColor')}</span>
                          <select
                            value={filterColor}
                            onChange={(e) =>
                              setFilterColor(
                                e.target.value as CollectionColorFilter,
                              )
                            }
                          >
                            <option value="all">{t('packDraw.filterAll')}</option>
                            <option value="W">{t('packDraw.color.W')}</option>
                            <option value="U">{t('packDraw.color.U')}</option>
                            <option value="B">{t('packDraw.color.B')}</option>
                            <option value="R">{t('packDraw.color.R')}</option>
                            <option value="G">{t('packDraw.color.G')}</option>
                            <option value="C">{t('packDraw.color.C')}</option>
                            <option value="M">{t('packDraw.color.M')}</option>
                          </select>
                        </label>
                        <label className="pack-collection-filter">
                          <span>{t('packDraw.filterSet')}</span>
                          <select
                            value={filterSet}
                            onChange={(e) => setFilterSet(e.target.value)}
                          >
                            <option value="">{t('packDraw.filterAll')}</option>
                            {setOptions.map((code) => (
                              <option key={code} value={code}>
                                {code}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="pack-collection-filter">
                          <span>{t('packDraw.sortBy')}</span>
                          <select
                            value={sortBy}
                            onChange={(e) =>
                              setSortBy(e.target.value as CollectionSort)
                            }
                          >
                            <option value="newest">
                              {t('packDraw.sort.newest')}
                            </option>
                            <option value="oldest">
                              {t('packDraw.sort.oldest')}
                            </option>
                            <option value="rarity">
                              {t('packDraw.sort.rarity')}
                            </option>
                            <option value="name">
                              {t('packDraw.sort.name')}
                            </option>
                            <option value="set">
                              {t('packDraw.sort.set')}
                            </option>
                          </select>
                        </label>
                        <div className="pack-collection-filter pack-collection-actions">
                          <span>{t('packDraw.manage')}</span>
                          <div className="pack-collection-manage" role="group" aria-label={t('packDraw.manage')}>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={downloadCollection}
                            >
                              {t('packDraw.export')}
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => importInputRef.current?.click()}
                            >
                              {t('packDraw.import')}
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={onClearCollection}
                            >
                              {t('packDraw.clearAll')}
                            </button>
                          </div>
                        </div>
                      </div>
                      {importMessage ? (
                        <p className="pack-draw-hint" role="status">
                          {importMessage}
                        </p>
                      ) : null}
                      {filteredCollection.length === 0 ? (
                        <p className="pack-draw-hint">
                          {t('packDraw.filterEmpty')}
                        </p>
                      ) : (
                        <ul className="pack-collection-grid">
                          {filteredCollection.map((item) => (
                            <li key={item.id}>
                              <button
                                type="button"
                                className="pack-collection-tile"
                                onClick={() => openInspect(item)}
                              >
                                <img
                                  src={item.frontImageUrl}
                                  alt={item.name}
                                />
                                <span
                                  className={`pack-rarity-chip rarity-${item.rarity}`}
                                >
                                  {t(`packDraw.rarity.${item.rarity}`, {
                                    defaultValue: item.rarity,
                                  })}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                  {inspect ? (
                    <div
                      className={[
                        'pack-inspect',
                        artZoomed ? 'is-art-zoomed' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      role="dialog"
                      aria-label={inspect.name}
                    >
                      {(() => {
                        const inspectFx = rarityFxClass(inspect)
                        const inspectGlowing = fxIds.includes(inspect.id)
                        const inspectFading = fxFadeIds.includes(inspect.id)
                        const showInspectFxLayer =
                          (inspectGlowing || inspectFading) &&
                          (inspectFx === 'pack-fx-rare' ||
                            inspectFx === 'pack-fx-mythic')
                        const flipInspect = () => {
                          const nextTurns = inspectFlipTurns + 1
                          setInspectFlipping(true)
                          requestAnimationFrame(() =>
                            setInspectFlipTurns((n) => n + 1),
                          )
                          schedule(() => {
                            setInspectFlipping(false)
                            // Inspect art is on `.card-face.front` (even turns).
                            if (nextTurns % 2 === 0) {
                              triggerFrontFx(inspect)
                            }
                          }, FLIP_MS)
                        }
                        return (
                      <div className="pack-inspect-stage" {...inspectSwipe}>
                      <div
                        key={inspect.id}
                        className={[
                          'pack-card-wrap',
                          'pack-inspect-wrap',
                          'is-expanded',
                          'is-active',
                          inspectFx,
                          inspectFlipping ? 'is-flipping' : '',
                          inspectGlowing ? 'is-glowing' : '',
                          inspectFading ? 'is-fading' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {showInspectFxLayer ? (
                          <span
                            key={`inspect-sparkles-${fxEpoch}`}
                            className={[
                              'pack-fx-layer',
                              'is-sparkles',
                              inspectFx === 'pack-fx-mythic' ? 'is-mythic' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            aria-hidden
                          />
                        ) : null}
                      <div className="card-flip pack-inspect-flip">
                        <CardFaceButton
                          className="card-flip-inner"
                          ariaLabel={t('deck.flip')}
                          style={{
                            transform: `translate3d(0, 0, 0) rotateY(${inspectFlipTurns * 180}deg)`,
                          }}
                          onFlip={flipInspect}
                          onToggleZoom={() => setArtZoomed((z) => !z)}
                        >
                          <span className="card-face front">
                            <img
                              src={inspect.frontImageUrl}
                              alt={inspect.name}
                              draggable={false}
                            />
                          </span>
                          <span className="card-face back">
                            <img
                              src={inspect.backImageUrl || packBackSrc}
                              alt={t('deck.backHint')}
                              draggable={false}
                            />
                          </span>
                        </CardFaceButton>
                      </div>
                      </div>
                      </div>
                        )
                      })()}
                      <div className="pack-card-copy pack-inspect-copy">
                        <div className="pack-card-copy-cluster">
                          <div className="pack-card-copy-body">
                            <CardDetailsBody card={inspect} />
                          </div>
                          <div className="pack-draw-actions">
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => onToggleCollectInspect(inspect)}
                            >
                              {t('packDraw.removeCollect')}
                            </button>
                            {inspect.scryfallUri ? (
                              <a
                                href={inspect.scryfallUri}
                                target="_blank"
                                rel="noreferrer"
                                className="pack-scryfall-link"
                              >
                                {t('packDraw.scryfall')}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  className={[
                    'pack-draw-stage',
                    phase === 'revealed' ? 'has-copy' : 'pack-only',
                    artZoomed ? 'is-art-zoomed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div
                    className={['pack-stage-visual', `is-${phase}`]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {phase === 'sealed' ? (
                      <button
                        type="button"
                        className="pack-shell is-sealed"
                        onClick={() => void runOpenSequence()}
                        disabled={drawing}
                        aria-label={t('packDraw.openPack')}
                      >
                        <img
                          className="pack-shell-full"
                          src={PACK_ART}
                          alt={t('packDraw.packLabel')}
                          draggable={false}
                        />
                      </button>
                    ) : null}

                    {showRevealCard ? (
                      <div
                        className={[
                          'pack-reveal-stack',
                          'is-deck',
                          cardInPack ? 'is-in-tear' : 'is-browsable',
                        ].join(' ')}
                        {...(phase === 'revealed' || phase === 'flip'
                          ? packSwipe
                          : {})}
                      >
                        <div className="pack-card-deck" role="list">
                          {slots.map((slot, index) => {
                            const backSrc = slot?.backImageUrl || packBackSrc
                            const frontSrc = slot?.frontImageUrl || packBackSrc
                            const fxClass = rarityFxClass(slot)
                            const isActive = activeIdx === index
                            const glowing = slot ? fxIds.includes(slot.id) : false
                            const fading = slot ? fxFadeIds.includes(slot.id) : false
                            const deckSettled =
                              phase === 'flip' || phase === 'revealed'
                            // Stable under-stack ranks so both peeks stay visible (1 = deepest).
                            const behindRank = !deckSettled
                              ? 0
                              : slots
                                  .map((_, i) => i)
                                  .filter((i) => i !== activeIdx)
                                  .indexOf(index) + 1
                            const depth = cardInPack
                              ? index
                              : deckSettled
                                ? behindRank
                                : PACK_SIZE - index
                            const showFxLayer =
                              (glowing || fading) &&
                              isActive &&
                              (fxClass === 'pack-fx-rare' ||
                                fxClass === 'pack-fx-mythic')
                            return (
                              <div
                                key={slot?.id ?? `slot-${index}`}
                                role="listitem"
                                className={[
                                  'pack-card-wrap',
                                  `stack-${index}`,
                                  cardInPack ? 'is-in-pack' : '',
                                  phase === 'pull' ? 'is-expanding' : '',
                                  deckSettled ? 'is-expanded' : '',
                                  isActive && deckSettled ? 'is-active' : '',
                                  !isActive && deckSettled ? 'is-behind' : '',
                                  flippingIdx === index || deckFlipping
                                    ? 'is-flipping'
                                    : '',
                                  deckSettled ? fxClass : '',
                                  glowing ? 'is-glowing' : '',
                                  fading ? 'is-fading' : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                style={
                                  !cardInPack
                                    ? {
                                        zIndex: deckSettled
                                          ? isActive
                                            ? 5
                                            : Math.max(1, 3 - depth)
                                          : depth,
                                        ['--pack-depth' as string]:
                                          deckSettled ? depth : 0,
                                      }
                                    : undefined
                                }
                                aria-hidden={!isActive && deckSettled}
                              >
                                {showFxLayer ? (
                                  <span
                                    key={`sparkles-${fxEpoch}`}
                                    className={[
                                      'pack-fx-layer',
                                      'is-sparkles',
                                      fxClass === 'pack-fx-mythic'
                                        ? 'is-mythic'
                                        : '',
                                    ]
                                      .filter(Boolean)
                                      .join(' ')}
                                    aria-hidden
                                  />
                                ) : null}
                                <div className="card-flip pack-card-flip">
                                  <CardFaceButton
                                    className="card-flip-inner"
                                    enabled={
                                      (phase === 'revealed' ||
                                        phase === 'flip') &&
                                      isActive
                                    }
                                    ariaLabel={
                                      slot
                                        ? `${slot.name}. ${t('deck.flip')}`
                                        : t('deck.flip')
                                    }
                                    style={{
                                      transform: `translate3d(0, 0, 0) rotateY(${(flipTurns[index] ?? 0) * 180}deg)`,
                                    }}
                                    onFlip={() => {
                                      if (
                                        (phase === 'revealed' ||
                                          phase === 'flip') &&
                                        isActive
                                      ) {
                                        flipOnce(index)
                                      }
                                    }}
                                    onToggleZoom={() => {
                                      if (
                                        !slot ||
                                        !isActive ||
                                        (phase !== 'revealed' &&
                                          phase !== 'flip')
                                      ) {
                                        return
                                      }
                                      setArtZoomed((z) => !z)
                                    }}
                                  >
                                    <span className="card-face front">
                                      <img
                                        src={backSrc}
                                        alt={t('deck.backHint')}
                                        draggable={false}
                                      />
                                    </span>
                                    <span className="card-face back">
                                      <img
                                        src={frontSrc}
                                        alt={slot?.name || ''}
                                        draggable={false}
                                      />
                                    </span>
                                  </CardFaceButton>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {cardInPack ? (
                          <div
                            ref={packShellRef}
                            className="pack-shell is-tearing"
                            data-tear-angle={tearAngle.toFixed(1)}
                            role="status"
                            aria-label={t('packDraw.loading')}
                          >
                            <span
                              ref={remainRef}
                              className="pack-shell-remain"
                              aria-hidden
                              style={remainStyle}
                            >
                              <img src={PACK_ART} alt="" draggable={false} />
                              <span
                                ref={remainEdgeRef}
                                className="pack-tear-edge-tex"
                                style={tearEdgeStyle}
                              />
                            </span>
                            <span
                              ref={peelRef}
                              className="pack-shell-peel"
                              aria-hidden
                              style={peelStyle}
                            >
                              <img src={PACK_ART} alt="" draggable={false} />
                              <span
                                ref={peelEdgeRef}
                                className="pack-tear-edge-tex"
                                style={tearEdgeStyle}
                              />
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {phase === 'revealed' && card ? (
                    <div className="pack-card-copy">
                      <div className="pack-card-copy-cluster">
                        <div className="pack-card-copy-body">
                          <CardDetailsBody card={card} />
                        </div>
                        <div className="pack-draw-actions">
                          <button
                            type="button"
                            className="btn primary"
                            onClick={onDrawAgain}
                            disabled={drawing}
                          >
                            {t('packDraw.drawAgain')}
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={onToggleCollect}
                          >
                            {collected
                              ? t('packDraw.collected')
                              : t('packDraw.collect')}
                          </button>
                          {card.scryfallUri ? (
                            <a
                              href={card.scryfallUri}
                              target="_blank"
                              rel="noreferrer"
                              className="pack-scryfall-link"
                            >
                              {t('packDraw.scryfall')}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
              {clearConfirmOpen ? (
                <div
                  className="pack-confirm-backdrop"
                  role="presentation"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) setClearConfirmOpen(false)
                  }}
                >
                  <div
                    className="pack-confirm-dialog"
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="pack-clear-title"
                    aria-describedby="pack-clear-desc"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <h3 id="pack-clear-title">{t('packDraw.clearTitle')}</h3>
                    <p id="pack-clear-desc">
                      {t('packDraw.clearConfirm', { n: collection.length })}
                    </p>
                    <div className="pack-confirm-actions">
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => setClearConfirmOpen(false)}
                      >
                        {t('packDraw.cancel')}
                      </button>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={confirmClearCollection}
                      >
                        {t('packDraw.clearAll')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        type="button"
        className="references-text-btn"
        onClick={() => setOpen(true)}
      >
        {t('packDraw.open')}
      </button>
      {dialog}
    </>
  )
}
