import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getDeckCardCount,
  getDeckHint,
  getFeaturedCards,
  getManaCurve,
  getPlayerDeck,
  groupDeckList,
  type ConstructedCardDef,
  type DeckListGroupId,
  type PlayerDeckId,
} from '../../game/playerDecks'
import type { ChallengeCode } from '../../game/types'
import {
  defaultCardBackUrl,
  type DrawnCard,
} from '../../data/randomCard'
import { preferredAssetUrl } from '../../utils/remoteAsset'
import { DrawnCardModal } from '../DrawnCardModal'
import { ManaCost, ManaSymbol } from '../ManaCost'
import { PackHeadIconButton } from '../PackHeadIconButton'
import { CardImage } from '../../hooks/useCardImageSrc'
import '../../styles/classic.css'

interface DeckRosterModalProps {
  deckId: PlayerDeckId
  code: ChallengeCode
  zh: boolean
  onClose: () => void
  onSelect: (id: PlayerDeckId) => void
}

function constructedToDrawn(card: ConstructedCardDef): DrawnCard {
  return {
    id: card.id,
    name: card.name,
    nameZh: card.nameZh,
    typeLine: card.typeLine,
    typeLineZh: card.typeLineZh,
    oracleText: card.oracleText,
    oracleTextZh: card.oracleTextZh,
    power: card.power != null ? String(card.power) : null,
    toughness: card.toughness != null ? String(card.toughness) : null,
    manaCost: card.manaCost,
    rarity: 'common',
    setCode: '',
    setName: '',
    collectorNumber: '',
    artist: '',
    scryfallUri: `https://scryfall.com/card/${card.id}`,
    frontImageUrl: preferredAssetUrl(card.image, {
      id: card.id,
      kind: 'large',
    }),
    backImageUrl: defaultCardBackUrl(),
    source: 'scryfall',
    oracleId: '',
    keywords: Array.isArray(card.keywords) ? [...card.keywords] : [],
    flavorText: '',
    colors: [],
    otherFaces: [],
  }
}

const GROUP_I18N: Record<DeckListGroupId, string> = {
  creatures: 'challenge.groupCreatures',
  spells: 'challenge.groupSpells',
  lands: 'challenge.groupLands',
}

