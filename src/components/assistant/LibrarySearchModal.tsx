import { useTranslation } from 'react-i18next'
import type { AssistantCard } from '../../assistant/types'
import type { DragPayload } from '../../assistant/dnd'
import { ArenaCard } from '../challenge/ArenaCard'
import { CardImage } from '../../hooks/useCardImageSrc'

type Props = {
  library: AssistantCard[]
  onClose: () => void
  onPlay: (instanceId: string) => void
  onStartDrag: (
    e: React.PointerEvent,
    payload: DragPayload,
    meta: { image: string; name: string },
  ) => void
  localizeName: (name: string) => string
  onHoverCard?: (card: AssistantCard) => void
  onLeaveCard?: () => void
}

export function LibrarySearchModal({
  library,
  onClose,
  onPlay,
  onStartDrag,
  localizeName,
  onHoverCard,
  onLeaveCard,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="assistant-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="assistant-modal"
        role="dialog"
        aria-labelledby="assistant-search-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="assistant-modal-head">
          <div>
            <h2 id="assistant-search-title">{t('assistant.searchTitle')}</h2>
            <p>{t('assistant.searchHint')}</p>
          </div>
          <button type="button" className="btn ghost" onClick={onClose}>
            {t('assistant.closeSearch')}
          </button>
        </header>
        <div className="assistant-search-grid">
          {library.length === 0 ? (
            <p className="assistant-empty">{t('assistant.zoneEmpty')}</p>
          ) : (
            library.map((card, index) => (
              <div
                key={card.instanceId}
                className="assistant-search-card"
                data-drop-zone="search"
                data-drop-index={String(index)}
              >
                <span className="assistant-search-index">{index + 1}</span>
                <ArenaCard
                  image={card.image}
                  name={localizeName(card.name)}
                  instanceId={card.instanceId}
                  compact
                  onClick={() => onPlay(card.instanceId)}
                  onMouseEnter={() => onHoverCard?.(card)}
                  onMouseLeave={onLeaveCard}
                  onPointerDown={(e) =>
                    onStartDrag(
                      e,
                      {
                        instanceId: card.instanceId,
                        source: { zone: 'search', index },
                      },
                      { image: card.image, name: localizeName(card.name) },
                    )
                  }
                />
                <button
                  type="button"
                  className="btn ghost tiny"
                  onClick={() => onPlay(card.instanceId)}
                >
                  {t('assistant.playToBattlefield')}
                </button>
              </div>
            ))
          )}
        </div>
        {library[0] ? (
          <div className="assistant-search-preview" aria-hidden="true">
            <CardImage localPath={library[0].image} kind="large" alt="" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
