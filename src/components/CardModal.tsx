import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import { deckCardToDrawn, wantsZh } from '../data/randomCard'
import { useSwipeNavigate } from '../hooks/useSwipeNavigate'
import { useArtZoomPan } from '../hooks/useArtZoomPan'
import { useCardHoldDrag } from '../hooks/useCardHoldDrag'
import { useCardImageSrc } from '../hooks/useCardImageSrc'
import type { DeckCard } from '../types'
import { preloadAssetCandidates } from '../utils/remoteAsset'
import { CardDetailsBody } from './CardDetailsBody'
import { CardFaceButton } from './CardFaceButton'
import '../styles/pack.css'
import '../styles/deck.css'

interface CardModalProps {
  card: DeckCard | null
  /** Full deck list for swipe / keyboard browse. */
  cards?: DeckCard[]
  onSelect?: (card: DeckCard) => void
  /** Challenge deck code (`tfth` / `tbth` / `tdag`) for bilingual lookup. */
  deckCode: string
  /** Printed set code for collector line (e.g. TFTH). */
  setCode: string
  onClose: () => void
}

export function CardModal({
  card,
  cards,
  onSelect,
  deckCode,
  setCode,
  onClose,
}: CardModalProps) {
  if (!card) return null
  return (
    <CardModalBody
      card={card}
      cards={cards}
      onSelect={onSelect}
      deckCode={deckCode}
      setCode={setCode}
      onClose={onClose}
    />
  )
}

function CardModalBody({
  card,
  cards,
  onSelect,
  deckCode,
  setCode,
  onClose,
}: {
  card: DeckCard
  cards?: DeckCard[]
  onSelect?: (card: DeckCard) => void
  deckCode: string
  setCode: string
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

  const drawn = useMemo(() => {
    const meta = wantsZh(i18n.language)
      ? deckMetaZh[deckCode]
      : deckMetaEn[deckCode]
    return deckCardToDrawn(card, setCode, {
      setName: meta?.expansion ?? meta?.name ?? '',
      useDeckBack: true,
    })
  }, [card, deckCode, setCode, i18n.language])

  useEffect(() => {
    setFlipTurns(0)
    setFlipping(false)
    setArtZoomed(false)
  }, [card.id])

  useEffect(() => {
    const facePath = card.images.display || card.images.front
    void preloadAssetCandidates(facePath, {
      id: card.id,
      kind: 'large',
    }).catch(() => undefined)
    void preloadAssetCandidates(card.images.back, {
      id: card.id,
      kind: 'card_back',
    }).catch(() => undefined)
  }, [card])

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

  const facePath = card.images.display || card.images.front
  const front = useCardImageSrc(facePath, { id: card.id, kind: 'large' })
  const back = useCardImageSrc(card.images.back, {
    id: card.id,
    kind: 'card_back',
  })
  const displayTitle = wantsZh(i18n.language)
    ? drawn.nameZh || drawn.name
    : drawn.name

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
          <h2 id={titleId}>{t('deck.cards')}</h2>
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
                        src={front.src}
                        alt={displayTitle}
                        draggable={false}
                        decoding="async"
                        onError={front.onError}
                      />
                    </span>
                    <span className="card-face back">
                      <img
                        src={back.src}
                        alt={t('deck.backHint')}
                        draggable={false}
                        decoding="async"
                        onError={back.onError}
                      />
                    </span>
                  </CardFaceButton>
                </div>
              </div>
            </div>

            <div className="pack-card-copy pack-inspect-copy">
              <div className="pack-card-copy-cluster">
                <div className="pack-card-copy-body">
                  <CardDetailsBody card={drawn} showOfflineHint={false} />
                  <p className="qty">
                    {t('deck.quantity', { n: card.quantity })}
                  </p>
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