export function DeckRosterModal({
  deckId,
  code,
  zh,
  onClose,
  onSelect,
}: DeckRosterModalProps) {
  const { t } = useTranslation()
  const deck = getPlayerDeck(deckId)
  const [inspectId, setInspectId] = useState<string | null>(null)

  const browseCards = useMemo(
    () => deck.cards.map(constructedToDrawn),
    [deck],
  )
  const groups = useMemo(() => groupDeckList(deckId), [deckId])
  const curve = useMemo(() => getManaCurve(deckId), [deckId])
  const featured = useMemo(() => getFeaturedCards(deckId, 4), [deckId])
  const curveMax = Math.max(1, ...curve)
  const hint = getDeckHint(deckId, code, zh)
  const count = getDeckCardCount(deckId)

  const inspect =
    inspectId != null
      ? (browseCards.find((c) => c.id === inspectId) ?? null)
      : null

  const qtyFor = (card: DrawnCard | null) => {
    if (!card) return undefined
    return deck.cards.find((c) => c.id === card.id)?.quantity
  }

  useEffect(() => {
    setInspectId(null)
  }, [deckId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspectId) {
          setInspectId(null)
          return
        }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, inspectId])

  return (
    <>
      <div className="prompt-backdrop" role="presentation" onClick={onClose}>
        <div
          className="prompt-shell deck-roster-shell"
          role="dialog"
          aria-modal="true"
          aria-label={zh ? deck.nameZh : deck.name}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="deck-roster-head">
            <div>
              <p className="eyebrow">{t('challenge.previewDeck')}</p>
              <div className="deck-roster-title-row">
                <h2>{zh ? deck.nameZh : deck.name}</h2>
                <span className="setup-deck-pips" aria-hidden>
                  {deck.colors.map((c) => (
                    <ManaSymbol key={c} code={c} className="mana-symbol setup-deck-pip" />
                  ))}
                </span>
              </div>
              <div className="deck-roster-meta">
                <span className="setup-deck-archetype">
                  {t(`challenge.archetype.${deck.archetype}`)}
                </span>
                <span>{t('challenge.deckCards', { count })}</span>
              </div>
              <p className="deck-roster-blurb">
                {zh ? deck.blurbZh : deck.blurb}
              </p>
              <p className="deck-roster-hint">
                <span className="setup-deck-hint-label">{t('challenge.deckHint')}</span>
                {hint}
              </p>
            </div>
            <div className="deck-roster-head-actions">
              <PackHeadIconButton
                icon="close"
                label={t('deck.close')}
                onClick={onClose}
              />
            </div>
          </header>

          <section className="deck-mana-curve" aria-label={t('challenge.manaCurve')}>
            <p className="deck-mana-curve-label">{t('challenge.manaCurve')}</p>
            <div className="deck-mana-curve-bars">
              {curve.map((n, i) => (
                <div key={i} className="deck-mana-curve-col">
                  <div
                    className="deck-mana-curve-bar"
                    style={{ height: `${(n / curveMax) * 100}%` }}
                    title={String(n)}
                  />
                  <span className="deck-mana-curve-cmc">
                    {i === 7
                      ? t('challenge.curveCmcPlus')
                      : t('challenge.curveCmc', { n: i })}
                  </span>
                  <span className="deck-mana-curve-count">{n}</span>
                </div>
              ))}
            </div>
          </section>

          {featured.length > 0 ? (
            <section className="deck-roster-featured" aria-label={t('challenge.featuredCards')}>
              <p className="deck-roster-section-label">{t('challenge.featuredCards')}</p>
              <ul className="deck-roster-featured-list">
                {featured.map((card) => {
                  const label = zh ? card.nameZh : card.name
                  return (
                    <li key={card.id}>
                      <button
                        type="button"
                        className="deck-roster-featured-thumb"
                        onClick={() => setInspectId(card.id)}
                        aria-label={label}
                      >
                        <CardImage
                          localPath={card.image}
                          cardId={card.id}
                          kind="normal"
                          alt={label}
                          loading="lazy"
                          width={72}
                          height={100}
                          draggable={false}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          <div className="deck-roster-list">
            {groups.map((group) => {
              if (group.cards.length === 0) return null
              const groupCount = group.cards.reduce((s, c) => s + c.quantity, 0)
              return (
                <section key={group.id} className="deck-roster-group">
                  <h3>
                    {t(GROUP_I18N[group.id])}
                    <span>{groupCount}</span>
                  </h3>
                  <ul>
                    {group.cards.map((card) => {
                      const label = zh ? card.nameZh : card.name
                      const simplified =
                        /Challenge Experience|\(Challenge:|挑战体验|（挑战：/i.test(card.oracleText) ||
                        /Challenge Experience|\(Challenge:|挑战体验|（挑战：/i.test(card.oracleTextZh)
                      return (
                        <li key={card.id}>
                          <button
                            type="button"
                            className="deck-roster-row"
                            onClick={() => setInspectId(card.id)}
                          >
                            <span className="deck-roster-qty">{card.quantity}</span>
                            <span className="deck-roster-name">{label}</span>
                            {simplified ? (
                              <span
                                className="deck-roster-simplified"
                                title={t('challenge.simplifiedCardHint')}
                              >
                                {t('challenge.simplifiedCard')}
                              </span>
                            ) : null}
                            {card.kind === 'land' ? (
                              <span className="deck-roster-land-tag">
                                {t('challenge.land')}
                              </span>
                            ) : (
                              <ManaCost
                                cost={card.manaCost}
                                className="pack-mana-cost deck-roster-cost"
                              />
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )
            })}
          </div>

          <footer className="deck-roster-foot">
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                onSelect(deckId)
                onClose()
              }}
            >
              {t('challenge.useDeck')}
            </button>
          </footer>
        </div>
      </div>

      <DrawnCardModal
        card={inspect}
        cards={browseCards}
        quantity={qtyFor(inspect)}
        enableCollect={false}
        onSelect={(c) => setInspectId(c.id)}
        onClose={() => setInspectId(null)}
      />
    </>
  )
}
