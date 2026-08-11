import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { assetUrl } from '../utils/assetUrl'
import {
  addCollected,
  isCollected,
  listCollected,
  removeCollected,
  type CollectedCard,
} from '../data/packCollection'
import {
  defaultCardBackUrl,
  drawWeightedCard,
  isPremiumRarity,
  type DrawnCard,
} from '../data/randomCard'

const PACK_ART = assetUrl('assets/pack/booster-pack.png')

type RevealPhase = 'sealed' | 'tearing' | 'parting' | 'pull' | 'flip' | 'revealed'
type ModalView = 'pack' | 'collection'
type TearDir = 'ltr' | 'rtl' | 'ttb' | 'btt'

const TEAR_DIRS: TearDir[] = ['ltr', 'rtl', 'ttb', 'btt']

/** Tear pace while the request is in flight (masks latency, must not outlast a fast response). */
const TEAR_PACE_MS = 620
/** Shortest tear so a cached/fast reply still reads as an open — not a hard wait after data arrives. */
const TEAR_FLOOR_MS = 260
/** One motion: finish the rip and fly halves away. */
const EXIT_MS = 300
/** Same in-pack card scales up to reveal size. */
const EXPAND_MS = 280
const FLIP_MS = 400

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function randomTearDir(): TearDir {
  return TEAR_DIRS[Math.floor(Math.random() * TEAR_DIRS.length)]
}

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) ** 3
}

/** Simple 2D rip: two non-overlapping halves always move away from each other.
 *  progress 0→1 = tear open; >1 = fly farther apart and fade (no snap-back). */
function tear2dStyles(
  dir: TearDir,
  progress: number,
): { peel: CSSProperties; remain: CSSProperties } {
  const p = Math.max(0, progress)
  const sep = Math.min(p, 2.4) * 48 // px — keeps going past 1
  const rot = Math.min(p, 2.4) * 9 // deg
  const fade = p <= 1 ? 1 : Math.max(0, 1 - (p - 1) / 1.35)
  const vertical = dir === 'ttb' || dir === 'btt'

  if (vertical) {
    return {
      peel: {
        clipPath: 'inset(0 0 50.6% 0)',
        transform: `translate3d(0, ${(-sep).toFixed(1)}px, 0) rotate(${(-rot).toFixed(2)}deg)`,
        opacity: fade,
      },
      remain: {
        clipPath: 'inset(50.6% 0 0 0)',
        transform: `translate3d(0, ${sep.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg)`,
        opacity: fade,
      },
    }
  }

  return {
    peel: {
      clipPath: 'inset(0 50.6% 0 0)',
      transform: `translate3d(${(-sep).toFixed(1)}px, 0, 0) rotate(${(-rot).toFixed(2)}deg)`,
      opacity: fade,
    },
    remain: {
      clipPath: 'inset(0 0 0 50.6%)',
      transform: `translate3d(${sep.toFixed(1)}px, 0, 0) rotate(${rot.toFixed(2)}deg)`,
      opacity: fade,
    },
  }
}

