import { useTranslation } from 'react-i18next'
import type { CardInstance } from '../../game/types'
import { assetUrl } from '../../utils/assetUrl'

interface CastStageProps {
  card: CardInstance | null
  awaiting: boolean
  onAdvance: () => void
  cardLabel?: string
  typeLine?: string
  oracleText?: string
}

export function CastStage({
  card,
  awaiting,
  onAdvance,
  cardLabel,
  typeLine,
  oracleText,
}: CastStageProps) {
  const { t } = useTranslation()

  if (!card || !awaiting) return null

  const label = cardLabel ?? card.name
  const type = typeLine ?? card.typeLine
  const oracle = oracleText ?? card.oracleText
  const pt =
    card.power != null && card.toughness != null
      ? `${card.power}/${card.toughness}`
      : null

  return (
    <div className="cast-stage" role="presentation" onClick={onAdvance}>
      <div className="cast-stage-panel">
        <div className="cast-stage-card">
          <img src={assetUrl(card.image)} alt={label} />
        </div>
        <div className="cast-stage-detail">
          <p className="cast-stage-name">{label}</p>
          {type ? <p className="cast-stage-type">{type}</p> : null}
          {pt ? <p className="cast-stage-pt">{pt}</p> : null}
          {oracle ? (
            <p className="cast-stage-oracle">{oracle}</p>
          ) : null}
          <span className="cast-stage-confirm-hint">{t('challenge.castContinue')}</span>
        </div>
      </div>
    </div>
  )
}
