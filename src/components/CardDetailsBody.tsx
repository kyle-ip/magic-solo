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
  hasDualFaceArt,
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
  /**
   * Which printed face to emphasize.
   * For transform / MDFC with dual art, `'back'` swaps the main block to the other face.
   * Adventure / split (no dual art) keep stacked other-face sections.
   */
  faceSide?: 'front' | 'back'
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

function FaceMain({
  name,
  enName,
  typeLine,
  manaCost,
  pt,
  oracle,
  flavor,
  scryfallUri,
  zhUi,
  openOnScryfall,
  englishName,
  detailsHeading,
}: {
  name: string
  enName?: string
  typeLine: string
  manaCost: string
  pt: string | null
  oracle: string
  flavor: string
  scryfallUri?: string
  zhUi: boolean
  openOnScryfall: string
  englishName: string
  detailsHeading: string
}) {
  return (
    <>
      {scryfallUri ? (
        <a
          className="pack-card-name-link"
          href={scryfallUri}
          target="_blank"
          rel="noreferrer"
          title={openOnScryfall}
        >
          <h3>{name}</h3>
        </a>
      ) : (
        <h3>{name}</h3>
      )}
      {zhUi && enName && enName !== name ? (
        scryfallUri ? (
          <a
            className="pack-card-name-link pack-en-name-link"
            href={scryfallUri}
            target="_blank"
            rel="noreferrer"
            title={openOnScryfall}
          >
            <p className="pack-en-name" title={englishName}>
              {enName}
            </p>
          </a>
        ) : (
          <p className="pack-en-name" title={englishName}>
            {enName}
          </p>
        )
      ) : null}
      <p className="type-line">{typeLine}</p>
      {manaCost ? <ManaCost cost={manaCost} /> : null}
      {pt ? <p className="pt-line">{pt}</p> : null}
      <h4>{detailsHeading}</h4>
      <div className="pack-details-block">
        <ManaRichText text={oracle || '—'} className="oracle-text" />
        {flavor ? <p className="pack-flavor-text">{flavor}</p> : null}
      </div>
    </>
  )
}

/** Shared card details copy used by pack open, collection, and deck modal. */
export function CardDetailsBody({
  card,
  showOfflineHint = card.source === 'local',
  collectionPeers,
  faceSide = 'front',
}: CardDetailsBodyProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const zhUi = wantsZh(lang)
  const keywords = localizeKeywords(card.keywords ?? [], lang)
  const otherFaces = card.otherFaces ?? []
  const dualArt = hasDualFaceArt(card)
  const showBackFace =
    faceSide === 'back' && dualArt && otherFaces.length > 0
  const backFace = showBackFace ? otherFaces[0] : null

  const name = backFace
    ? displayFaceName(backFace, lang)
    : displayName(card, lang)
  const enName = backFace ? backFace.name : card.name
  const typeLine = backFace
    ? displayFaceTypeLine(backFace, lang)
    : displayTypeLine(card, lang)
  const oracle = backFace
    ? displayFaceOracle(backFace, lang)
    : displayOracle(card, lang)
  const flavor = backFace
    ? displayFaceFlavor(backFace, lang)
    : displayFlavor(card, lang)
  const manaCost = backFace ? backFace.manaCost : card.manaCost
  const pt = backFace
    ? backFace.power != null && backFace.toughness != null
      ? `${backFace.power}/${backFace.toughness}`
      : null
    : card.power != null && card.toughness != null
      ? `${card.power}/${card.toughness}`
      : null

  const setLine = card.setName
    ? `${card.setName} · ${card.setCode}${card.collectorNumber ? ` #${card.collectorNumber}` : ''}`
    : t('deck.collector', {
        set: card.setCode,
        number: card.collectorNumber,
      })

  /** Adventure / split: keep stacked sections. Dual-art DFC: switch on flip. */
  const stackedOthers = dualArt ? [] : otherFaces

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
      {showBackFace ? (
        <p className="pack-face-side-label">{t('packDraw.otherFace')}</p>
      ) : null}
      <FaceMain
        name={name}
        enName={zhUi ? enName : undefined}
        typeLine={typeLine}
        manaCost={manaCost}
        pt={pt}
        oracle={oracle}
        flavor={flavor}
        scryfallUri={card.scryfallUri}
        zhUi={zhUi}
        openOnScryfall={t('packDraw.openOnScryfall')}
        englishName={t('packDraw.englishName')}
        detailsHeading={t('packDraw.details')}
      />
      {stackedOthers.map((face, i) => (
        <FaceBlock
          key={`${face.name}-${i}`}
          face={face}
          lang={lang}
          heading={
            stackedOthers.length > 1
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
