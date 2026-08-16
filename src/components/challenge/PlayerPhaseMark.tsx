import { useTranslation } from 'react-i18next'

/** Read-only phase marker on the player chrome (replaces the center phase strip). */
export function PlayerPhaseMark({
  phase,
  active,
  combatStepLabel,
}: {
  phase: 'main' | 'combat' | 'end'
  active: boolean
  combatStepLabel?: string | null
}) {
  const { t } = useTranslation()
  return (
    <div
      className={`player-phase-mark${active ? ' is-active' : ' is-idle'}`}
      aria-live="polite"
    >
      <span className="player-phase-mark-label">{t('challenge.phaseMark')}</span>
      <strong className="player-phase-mark-value">
        {t(`challenge.phase.${phase}`)}
      </strong>
      {phase === 'combat' && combatStepLabel ? (
        <span className="player-phase-mark-step">{combatStepLabel}</span>
      ) : null}
    </div>
  )
}
