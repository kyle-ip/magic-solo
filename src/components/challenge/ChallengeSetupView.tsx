import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ManaSymbol } from '../ManaCost'
import { SetupLlmAdvisor } from '../SetupLlmAdvisor'
import { HERO_DEFS, maxHeroesFor } from '../../game/heroes'
import {
  getDeckCardCount,
  getDeckHint,
  PLAYER_DECKS,
  type PlayerDeckId,
} from '../../game/playerDecks'
import type { ChallengeCode } from '../../game/types'
import { preferredAssetUrl } from '../../utils/remoteAsset'

/** Challenge pre-game setup — original single-column flow (not dual-pane). */
export function ChallengeSetupView({
  code,
  theme,
  title,
  zh,
  assetLoading,
  assetProgress,
  assetsReady = false,
  heads,
  hordeDelay,
  heroIds,
  playerDeckId,
  background,
  onHeads,
  onHordeDelay,
  onToggleHero,
  onPickDeck,
  onViewRoster,
  onBegin,
  rosterModal,
}: {
  code: ChallengeCode
  theme: string
  title: string
  zh: boolean
  assetLoading: boolean
  assetProgress: { done: number; total: number }
  /** Soft-warm finished for current setup config (Begin can enter immediately). */
  assetsReady?: boolean
  heads: number
  hordeDelay: number
  heroIds: string[]
  playerDeckId: PlayerDeckId
  background?: ReactNode
  onHeads: (n: number) => void
  onHordeDelay: (n: number) => void
  onToggleHero: (id: string) => void
  onPickDeck: (id: PlayerDeckId) => void
  onViewRoster: (id: PlayerDeckId) => void
  onBegin: () => void
  rosterModal?: ReactNode
}) {
  const { t } = useTranslation()
  const preloadPct =
    assetProgress.total > 0
      ? Math.round((assetProgress.done / assetProgress.total) * 100)
      : 0
  const maxHeroes = maxHeroesFor(code)
  const warming = !assetsReady && assetProgress.total > 0

  return (
    <main className={`arena-root theme-${theme}`}>
      {background}
      <div className="arena-bg-veil" />
      <section className={`arena-setup${assetLoading ? ' is-preloading' : ''}`}>
        {assetLoading ? (
          <div className="setup-preload" role="status" aria-live="polite">
            <div className="setup-preload-fx" aria-hidden="true">
              <span className="setup-preload-card" />
              <span className="setup-preload-card" />
              <span className="setup-preload-card" />
            </div>
            <p className="setup-preload-title">{t('challenge.loadingTitle')}</p>
            <p>
              {t('challenge.loadingAssets', {
                done: assetProgress.done,
                total: assetProgress.total || '…',
                pct: preloadPct,
              })}
            </p>
            <div className="setup-preload-bar" aria-hidden="true">
              <span style={{ width: `${preloadPct}%` }} />
            </div>
          </div>
        ) : null}

        <h1>{title}</h1>
        <p className="lede">{t('challenge.setupLead')}</p>
        <p className="setup-honesty">{t('challenge.engineHonesty')}</p>

        {code === 'tfth' ? (
          <div className="setup-param">
            <h2 id="setup-heads-title" className="setup-section-title">
              {t('challenge.startingHeads')}
            </h2>
            <label className="setup-field" aria-labelledby="setup-heads-title">
              <input
                type="range"
                min={1}
                max={4}
                value={heads}
                onChange={(e) => onHeads(Number(e.target.value))}
              />
              <strong>{heads}</strong>
            </label>
          </div>
        ) : null}
        {code === 'tbth' ? (
          <div className="setup-param">
            <h2 id="setup-horde-delay-title" className="setup-section-title">
              {t('challenge.hordeDelay')}
            </h2>
            <label className="setup-field" aria-labelledby="setup-horde-delay-title">
              <input
                type="range"
                min={2}
                max={4}
                value={hordeDelay}
                onChange={(e) => onHordeDelay(Number(e.target.value))}
              />
              <strong>{hordeDelay}</strong>
            </label>
          </div>
        ) : null}

        <div className="setup-heroes">
          <div className="setup-section-head">
            <h2 className="setup-section-title">{t('challenge.pickHeroes')}</h2>
            <p className="setup-section-meta" aria-live="polite">
              {t('challenge.heroSelected', {
                n: heroIds.length,
                max: maxHeroes,
              })}
            </p>
          </div>
          <p className="setup-deck-hint">
            {t('challenge.pickHeroesHint', { max: maxHeroes })}
          </p>
          <div className="setup-hero-grid" role="listbox" aria-multiselectable="true">
            {HERO_DEFS.map((hero) => {
              const selected = heroIds.includes(hero.id)
              const atCap = heroIds.length >= maxHeroes && !selected
              const recommended = hero.quests.includes(code)
              return (
                <button
                  key={hero.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={atCap}
                  className={`setup-hero-card ${selected ? 'is-selected' : ''}${recommended ? '' : ' is-off-quest'}`}
                  onClick={() => onToggleHero(hero.id)}
                  title={
                    recommended
                      ? undefined
                      : t('challenge.heroOffQuestHint')
                  }
                >
                  <span
                    className="setup-hero-art"
                    style={{
                      backgroundImage: `url(${preferredAssetUrl(hero.art || hero.image, { kind: 'art_crop' })})`,
                    }}
                  />
                  <strong>
                    {zh ? hero.nameZh : hero.name}
                    {!recommended ? (
                      <span className="setup-hero-quest-tag">
                        {t('challenge.heroOffQuest')}
                      </span>
                    ) : null}
                  </strong>
                  <span>{zh ? hero.oracleTextZh : hero.oracleText}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="setup-decks">
          <h2 className="setup-section-title">{t('challenge.pickDeck')}</h2>
          <p className="setup-deck-hint">{t('challenge.pickDeckHint')}</p>
          <div className="setup-deck-grid" role="listbox" aria-label={t('challenge.pickDeck')}>
            {PLAYER_DECKS.map((d) => {
              const selected = playerDeckId === d.id
              const hint = getDeckHint(d.id, code, zh)
              const count = getDeckCardCount(d.id)
              return (
                <div
                  key={d.id}
                  role="option"
                  tabIndex={0}
                  aria-selected={selected}
                  className={`setup-deck-card ${selected ? 'is-selected' : ''}`}
                  onClick={() => onPickDeck(d.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onPickDeck(d.id)
                    }
                  }}
                >
                  <span
                    className="setup-deck-art"
                    style={{
                      backgroundImage: `url(${preferredAssetUrl(d.art, { kind: 'art_crop' })})`,
                    }}
                  />
                  <span className="setup-deck-body">
                    <span className="setup-deck-title-row">
                      <strong>{zh ? d.nameZh : d.name}</strong>
                      <span className="setup-deck-pips" aria-label={d.colors.join('')}>
                        {d.colors.map((c) => (
                          <ManaSymbol key={c} code={c} className="mana-symbol setup-deck-pip" />
                        ))}
                      </span>
                    </span>
                    <span className="setup-deck-meta">
                      <span className="setup-deck-archetype">
                        {t(`challenge.archetype.${d.archetype}`)}
                      </span>
                      <span className="setup-deck-count">
                        {t('challenge.deckCards', { count })}
                      </span>
                    </span>
                    <span className="setup-deck-play-hint">{hint}</span>
                    <button
                      type="button"
                      className="setup-deck-view-roster"
                      onClick={(e) => {
                        e.stopPropagation()
                        onPickDeck(d.id)
                        onViewRoster(d.id)
                      }}
                    >
                      {t('challenge.viewRoster')}
                    </button>
                  </span>
                </div>
              )
            })}
          </div>
          <p className="setup-selection-summary">
            <span className="section-meta-label">{t('challenge.deckHint')}:</span>
            {getDeckHint(playerDeckId, code, zh)}
          </p>
        </div>

        <div className="setup-notes-block">
          <h2 className="setup-section-title">{t('challenge.notesTitle')}</h2>
          <ul className="setup-notes">
            <li>{t('challenge.noteConstructed')}</li>
            <li>{t('challenge.noteCombat')}</li>
            <li>{t('challenge.noteMana')}</li>
            <li>{t('challenge.noteHeroes')}</li>
            <li>{t('challenge.noteOfficial')}</li>
          </ul>
        </div>

        <div className="setup-cta-row">
          <SetupLlmAdvisor
            code={code}
            heads={heads}
            hordeDelay={hordeDelay}
            heroIds={heroIds}
            playerDeckId={playerDeckId}
          />
          <div className="setup-cta-begin">
            {warming && !assetLoading ? (
              <p className="setup-warm-hint" role="status">
                {t('challenge.warmingAssets', { pct: preloadPct })}
              </p>
            ) : null}
            <button
              type="button"
              className={`btn primary${assetLoading ? ' is-busy' : ''}`}
              disabled={assetLoading}
              onClick={onBegin}
            >
              {assetLoading ? t('challenge.beginLoading') : t('challenge.begin')}
            </button>
          </div>
        </div>
      </section>
      {rosterModal}
    </main>
  )
}
