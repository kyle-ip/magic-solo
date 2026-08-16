import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PrimaryActionResult } from '../../challenge/primaryAction'

export function PrimaryActionBar({
  action,
  onPrimary,
  onCancelCombat,
  onCancelTarget,
  onEndTurn,
  above,
}: {
  action: PrimaryActionResult
  onPrimary: () => void
  onCancelCombat?: () => void
  onCancelTarget?: () => void
  onEndTurn?: () => void
  /** Optional control stacked above the main action (e.g. board recenter). */
  above?: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className="arena-play-actions">
      {above}
      {action.hintKey ? (
        <p className="arena-action-hint" role="status">
          {t(action.hintKey)}
        </p>
      ) : null}
      {action.secondaries.includes('cancel_combat') && onCancelCombat ? (
        <button type="button" className="btn arena-secondary-action" onClick={onCancelCombat}>
          {t('challenge.cancelCombat')}
        </button>
      ) : null}
      {action.secondaries.includes('cancel_target') && onCancelTarget ? (
        <button type="button" className="btn arena-secondary-action" onClick={onCancelTarget}>
          {t('challenge.cancelTarget')}
        </button>
      ) : null}
      {action.secondaries.includes('end_turn') && onEndTurn ? (
        <button type="button" className="btn arena-secondary-action" onClick={onEndTurn}>
          {t('challenge.endTurn')}
        </button>
      ) : null}
      {action.kind !== 'none' ? (
        <button
          type="button"
          className={`btn arena-primary-action${
            action.kind === 'end_turn' || action.kind === 'resolve_combat' ? ' is-go' : ''
          }${action.kind === 'enter_combat' ? ' is-combat' : ''}${
            action.kind === 'advance' ? ' is-advance' : ''
          }`}
          disabled={action.disabled}
          onClick={onPrimary}
        >
          {t(action.labelKey)}
        </button>
      ) : null}
    </div>
  )
}
