import { useTranslation } from 'react-i18next'
import {
  displayFlavor,
  displayName,
  displayOracle,
  displayTypeLine,
  wantsZh,
  type DrawnCard,
} from '../data/randomCard'

interface CardDetailsBodyProps {
  card: DrawnCard
  /** Pack offline fallback note — hide on deck gallery. */
  showOfflineHint?: boolean
}

/** Shared card details copy used by pack open, collection, and deck modal. */
export function CardDetailsBody({
  card,
  showOfflineHint = card.source === 'local',
}: CardDetailsBodyProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const zhUi = wantsZh(lang)
  const name = displayName(card, lang)
  const typeLine = displayTypeLine(card, lang)
  const oracle = displayOracle(card, lang)
  const flavor = displayFlavor(card, lang)
  const pt =
    card.power != null && card.toughness != null
      ? `${card.power}/${card.toughness}`
      : null
  const setLine = card.setName
    ? `${card.setName} · ${card.setCode}${card.collectorNumber ? ` #${card.collectorNumber}` : ''}`
    : t('deck.collector', {
        set: card.setCode,
        number: card.collectorNumber,
      })

  return (
    <>
      <p className="eyebrow">
        {setLine}
        <span className={`pack-rarity-chip rarity-${card.rarity}`}>
          {t(`packDraw.rarity.${card.rarity}`, {
            defaultValue: card.rarity,
          })}
        </span>
      </p>
      <h3>{name}</h3>
      {zhUi && card.nameZh && card.nameZh !== card.name ? (
        <p className="pack-en-name" title={t('packDraw.englishName')}>
          {card.name}
        </p>
      ) : null}
      <p className="type-line">{typeLine}</p>
      {card.manaCost ? <p className="pack-mana-cost">{card.manaCost}</p> : null}
      {pt ? <p className="pt-line">{pt}</p> : null}
      <h4>{t('packDraw.details')}</h4>
      <div className="pack-details-block">
        <p className="oracle-text">{oracle || '—'}</p>
        {flavor ? <p className="pack-flavor-text">{flavor}</p> : null}
      </div>
      {card.keywords?.length > 0 ? (
        <p className="pack-keywords">
          <span className="pack-keywords-label">{t('packDraw.keywords')}</span>
          {card.keywords.join(' · ')}
        </p>
      ) : null}
      {card.artist ? (
        <p className="artist">{t('deck.artist', { name: card.artist })}</p>
      ) : null}
      {showOfflineHint ? (
        <p className="pack-draw-hint">{t('packDraw.fallbackHint')}</p>
      ) : null}
    </>
  )
}
