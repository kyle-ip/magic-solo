import { useTranslation } from 'react-i18next'
import { localizeKeywords } from '../data/locale/keywordsZh'
import {
  displayFaceFlavor,
  displayFaceName,
  displayFaceOracle,
  displayFaceTypeLine,
  displayFlavor,
  displayName,
  displayOracle,
  displayTypeLine,
  wantsZh,
  type DrawnCard,
  type DrawnCardFace,
} from '../data/randomCard'
import { ManaCost, ManaRichText } from './ManaCost'
import { CardLlmAssist } from './CardLlmAssist'

interface CardDetailsBodyProps {
  card: DrawnCard
  /** Pack offline fallback note — hide on deck gallery. */
  showOfflineHint?: boolean
  /** Other unique card names when opened from a collection (optional LLM synergy). */
  collectionPeers?: string[]
}

function FaceBlock({
  face,
  lang,
  heading,
}: {
  face: DrawnCardFace
  lang: string
  heading: string
}) {
  const zhUi = wantsZh(lang)
  const name = displayFaceName(face, lang)
  const typeLine = displayFaceTypeLine(face, lang)
  const oracle = displayFaceOracle(face, lang)
  const flavor = displayFaceFlavor(face, lang)
  const pt =
    face.power != null && face.toughness != null
      ? `${face.power}/${face.toughness}`
      : null

  return (
    <section className="pack-other-face">
      <h4>{heading}</h4>
      <p className="pack-other-face-name">{name}</p>
      {zhUi && face.nameZh && face.nameZh !== face.name ? (
        <p className="pack-en-name">{face.name}</p>
      ) : null}
      {typeLine ? <p className="type-line">{typeLine}</p> : null}
      {face.manaCost ? <ManaCost cost={face.manaCost} /> : null}
      {pt ? <p className="pt-line">{pt}</p> : null}
      <div className="pack-details-block">
        <ManaRichText text={oracle || '—'} className="oracle-text" />
        {flavor ? <p className="pack-flavor-text">{flavor}</p> : null}
      </div>
    </section>
  )
}

/** Shared card details copy used by pack open, collection, and deck modal. */
export function CardDetailsBody({
  card,
  showOfflineHint = card.source === 'local',
  collectionPeers,
}: CardDetailsBodyProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const zhUi = wantsZh(lang)
  const name = displayName(card, lang)
  const typeLine = displayTypeLine(card, lang)
  const oracle = displayOracle(card, lang)
  const flavor = displayFlavor(card, lang)
  const keywords = localizeKeywords(card.keywords ?? [], lang)
  const otherFaces = card.otherFaces ?? []
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
      {card.scryfallUri ? (
        <a
          className="pack-card-name-link"
          href={card.scryfallUri}
          target="_blank"
          rel="noreferrer"
          title={t('packDraw.openOnScryfall')}
        >
          <h3>{name}</h3>
        </a>
      ) : (
        <h3>{name}</h3>
      )}
      {zhUi && card.nameZh && card.nameZh !== card.name ? (
        card.scryfallUri ? (
          <a
            className="pack-card-name-link pack-en-name-link"
            href={card.scryfallUri}
            target="_blank"
            rel="noreferrer"
            title={t('packDraw.openOnScryfall')}
          >
            <p className="pack-en-name" title={t('packDraw.englishName')}>
              {card.name}
            </p>
          </a>
        ) : (
          <p className="pack-en-name" title={t('packDraw.englishName')}>
            {card.name}
          </p>
        )
      ) : null}
      <p className="type-line">{typeLine}</p>
      {card.manaCost ? <ManaCost cost={card.manaCost} /> : null}
      {pt ? <p className="pt-line">{pt}</p> : null}
      <h4>{t('packDraw.details')}</h4>
      <div className="pack-details-block">
        <ManaRichText text={oracle || '—'} className="oracle-text" />
        {flavor ? <p className="pack-flavor-text">{flavor}</p> : null}
      </div>
      {otherFaces.map((face, i) => (
        <FaceBlock
          key={`${face.name}-${i}`}
          face={face}
          lang={lang}
          heading={
            otherFaces.length > 1
              ? t('packDraw.otherFaceN', { n: i + 2 })
              : t('packDraw.otherFace')
          }
        />
      ))}
      {keywords.length > 0 ? (
        <p className="pack-keywords">
          <span className="pack-keywords-label">{t('packDraw.keywords')}</span>
          {keywords.join(' · ')}
        </p>
      ) : null}
      {card.artist ? (
        <p className="artist">{t('deck.artist', { name: card.artist })}</p>
      ) : null}
      {showOfflineHint ? (
        <p className="pack-draw-hint">{t('packDraw.fallbackHint')}</p>
      ) : null}
      <CardLlmAssist card={card} collectionPeers={collectionPeers} />
    </>
  )
}
