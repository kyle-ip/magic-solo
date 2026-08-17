import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BattleHistoryModal } from '../components/BattleHistoryModal'
import { CardModal } from '../components/CardModal'
import { CardTile } from '../components/CardTile'
import { PrintAssistantModal } from '../components/PrintAssistantModal'
import { RulesPanel } from '../components/RulesPanel'
import { UiButton, UiButtonLink, AppOverlay } from '../components/ui'
import {
  clearBattleHistory,
  deleteBattleHistory,
  listBattleHistory,
  type BattleHistoryRecord,
} from '../data/battleHistory'
import { getDeckRules } from '../data/deckRegistry'
import { getDeck } from '../data/deckStore'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import { CardImage, useResolvedCardImageUrl } from '../hooks/useCardImageSrc'
import { printItemsFromDeckCards } from '../print/printCards'
import type { ChallengeCode } from '../game/types'
import type { DeckCard } from '../types'
import { warmDeckPageImages } from '../utils/preloadChallengeImages'
import '../styles/deck.css'
import '../styles/rarityFrame.css'
import '../styles/llm.css'
import '../styles/cursors.css'

export function DeckPage() {
  const { setCode = '' } = useParams()
  const { t, i18n } = useTranslation()
  const deck = getDeck(setCode)
  const rules = getDeckRules(setCode, i18n.language)
  const [selected, setSelected] = useState<DeckCard | null>(null)
  const [printOpen, setPrintOpen] = useState(false)
  const [historyTick, setHistoryTick] = useState(0)
  const [viewing, setViewing] = useState<BattleHistoryRecord | null>(null)
  const [historyClearOpen, setHistoryClearOpen] = useState(false)
  const metaTable = i18n.language.startsWith('zh') ? deckMetaZh : deckMetaEn
  const meta = metaTable[setCode]
  const zh = i18n.language.startsWith('zh')

  const hero = useMemo(
    () => deck?.cards.find((c) => c.images.artCrop === deck.heroArt) ?? deck?.cards[0],
    [deck],
  )

  const heroArtUrl = useResolvedCardImageUrl(hero?.images.artCrop, {
    id: hero?.id,
    kind: 'art_crop',
  })
  const heroFront = hero?.images.display || hero?.images.front

  const history = useMemo(() => {
    void historyTick
    if (!deck) return []
    return listBattleHistory(deck.code as ChallengeCode)
  }, [deck, historyTick])

  const refreshHistory = useCallback(() => {
    setHistoryTick((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!deck) return
    void warmDeckPageImages(deck.code as ChallengeCode)
  }, [deck])

  if (!deck || !rules) {
    return <Navigate to="/" replace />
  }

  const challengeName = meta?.name ?? deck.name
  const warmPlayAssets = () => {
    void warmDeckPageImages(deck.code as ChallengeCode)
  }

  return (
    <main className={`page deck-page theme-${deck.theme}`}>
      <div className="deck-atmosphere" aria-hidden="true">
        <div
          className="deck-atmosphere-bg"
          style={
            hero?.images.artCrop
              ? { backgroundImage: `url(${heroArtUrl})` }
              : undefined
          }
        />
        <div className="deck-atmosphere-veil" />
      </div>

      <section className="deck-hero">
        <div className="deck-hero-inner">
          <div className="deck-hero-copy">
            <h1>{challengeName}</h1>
            <p className="section-meta">
              {t('deck.challenge', { n: deck.challengeNumber })} ·{' '}
              {t('deck.setLine', {
                expansion: meta?.expansion ?? deck.setCode,
                code: deck.setCode,
              })}
            </p>
            <p className="lede">{meta?.overview}</p>
            <div className="cta-row">
              <UiButtonLink
                variant="primary"
                to={`/challenge/${deck.code}`}
                title={t('deck.startChallengeHint')}
                onPointerEnter={warmPlayAssets}
                onFocus={warmPlayAssets}
              >
                {t('deck.startChallenge')}
              </UiButtonLink>
              <UiButtonLink
                variant="ghost"
                to={`/assistant/${deck.code}`}
                title={t('deck.startAssistantHint')}
                onPointerEnter={warmPlayAssets}
                onFocus={warmPlayAssets}
              >
                {t('deck.startAssistant')}
              </UiButtonLink>
              <UiButton variant="ghost" onClick={() => setPrintOpen(true)}>
                {t('printAssistant.open')}
              </UiButton>
            </div>
            <p className="deck-dual-door-hint">
              {t('deck.startChallengeHint')} · {t('deck.startAssistantHint')}
            </p>
          </div>
          <div className="deck-hero-card">
            <CardImage
              localPath={heroFront}
              cardId={hero?.id}
              kind="png"
              alt={challengeName}
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      <section id="rules" className="deck-section">
        <RulesPanel rules={rules} />
      </section>

      <section id="cards" className="deck-section">
        <header className="section-head">
          <h2>{t('deck.cards')}</h2>
          <p className="section-meta">
            {t('home.cardsLabel', {
              count: deck.totalUniqueCards,
              total: deck.totalDeckSize,
            })}
          </p>
        </header>
        <div className="card-grid">
          {deck.cards.map((card, index) => (
            <CardTile
              key={card.id}
              card={card}
              setCode={deck.code}
              index={index}
              onOpen={setSelected}
            />
          ))}
        </div>
      </section>

      <section id="history" className="deck-section">
        <header className="section-head">
          <h2>{t('deck.history')}</h2>
          <p className="lede">{t('deck.historyLead')}</p>
        </header>
        {history.length > 0 ? (
          <>
            <div className="battle-history-toolbar">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setHistoryClearOpen(true)}
              >
                {t('deck.historyClear')}
              </button>
            </div>
            <ul className="battle-history-list">
              {history.map((rec) => {
                const deckLabel = zh ? rec.playerDeckNameZh : rec.playerDeckName
                const when = new Date(rec.updatedAt).toLocaleString(
                  zh ? 'zh-CN' : 'en-US',
                  { dateStyle: 'medium', timeStyle: 'short' },
                )
                return (
                  <li key={rec.id}>
                    <button
                      type="button"
                      className={`battle-history-row is-${rec.status}`}
                      onClick={() => setViewing(rec)}
                    >
                      <span className="battle-history-badge">
                        {rec.status === 'won'
                          ? t('challenge.victory')
                          : t('challenge.defeat')}
                      </span>
                      <span className="battle-history-main">
                        <p className="battle-history-title">
                          {deckLabel} vs {challengeName}
                        </p>
                        <p className="battle-history-meta">
                          {when}
                          {' · '}
                          {t('deck.historyTurns', { n: rec.turnNumber })}
                          {' · '}
                          {t('deck.historyLife', { n: rec.life })}
                          {rec.battleReport
                            ? ` · ${t('llm.battleReport')}`
                            : ''}
                        </p>
                      </span>
                      <span className="battle-history-chevron" aria-hidden>
                        ›
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <p className="battle-history-empty">{t('deck.historyEmpty')}</p>
        )}
      </section>

      <CardModal
        card={selected}
        cards={deck.cards}
        onSelect={setSelected}
        deckCode={deck.code}
        setCode={deck.setCode}
        onClose={() => setSelected(null)}
      />

      <PrintAssistantModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        sourceSlug={deck.code}
        cards={printItemsFromDeckCards(deck.cards)}
      />

      {viewing ? (
        <BattleHistoryModal
          record={viewing}
          challengeName={challengeName}
          onClose={() => setViewing(null)}
          onDelete={(id) => {
            deleteBattleHistory(id)
            refreshHistory()
          }}
        />
      ) : null}

      <AppOverlay
        open={historyClearOpen}
        mode="modal"
        onClose={() => setHistoryClearOpen(false)}
        title={t('deck.historyClearTitle')}
        titleId="deck-history-clear-title"
        shellClassName="pack-confirm-dialog"
        size="narrow"
      >
        <p id="deck-history-clear-desc">{t('deck.historyClearConfirm')}</p>
        <div className="pack-confirm-actions">
          <UiButton variant="ghost" onClick={() => setHistoryClearOpen(false)}>
            {t('deck.cancel')}
          </UiButton>
          <UiButton
            variant="primary"
            onClick={() => {
              clearBattleHistory(deck.code as ChallengeCode)
              setViewing(null)
              setHistoryClearOpen(false)
              refreshHistory()
            }}
          >
            {t('deck.historyClear')}
          </UiButton>
        </div>
      </AppOverlay>
    </main>
  )
}
