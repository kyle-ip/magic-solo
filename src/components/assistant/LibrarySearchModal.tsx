import { useTranslation } from 'react-i18next'
import type { AssistantCard } from '../../assistant/types'
import type { DragPayload } from '../../assistant/dnd'
import { ArenaCard } from '../challenge/ArenaCard'
import { CardImage } from '../../hooks/useCardImageSrc'
import { PackHeadIconButton } from '../PackHeadIconButton'
import { AppOverlay, UiButton } from '../ui'

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
    <AppOverlay
      open
      onClose={onClose}
      mode="modal"
      title={t('assistant.searchTitle')}
      titleId="assistant-search-title"
      className="assistant-modal-backdrop"
      shellClassName="assistant-modal"
      size="wide"
      headerActions={
        <PackHeadIconButton
          icon="close"
          label={t('assistant.closeSearch')}
          onClick={onClose}
        />
      }
    >
      <p className="assistant-search-lead">{t('assistant.searchHint')}</p>
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
              <UiButton
                variant="ghost"
                size="compact"
                className="tiny"
                onClick={() => onPlay(card.instanceId)}
              >
                {t('assistant.playToBattlefield')}
              </UiButton>
            </div>
          ))
        )}
      </div>
      {library[0] ? (
        <div className="assistant-search-preview" aria-hidden="true">
          <CardImage localPath={library[0].image} kind="png" alt="" />
        </div>
      ) : null}
    </AppOverlay>
  )
}
