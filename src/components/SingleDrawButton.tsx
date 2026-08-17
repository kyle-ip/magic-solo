import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import '../styles/pack.css'
import '../styles/deck.css'
import { CardFaceButton } from './CardFaceButton'
import { CardArtImage } from './CardArtImage'
import { CardDetailsBody } from './CardDetailsBody'
import {
  addCollected,
  isCollected,
  removeCollected,
  updateCollected,
} from '../data/packCollection'
import {
  defaultCardBackUrl,
  drawWeightedCard,
  dualFaceImageUrl,
  enrichDrawnCardZh,
  hasDualFaceArt,
  hasZhPrint,
  wantsZh,
  type DrawnCard,
} from '../data/randomCard'
import { useArtZoomPan } from '../hooks/useArtZoomPan'
import { useCardHoldDrag } from '../hooks/useCardHoldDrag'
import { preloadImage } from '../utils/imageCache'
import { PackCollectionCabinet } from './PackCollectionCabinet'
import { PackHeadIconButton } from './PackHeadIconButton'

const FLIP_MS = 220
/** Continuous Y-spin while the draw request is in flight. */
const WAIT_SPIN_PERIOD_MS = 900
/** Snap from pack-back to art after the card resolves. */
const REVEAL_FLIP_MS = 260
const FX_FADE_MS = 900

