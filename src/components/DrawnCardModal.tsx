import { useCallback, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  displayName,
  wantsZh,
  type DrawnCard,
} from '../data/randomCard'
import { useArtZoomPan } from '../hooks/useArtZoomPan'
import { useCardHoldDrag } from '../hooks/useCardHoldDrag'
import { useSwipeNavigate } from '../hooks/useSwipeNavigate'
import { preloadImage } from '../utils/imageCache'
import { CardDetailsBody } from './CardDetailsBody'
import { CardFaceButton } from './CardFaceButton'
import '../styles/pack.css'
import '../styles/deck.css'

interface DrawnCardModalProps {
  card: DrawnCard | null
  cards?: DrawnCard[]
  quantity?: number
  onSelect?: (card: DrawnCard) => void
  onClose: () => void
}

export function DrawnCardModal({
  card,
  cards,
  quantity,
  onSelect,
  onClose,
}: DrawnCardModalProps) {
  if (!card) return null
  return (
    <DrawnCardModalBody
      card={card}
      cards={cards}
      quantity={quantity}
      onSelect={onSelect}
      onClose={onClose}
    />
  )
}

function DrawnCardModalBody({
  card,
  cards,
  quantity,
  onSelect,
  onClose,
}: {
  card: DrawnCard
  cards?: DrawnCard[]
  quantity?: number
  onSelect?: (card: DrawnCard) => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const titleId = useId()
  const [flipTurns, setFlipTurns] = useState(0)
  const [flipping, setFlipping] = useState(false)
  const [artZoomed, setArtZoomed] = useState(false)

  const browseList = cards && cards.length > 0 ? cards : [card]
  const canBrowse = browseList.length > 1 && !!onSelect
  const cardIndex = browseList.findIndex((c) => c.id === card.id)

  useEffect(() => {
    setFlipTurns(0)
    setFlipping(false)
    setArtZoomed(false)
  }, [card.id])

  useEffect(() => {
    void preloadImage(card.frontImageUrl).catch(() => undefined)
    void preloadImage(card.backImageUrl).catch(() => undefined)
  }, [card])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  const stepCard = useCallback(
    (delta: number) => {
      if (!canBrowse || !onSelect || cardIndex < 0) return
      const next =
        browseList[
          ((cardIndex + delta) % browseList.length + browseList.length) %
            browseList.length
        ]
      if (next) onSelect(next)
    },
    [browseList, canBrowse, cardIndex, onSelect],
  )

  const swipe = useSwipeNavigate((delta) => stepCard(delta), canBrowse && !artZoomed)
  const hold = useCardHoldDrag(!canBrowse && !artZoomed)
  const gesture = canBrowse ? swipe : hold
  const { panStyle, panBind } = useArtZoomPan(artZoomed)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (artZoomed) {
          setArtZoomed(false)
          return
        }
        onClose()
        return
      }
      if (!canBrowse) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        stepCard(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        stepCard(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [artZoomed, canBrowse, onClose, stepCard])

  const displayTitle = wantsZh(i18n.language)
    ? displayName(card, i18n.language)
    : card.name

  const flipOnce = () => {
    setFlipping(true)
    requestAnimationFrame(() => setFlipTurns((n) => n + 1))
    window.setTimeout(() => setFlipping(false), 400)
  }

  return createPortal(
    <div className="pack-draw-backdrop" role="presentation" onClick={onClose}>
      <div
        className="pack-draw-modal is-collection"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pack-draw-head">
          <h2 id={titleId}>{t('classicDecks.cardDetails')}</h2>
          <div className="pack-draw-head-actions">
            <button
              type="button"
              className="references-text-btn"
              onClick={onClose}
            >
              {t('deck.close')}
            </button>
          </div>
        </header>

        <div className="pack-collection">
          <div
            className={[
              'pack-inspect',
              artZoomed ? 'is-art-zoomed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={displayTitle}
          >
            <div className="pack-inspect-stage" {...(artZoomed ? panBind : gesture.bind)}>
              <div
                className={[
                  'pack-card-wrap',
                  'pack-inspect-wrap',
                  'is-expanded',
                  'is-active',
                  gesture.holding ? 'is-holding' : '',
                  gesture.dragging ? 'is-dragging' : '',
                  gesture.dragHint < 0 ? 'is-drag-prev' : '',
                  gesture.dragHint > 0 ? 'is-drag-next' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  ...panStyle,
                  ['--pack-hold-x' as string]: gesture.holding
                    ? `${gesture.dragX}px`
                    : undefined,
                  ['--pack-hold-rot' as string]: gesture.holding
                    ? `${gesture.dragX * 0.12}deg`
                    : undefined,
                }}
              >
                <div className="card-flip pack-inspect-flip">
                  <CardFaceButton
                    className={[
                      'card-flip-inner',
                      flipping ? 'is-flipping' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    ariaLabel={t('deck.flip')}
                    style={{
                      transform: `translate3d(0, 0, 0) rotateY(${flipTurns * 180}deg)`,
                    }}
                    onFlip={flipOnce}
                    onToggleZoom={() => setArtZoomed((z) => !z)}
                  >
                    <span className="card-face front">
                      <img
                        src={card.frontImageUrl}
                        alt={displayTitle}
                        draggable={false}
                      />
                    </span>
                    <span className="card-face back">
                      <img
                        src={card.backImageUrl}
                        alt={t('deck.backHint')}
                        draggable={false}
                      />
                    </span>
                  </CardFaceButton>
                </div>
              </div>
            </div>

            <div className="pack-card-copy pack-inspect-copy">
              <div className="pack-card-copy-cluster">
                <div className="pack-card-copy-body">
                  <CardDetailsBody card={card} showOfflineHint={false} />
                  {quantity != null ? (
                    <p className="qty">{t('deck.quantity', { n: quantity })}</p>
                  ) : null}
                </div>
                <div className="pack-draw-actions">
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
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
