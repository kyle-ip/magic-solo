import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import { deckCardToDrawn, wantsZh } from '../data/randomCard'
import { useSwipeNavigate } from '../hooks/useSwipeNavigate'
import type { DeckCard } from '../types'
import { assetUrl } from '../utils/assetUrl'
import { preloadImage } from '../utils/imageCache'
import { CardDetailsBody } from './CardDetailsBody'

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
  }, [card.id])

  useEffect(() => {
    const front = assetUrl(card.images.display || card.images.front)
    const back = assetUrl(card.images.back)
    void preloadImage(front).catch(() => undefined)
    void preloadImage(back).catch(() => undefined)
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

  const swipe = useSwipeNavigate((delta) => stepCard(delta), canBrowse)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  }, [canBrowse, onClose, stepCard])

  const frontSrc = assetUrl(card.images.display || card.images.front)
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
      {/* Same shell + inspect panel as collection cabinet card details */}
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
          <div className="pack-inspect" aria-label={displayTitle}>
            <div className="pack-inspect-stage" {...swipe}>
              <div
                className={[
                  'pack-card-wrap',
                  'pack-inspect-wrap',
                  'is-expanded',
                  'is-active',
                ].join(' ')}
              >
                <div className="card-flip pack-inspect-flip">
                  <div
                    className={[
                      'card-flip-inner',
                      flipping ? 'is-flipping' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    role="button"
                    tabIndex={0}
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
                      <img src={frontSrc} alt={displayTitle} draggable={false} />
                    </span>
                    <span className="card-face back">
                      <img
                        src={assetUrl(card.images.back)}
                        alt={t('deck.backHint')}
                        draggable={false}
                      />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pack-card-copy pack-inspect-copy">
              <div className="pack-card-copy-cluster">
                <div className="pack-card-copy-body">
                  <CardDetailsBody card={drawn} showOfflineHint={false} />
                  <p className="qty">{t('deck.quantity', { n: card.quantity })}</p>
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