type ModalView = 'draw' | 'collection'

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function packHaptic(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  if (prefersReducedMotion()) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* ignore */
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

function rarityFxDurationMs(card: DrawnCard): number {
  const r = card.rarity
  if (r === 'mythic' || r === 'special') return 3200
  if (r === 'rare') return 2600
  if (r === 'uncommon') return 2000
  return 1600
}

function flipDurationMs(card: DrawnCard | null | undefined): number {
  if (prefersReducedMotion()) return 0
  const r = card?.rarity
  if (r === 'mythic' || r === 'special') return 320
  if (r === 'rare') return 280
  if (r === 'uncommon') return 230
  return 200
}

function revealLandHaptic(card: DrawnCard | null | undefined): number[] {
  const r = card?.rarity
  if (r === 'mythic' || r === 'special') return [30, 40, 20, 40, 45]
  if (r === 'rare') return [25, 50, 30]
  if (r === 'uncommon') return [18, 40, 12]
  return [15]
}

/** Odd turns show card art (`.card-face.back`). */
function isShowingFront(turns: number): boolean {
  return turns % 2 === 1
}

export function SingleDrawButton() {
  const { t } = useTranslation()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ModalView>('draw')
  const [card, setCard] = useState<DrawnCard | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [flipTurns, setFlipTurns] = useState(0)
  const [flipping, setFlipping] = useState(false)
  const [flipMs, setFlipMs] = useState(FLIP_MS)
  const [collected, setCollected] = useState(false)
  const [artZoomed, setArtZoomed] = useState(false)
  const [fxGlow, setFxGlow] = useState(false)
  const [fxFade, setFxFade] = useState(false)
  const [fxEpoch, setFxEpoch] = useState(0)
  const [error, setError] = useState<string | null>(null)
  /** True after the first real reveal of drawn art (not idle loading flips). */
  const [revealed, setRevealed] = useState(false)
  const timers = useRef<number[]>([])
  const fxTimers = useRef<number[]>([])
  const enrichGen = useRef(0)
  const drawGen = useRef(0)

  const clearTimers = () => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }

  const clearFxTimers = () => {
    for (const id of fxTimers.current) window.clearTimeout(id)
    fxTimers.current = []
  }

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
  }

  const scheduleFx = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    fxTimers.current.push(id)
  }

  const reset = useCallback(() => {
    clearTimers()
    clearFxTimers()
    drawGen.current += 1
    enrichGen.current += 1
    setCard(null)
    setDrawing(false)
    setFlipTurns(0)
    setFlipping(false)
    setCollected(false)
    setArtZoomed(false)
    setFxGlow(false)
    setFxFade(false)
    setError(null)
    setRevealed(false)
    setView('draw')
  }, [])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (artZoomed) {
          setArtZoomed(false)
          return
        }
        if (view === 'collection') {
          setView('draw')
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
  }, [open, artZoomed, view, reset])

  useEffect(
    () => () => {
      clearTimers()
      clearFxTimers()
    },
    [],
  )

  const triggerFrontFx = (drawn: DrawnCard) => {
    clearFxTimers()
    setFxFade(false)
    setFxGlow(false)
    setFxEpoch((n) => n + 1)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFxGlow(true)
        scheduleFx(() => {
          setFxGlow(false)
          setFxFade(true)
          scheduleFx(() => setFxFade(false), FX_FADE_MS)
        }, rarityFxDurationMs(drawn))
      })
    })
  }

  const hydrateZh = (drawn: DrawnCard) => {
    if (!wantsZh()) return
    const gen = ++enrichGen.current
    if (hasZhPrint(drawn) || !drawn.oracleId || drawn.source === 'local') return
    void enrichDrawnCardZh(drawn).then((enriched) => {
      if (gen !== enrichGen.current) return
      if (!hasZhPrint(enriched)) return
      setCard((prev) => (prev?.id === drawn.id ? enriched : prev))
      if (isCollected(drawn.id)) {
        updateCollected(enriched)
      }
    })
  }

  const runDraw = useCallback(async () => {
    if (drawing) return
    const gen = ++drawGen.current
    setDrawing(true)
    setError(null)
    setFlipTurns(0)
    setFlipping(false)
    setFxGlow(false)
    setFxFade(false)
    setArtZoomed(false)
    setCollected(false)
    setRevealed(false)
    setCard(null)
    try {
      const drawn = await drawWeightedCard()
      if (gen !== drawGen.current) return
      await preloadImage(drawn.frontImageUrl).catch(() => undefined)
      if (gen !== drawGen.current) return
      setCard(drawn)
      hydrateZh(drawn)
      setDrawing(false)

      // Stop wait-spin on pack back (0°), then quickly turn to art (180°).
      const ms = prefersReducedMotion() ? 0 : REVEAL_FLIP_MS
      setFlipMs(ms || FLIP_MS)
      setFlipTurns(0)
      setFlipping(false)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (gen !== drawGen.current) return
          setFlipping(true)
          setFlipTurns(1)
          packHaptic(10)
          schedule(() => {
            packHaptic(revealLandHaptic(drawn))
          }, Math.max(40, Math.round(ms * 0.55)))
          schedule(() => {
            if (gen !== drawGen.current) return
            setFlipping(false)
            setRevealed(true)
            setCollected(isCollected(drawn.id))
            triggerFrontFx(drawn)
          }, ms)
        })
      })
    } catch {
      if (gen !== drawGen.current) return
      setError(t('singleDraw.error'))
      setDrawing(false)
    }
  }, [drawing, t])

  useEffect(() => {
    if (!open) return
    void runDraw()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps -- one draw per open

  const waiting = drawing || !card
  const faceUp = !waiting && isShowingFront(flipTurns)
  const fxClass = rarityFxClass(card)
  const showFxLayer =
    (fxGlow || fxFade) &&
    faceUp &&
    (fxClass === 'pack-fx-rare' || fxClass === 'pack-fx-mythic')

  const flipOnce = () => {
    if (flipping || waiting || !card || !revealed) return

    const nextTurns = flipTurns + 1
    const revealing = isShowingFront(nextTurns)
    const ms = flipDurationMs(card)
    setFlipMs(ms || FLIP_MS)
    setFlipping(true)
    setFlipTurns(nextTurns)
    if (revealing) {
      packHaptic(10)
      schedule(() => packHaptic(revealLandHaptic(card)), Math.max(40, Math.round(ms * 0.55)))
    }
    schedule(() => {
      setFlipping(false)
      if (revealing) {
        setCollected(isCollected(card.id))
        triggerFrontFx(card)
      }
    }, ms)
  }

  const onToggleCollect = () => {
    if (!card || !revealed) return
    if (collected) {
      removeCollected(card.id)
      setCollected(false)
    } else {
      addCollected(card)
      setCollected(true)
    }
  }

  const onDrawAgain = useCallback(() => {
    if (drawing) return
    clearTimers()
    clearFxTimers()
    void runDraw()
  }, [drawing, runDraw])

  const packBackSrc = defaultCardBackUrl()
  const otherArt = card ? dualFaceImageUrl(card) : undefined
  // Before first reveal: always classic pack back. After: other face art or card back.
  const backSrc =
    waiting || !revealed
      ? packBackSrc
      : otherArt || card?.backImageUrl || packBackSrc
  const frontSrc = waiting ? packBackSrc : card?.frontImageUrl || packBackSrc
  const showingOtherFace =
    !!card && revealed && !faceUp && hasDualFaceArt(card)
  const showDetails = !!card && revealed
  const { panStyle, panBind } = useArtZoomPan(artZoomed)
  const canShakeRedraw = revealed && !drawing && !artZoomed && !flipping
  const hold = useCardHoldDrag(canShakeRedraw, {
    axis: 'any',
    onShakeCommit: onDrawAgain,
  })

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
                (fxGlow || fxFade || flipping)
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
                    : t('singleDraw.title')}
                </h2>
                <div className="pack-draw-head-actions">
                  {view === 'draw' ? (
                    <PackHeadIconButton
                      icon="redraw"
                      label={t('singleDraw.drawAgain')}
                      onClick={onDrawAgain}
                      disabled={drawing}
                    />
                  ) : null}
                  {view === 'draw' && showDetails && card ? (
                    <PackHeadIconButton
                      icon={collected ? 'collected' : 'collect'}
                      label={
                        collected
                          ? t('packDraw.collected')
                          : t('packDraw.collect')
                      }
                      className={collected ? 'is-active' : ''}
                      onClick={onToggleCollect}
                    />
                  ) : null}
                  {view === 'draw' ? (
                    <PackHeadIconButton
                      icon="cabinet"
                      label={t('packDraw.collection')}
                      onClick={() => setView('collection')}
                    />
                  ) : (
                    <PackHeadIconButton
                      icon="back"
                      label={t('singleDraw.backToDraw')}
                      onClick={() => {
                        if (card) setCollected(isCollected(card.id))
                        setView('draw')
                      }}
                    />
                  )}
                  <PackHeadIconButton
                    icon="close"
                    label={t('deck.close')}
                    onClick={() => setOpen(false)}
                  />
                </div>
              </header>

              {view === 'collection' ? (
                <PackCollectionCabinet
                  onCollectionChange={() => {
                    if (card) setCollected(isCollected(card.id))
                  }}
                />
              ) : (
              <div
                className={[
                  'pack-draw-stage',
                  'has-copy',
                  artZoomed ? 'is-art-zoomed' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div
                  className="pack-stage-visual is-revealed"
                  {...(artZoomed ? panBind : {})}
                >
                  <div
                    className="pack-reveal-stack is-deck is-browsable"
                    style={panStyle}
                    {...(artZoomed ? {} : hold.bind)}
                  >
                    <div className="pack-card-deck" role="list">
                      <div
                        role="listitem"
                        className={[
                          'pack-card-wrap',
                          'is-expanded',
                          'is-active',
                          flipping ? 'is-flipping' : '',
                          waiting ? 'is-waiting-spin' : '',
                          !revealed && !waiting ? 'is-awaiting-flip' : '',
                          card && !waiting ? fxClass : '',
                          fxGlow && faceUp ? 'is-glowing' : '',
                          fxFade && faceUp ? 'is-fading' : '',
                          hold.holding ? 'is-holding' : '',
                          hold.dragging ? 'is-dragging' : '',
                          hold.dragHint < 0 ? 'is-drag-prev' : '',
                          hold.dragHint > 0 ? 'is-drag-next' : '',
                          hold.shakeArmed ? 'is-shake-armed' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{
                          zIndex: hold.holding ? 6 : 5,
                          ['--pack-flip-ms' as string]: flipping
                            ? `${flipMs}ms`
                            : undefined,
                          ['--single-draw-spin-ms' as string]: `${WAIT_SPIN_PERIOD_MS}ms`,
                          ['--pack-hold-x' as string]: hold.holding
                            ? `${hold.dragX}px`
                            : undefined,
                          ['--pack-hold-rot' as string]: hold.holding
                            ? `${hold.dragX * 0.12}deg`
                            : undefined,
                        }}
                        title={
                          canShakeRedraw
                            ? t('singleDraw.shakeRedrawHint')
                            : undefined
                        }
                      >
                        {showFxLayer ? (
                          <span
                            key={`sparkles-${fxEpoch}`}
                            className={[
                              'pack-fx-layer',
                              'is-sparkles',
                              fxClass === 'pack-fx-mythic' ? 'is-mythic' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            aria-hidden
                          />
                        ) : null}
                        <div className="card-flip pack-card-flip">
                          <CardFaceButton
                            className={[
                              'card-flip-inner',
                              waiting ? 'is-waiting-spin' : '',
                              flipping ? 'is-flipping' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            enabled={revealed && !waiting}
                            immediateFlip={false}
                            ariaLabel={
                              waiting
                                ? t('singleDraw.loading')
                                : revealed
                                  ? `${card!.name}. ${t('deck.faceGesture')}`
                                  : t('singleDraw.loading')
                            }
                            style={
                              waiting
                                ? undefined
                                : {
                                    transform: `translate3d(0, 0, 0) rotateY(${flipTurns * 180}deg)`,
                                    transitionDuration: flipping
                                      ? `${flipMs}ms`
                                      : undefined,
                                  }
                            }
                            onFlip={flipOnce}
                            onToggleZoom={() => {
                              if (!card || !revealed) return
                              setArtZoomed((z) => !z)
                            }}
                          >
                            <span className="card-face front">
                              <CardArtImage
                                src={backSrc}
                                alt={t('deck.backHint')}
                                draggable={false}
                              />
                            </span>
                            <span
                              className={[
                                'card-face',
                                'back',
                                waiting ? 'is-blank-face' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              {waiting ? (
                                <span className="card-face-blank" aria-hidden />
                              ) : (
                                <CardArtImage
                                  src={frontSrc}
                                  alt={card?.name || ''}
                                  draggable={false}
                                />
                              )}
                            </span>
                          </CardFaceButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={[
                    'pack-card-copy',
                    !showDetails ? 'is-awaiting' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="pack-card-copy-cluster">
                    <div className="pack-card-copy-body">
                      {showDetails && card ? (
                        <CardDetailsBody
                          card={card}
                          faceSide={showingOtherFace ? 'back' : 'front'}
                        />
                      ) : (
                        <p className="pack-draw-hint pack-tap-hint" role="status">
                          {error ? error : t('singleDraw.loading')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
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
        {t('singleDraw.open')}
      </button>
      {dialog}
    </>
  )
}