export function PackDrawButton() {
  const { t } = useTranslation()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ModalView>('pack')
  const [phase, setPhase] = useState<RevealPhase>('sealed')
  const [card, setCard] = useState<DrawnCard | null>(null)
  const [flipTurns, setFlipTurns] = useState(0)
  const [tearDir, setTearDir] = useState<TearDir>('ltr')
  const [tearProgress, setTearProgress] = useState(0)
  const [glow, setGlow] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [collected, setCollected] = useState(false)
  const [collection, setCollection] = useState<CollectedCard[]>([])
  const [inspect, setInspect] = useState<CollectedCard | null>(null)
  const [inspectFlipTurns, setInspectFlipTurns] = useState(0)
  const drawPromise = useRef<Promise<DrawnCard> | null>(null)
  const timers = useRef<number[]>([])
  const tearRaf = useRef(0)
  const tearProgressRef = useRef(0)
  const tearDirRef = useRef<TearDir>('ltr')
  const peelRef = useRef<HTMLSpanElement | null>(null)
  const remainRef = useRef<HTMLSpanElement | null>(null)

  const clearTimers = () => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }

  const clearTearRaf = () => {
    if (tearRaf.current) {
      cancelAnimationFrame(tearRaf.current)
      tearRaf.current = 0
    }
  }

  const applyTearVisual = (progress: number, dir: TearDir = tearDirRef.current) => {
    tearProgressRef.current = progress
    setTearProgress(progress)
    const flaps = tear2dStyles(dir, progress)
    if (peelRef.current) {
      peelRef.current.style.clipPath = String(flaps.peel.clipPath ?? '')
      peelRef.current.style.transform = String(flaps.peel.transform ?? 'none')
      peelRef.current.style.opacity = String(flaps.peel.opacity ?? 1)
    }
    if (remainRef.current) {
      remainRef.current.style.clipPath = String(flaps.remain.clipPath ?? '')
      remainRef.current.style.transform = String(flaps.remain.transform ?? 'none')
      remainRef.current.style.opacity = String(flaps.remain.opacity ?? 1)
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
    clearTearRaf()
    drawPromise.current = null
    setPhase('sealed')
    setCard(null)
    setFlipTurns(0)
    setTearProgress(0)
    tearProgressRef.current = 0
    setGlow(false)
    setDrawing(false)
    setCollected(false)
    setInspect(null)
    setInspectFlipTurns(0)
    setView('pack')
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspect) {
          setInspect(null)
          return
        }
        if (view === 'collection') {
          setView('pack')
          return
        }
        setOpen(false)
      }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, view, inspect])

  useEffect(() => {
    if (!open) {
      resetPack()
      return
    }
    setCollection(listCollected())
  }, [open, resetPack])

  useEffect(() => () => {
    clearTimers()
    clearTearRaf()
  }, [])

  const finishReveal = (drawn: DrawnCard) => {
    setCard(drawn)
    setCollected(isCollected(drawn.id))
    setPhase('flip')
    requestAnimationFrame(() => {
      setFlipTurns(1)
      if (isPremiumRarity(drawn.rarity)) {
        setGlow(true)
        schedule(() => setGlow(false), 1600)
      }
    })
    schedule(() => setPhase('revealed'), prefersReducedMotion() ? 0 : FLIP_MS)
  }

  const showRevealCard =
    phase === 'tearing' ||
    phase === 'parting' ||
    phase === 'pull' ||
    phase === 'flip' ||
    phase === 'revealed'
  const cardInPack = phase === 'tearing' || phase === 'parting'

  const runOpenSequence = async () => {
    if (drawing || phase !== 'sealed') return
    setDrawing(true)
    setCard(null)
    setFlipTurns(0)
    setGlow(false)
    const dir = randomTearDir()
    tearDirRef.current = dir
    setTearDir(dir)
    applyTearVisual(0, dir)

    const reduced = prefersReducedMotion()
    // Request card immediately on click.
    drawPromise.current = drawWeightedCard()

    if (reduced) {
      setPhase('tearing')
      applyTearVisual(1, dir)
      try {
        const drawn = await drawPromise.current
        finishReveal(drawn)
      } catch {
        setPhase('sealed')
      } finally {
        setDrawing(false)
      }
      return
    }

    // Mount tear layers first, then animate — otherwise progress runs while still sealed.
    setPhase('tearing')
    await waitAnimationFrame()
    await waitAnimationFrame()
    applyTearVisual(0, dir)

    const t0 = performance.now()
    let fetchSettled = false

    // Progress follows the wait: covers latency, never invents a long pad after data is ready.
    const pumpTear = (now: number) => {
      if (fetchSettled) return
      const elapsed = now - t0
      const p =
        elapsed <= TEAR_PACE_MS
          ? 0.88 * easeOutCubic(elapsed / TEAR_PACE_MS)
          : 0.88 + 0.1 * (1 - Math.exp(-(elapsed - TEAR_PACE_MS) / 650))
      applyTearVisual(Math.min(0.97, p), dir)
      tearRaf.current = requestAnimationFrame(pumpTear)
    }
    tearRaf.current = requestAnimationFrame(pumpTear)

    try {
      const drawn = await drawPromise.current
      fetchSettled = true
      clearTearRaf()

      // Attach art ASAP so expand/flip can use the same in-pack card.
      setCard(drawn)
      setCollected(isCollected(drawn.id))

      // Only hold if the reply was faster than a readable tear beat.
      const elapsed = performance.now() - t0
      if (elapsed < TEAR_FLOOR_MS) {
        await new Promise<void>((resolve) => {
          const waitFloor = (now: number) => {
            const e = now - t0
            applyTearVisual(0.88 * easeOutCubic(Math.min(1, e / TEAR_PACE_MS)), dir)
            if (e < TEAR_FLOOR_MS) {
              tearRaf.current = requestAnimationFrame(waitFloor)
            } else {
              resolve()
            }
          }
          tearRaf.current = requestAnimationFrame(waitFloor)
        })
      }

      // Finish rip + fly-apart in one continuous exit (no extra “must tear for 900ms”).
      clearTearRaf()
      setPhase('parting')
      const from = tearProgressRef.current
      const exitStart = performance.now()
      await new Promise<void>((resolve) => {
        const exitAway = (now: number) => {
          const u = Math.min(1, (now - exitStart) / EXIT_MS)
          applyTearVisual(from + (2.35 - from) * easeOutCubic(u), dir)
          if (u < 1) {
            tearRaf.current = requestAnimationFrame(exitAway)
          } else {
            resolve()
          }
        }
        tearRaf.current = requestAnimationFrame(exitAway)
      })

      setPhase('pull')
      await new Promise<void>((resolve) => schedule(resolve, EXPAND_MS))
      finishReveal(drawn)
    } catch {
      fetchSettled = true
      clearTearRaf()
      setPhase('sealed')
      applyTearVisual(0, dir)
    } finally {
      setDrawing(false)
    }
  }

  const onDrawAgain = () => {
    if (drawing) return
    clearTimers()
    clearTearRaf()
    setPhase('sealed')
    setCard(null)
    setFlipTurns(0)
    setTearProgress(0)
    tearProgressRef.current = 0
    setGlow(false)
    setCollected(false)
    // brief beat so sealed pack is visible before tearing again
    schedule(() => {
      void runOpenSequence()
    }, 120)
  }

  const onToggleCollect = () => {
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
    if (card?.id === item.id) setCollected(false)
  }

  const flipOnce = () => {
    if (phase !== 'revealed' && phase !== 'flip') return
    requestAnimationFrame(() => setFlipTurns((n) => n + 1))
  }

  const tearFlaps = tear2dStyles(
    tearDir,
    phase === 'parting' ? Math.max(tearProgress, 1) : tearProgress,
  )
  const peelStyle: CSSProperties = tearFlaps.peel
  const remainStyle: CSSProperties = tearFlaps.remain

  const packBackSrc = defaultCardBackUrl()
  const backSrc = card?.backImageUrl || packBackSrc
  const frontSrc = card?.frontImageUrl || ''
  const pt =
    card?.power != null && card?.toughness != null
      ? `${card.power}/${card.toughness}`
      : null

  const rarityClass =
    card && isPremiumRarity(card.rarity)
      ? card.rarity === 'mythic' || card.rarity === 'special'
        ? 'pack-glow-mythic'
        : 'pack-glow-rare'
      : card?.rarity === 'uncommon'
        ? 'pack-glow-uncommon'
        : ''

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
                  {collection.length === 0 ? (
                    <p className="pack-draw-hint">{t('packDraw.emptyCollection')}</p>
                  ) : (
                    <ul className="pack-collection-grid">
                      {collection.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className="pack-collection-tile"
                            onClick={() => {
                              setInspectFlipTurns(0)
                              setInspect(item)
                            }}
                          >
                            <img src={item.frontImageUrl} alt={item.name} />
                            <span className={`pack-rarity-chip rarity-${item.rarity}`}>
                              {t(`packDraw.rarity.${item.rarity}`, {
                                defaultValue: item.rarity,
                              })}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {inspect ? (
                    <div className="pack-inspect" role="dialog" aria-label={inspect.name}>
                      <div className="card-flip pack-inspect-flip">
                        <div
                          className="card-flip-inner"
                          role="button"
                          tabIndex={0}
                          aria-label={t('deck.flip')}
                          style={{
                            transform: `translate3d(0, 0, 0) rotateY(${inspectFlipTurns * 180}deg)`,
                          }}
                          onClick={() =>
                            requestAnimationFrame(() =>
                              setInspectFlipTurns((n) => n + 1),
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              requestAnimationFrame(() =>
                                setInspectFlipTurns((n) => n + 1),
                              )
                            }
                          }}
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
                        </div>
                      </div>
                      <div className="pack-inspect-copy">
                        <p className="eyebrow">
                          {t('deck.collector', {
                            set: inspect.setCode,
                            number: inspect.collectorNumber,
                          })}
                          <span
                            className={`pack-rarity-chip rarity-${inspect.rarity}`}
                          >
                            {t(`packDraw.rarity.${inspect.rarity}`, {
                              defaultValue: inspect.rarity,
                            })}
                          </span>
                        </p>
                        <h3>{inspect.name}</h3>
                        <p className="type-line">{inspect.typeLine}</p>
                        {inspect.power != null && inspect.toughness != null ? (
                          <p className="pt-line">
                            {inspect.power}/{inspect.toughness}
                          </p>
                        ) : null}
                        <h4>{t('deck.oracle')}</h4>
                        <p className="oracle-text">{inspect.oracleText || '—'}</p>
                        {inspect.artist ? (
                          <p className="artist">
                            {t('deck.artist', { name: inspect.artist })}
                          </p>
                        ) : null}
                        <div className="pack-draw-actions">
                          {inspect.scryfallUri ? (
                            <a
                              href={inspect.scryfallUri}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Scryfall
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => onToggleCollectInspect(inspect)}
                          >
                            {t('packDraw.removeCollect')}
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => {
                              setInspect(null)
                              setInspectFlipTurns(0)
                            }}
                          >
                            {t('deck.close')}
                          </button>
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
                  ].join(' ')}
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
                      <div className="pack-reveal-stack">
                        <div
                          className={[
                            'pack-card-wrap',
                            cardInPack ? 'is-in-pack' : '',
                            phase === 'pull' ? 'is-expanding' : '',
                            phase === 'flip' || phase === 'revealed'
                              ? 'is-expanded'
                              : '',
                            rarityClass,
                            glow ? 'is-glowing' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {glow ? (
                            <span className="pack-sparkles" aria-hidden />
                          ) : null}
                          <div className="card-flip pack-card-flip">
                            <div
                              className="card-flip-inner"
                              role="button"
                              tabIndex={
                                phase === 'revealed' || phase === 'flip'
                                  ? 0
                                  : -1
                              }
                              aria-label={t('deck.flip')}
                              style={{
                                transform: `translate3d(0, 0, 0) rotateY(${flipTurns * 180}deg)`,
                              }}
                              onClick={flipOnce}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  flipOnce()
                                }
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
                                  src={frontSrc || packBackSrc}
                                  alt={card?.name || ''}
                                  draggable={false}
                                />
                              </span>
                            </div>
                          </div>
                        </div>

                        {cardInPack ? (
                          <div
                            className="pack-shell is-tearing"
                            data-tear={tearDir}
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
                            </span>
                            <span
                              ref={peelRef}
                              className="pack-shell-peel"
                              aria-hidden
                              style={peelStyle}
                            >
                              <img src={PACK_ART} alt="" draggable={false} />
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {phase === 'revealed' && card ? (
                    <div className="pack-draw-copy">
                      <p className="eyebrow">
                        {t('deck.collector', {
                          set: card.setCode,
                          number: card.collectorNumber,
                        })}
                        <span
                          className={`pack-rarity-chip rarity-${card.rarity}`}
                        >
                          {t(`packDraw.rarity.${card.rarity}`, {
                            defaultValue: card.rarity,
                          })}
                        </span>
                      </p>
                      <h3>{card.name}</h3>
                      <p className="type-line">{card.typeLine}</p>
                      {pt ? <p className="pt-line">{pt}</p> : null}
                      <h4>{t('deck.oracle')}</h4>
                      <p className="oracle-text">{card.oracleText || '—'}</p>
                      {card.artist ? (
                        <p className="artist">
                          {t('deck.artist', { name: card.artist })}
                        </p>
                      ) : null}
                      {card.source === 'local' ? (
                        <p className="pack-draw-hint">
                          {t('packDraw.fallbackHint')}
                        </p>
                      ) : null}
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
                          >
                            Scryfall
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
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
