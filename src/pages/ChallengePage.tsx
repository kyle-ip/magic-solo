import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import '../styles/arena.css'
import { ArenaCard } from '../components/challenge/ArenaCard'
import { AttackArrows } from '../components/challenge/AttackArrows'
import { CastStage } from '../components/challenge/CastStage'
import { DeckRosterModal } from '../components/challenge/DeckRosterModal'
import { ZonePile } from '../components/challenge/ZonePile'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { getDeck } from '../data/deckStore'
import { getCardZh } from '../data/locale/cardsZh'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import { coachTipKey } from '../game/coachTip'
import { challengeAttackLinks, FX_HORDE, FX_PLAYER_LIFE } from '../game/fx'
import {
  DEFAULT_PLAYER_DECK,
  findCardDef,
  findCardDefByName,
  getDeckCards,
  getPlayerDeck,
  PLAYER_DECKS,
  type PlayerDeckId,
} from '../game/playerDecks'
import { canAffordCard } from '../game/playerCast'
import { HERO_DEFS, maxHeroesFor } from '../game/heroes'
import {
  createInitialSetup,
  gameReducer,
  type GameAction,
} from '../game/reducer'
import type {
  AttackLink,
  CardInstance,
  ChallengeCode,
  FxPop,
  LogEntry,
} from '../game/types'
import { CardImage, RemoteArtBackground } from '../hooks/useCardImageSrc'
import { preferredAssetUrl } from '../utils/remoteAsset'
import { setHideSiteChrome } from '../utils/siteChrome'

const CODES: ChallengeCode[] = ['tfth', 'tbth', 'tdag']
const COACH_KEY = 'magic-solo-coach'
const LOG_KEY = 'magic-solo-log-open'
const LOG_VISIBLE_KEY = 'magic-solo-log-visible'

function readCoachEnabled(): boolean {
  try {
    const v = localStorage.getItem(COACH_KEY)
    return v !== '0'
  } catch {
    return true
  }
}

function readLogOpen(): boolean {
  try {
    return localStorage.getItem(LOG_KEY) !== '0'
  } catch {
    return true
  }
}

function readLogVisible(): boolean {
  try {
    return localStorage.getItem(LOG_VISIBLE_KEY) !== '0'
  } catch {
    return true
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function ChallengePage() {
  const { setCode = '' } = useParams()
  const code = setCode.toLowerCase() as ChallengeCode
  if (!CODES.includes(code)) return <Navigate to="/" replace />
  return <ChallengeGame key={code} code={code} />
}

function ChallengeGame({ code }: { code: ChallengeCode }) {
  const { t, i18n } = useTranslation()
  const deck = getDeck(code)
  const metaTable = i18n.language.startsWith('zh') ? deckMetaZh : deckMetaEn
  const meta = metaTable[code]
  const zh = i18n.language.startsWith('zh')

  const [state, dispatch] = useReducer(gameReducer, code, createInitialSetup)
  const [heads, setHeads] = useState(2)
  const [hordeDelay, setHordeDelay] = useState(3)
  const [playerDeckId, setPlayerDeckId] = useState<PlayerDeckId>(DEFAULT_PLAYER_DECK)
  const [heroIds, setHeroIds] = useState<string[]>([])
  const [rosterModalId, setRosterModalId] = useState<PlayerDeckId | null>(null)
  const [focusAttacker, setFocusAttacker] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    image: string
    name: string
    text?: string
  } | null>(null)
  const [inspect, setInspect] = useState<'graveyard' | null>(null)
  const [coachOn, setCoachOn] = useState(readCoachEnabled)
  const [logOpen, setLogOpen] = useState(readLogOpen)
  const [logVisible, setLogVisible] = useState(readLogVisible)
  const [logPos, setLogPos] = useState<{ left: number; top: number } | null>(null)
  const [logDragging, setLogDragging] = useState(false)
  const arenaRef = useRef<HTMLElement | null>(null)
  const logPanelRef = useRef<HTMLElement | null>(null)
  const logDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    origLeft: number
    origTop: number
  } | null>(null)

  useEffect(() => {
    // Keep SiteHeader on setup; hide chrome only while the board is active.
    setHideSiteChrome(state.status !== 'setup')
    return () => setHideSiteChrome(false)
  }, [state.status])

  const act = useCallback((action: GameAction) => dispatch(action), [])

  const advance = useCallback(() => act({ type: 'ADVANCE' }), [act])

  const clearPreview = useCallback(() => setPreview(null), [])

  const localizeName = useCallback(
    (name: string) => {
      if (!zh) return name
      return (
        getCardZh(code, name)?.name ??
        findCardDefByName(name)?.nameZh ??
        name
      )
    },
    [zh, code],
  )

  const formatLog = useCallback(
    (entry: LogEntry) => {
      const params = { ...entry.params }
      if (typeof params.name === 'string') params.name = localizeName(params.name)
      return t(`challenge.logMsg.${entry.key}`, params)
    },
    [t, localizeName],
  )

  const tipKey = useMemo(() => coachTipKey(state), [state])

  const attackLinks = useMemo(() => {
    const links: AttackLink[] = []
    const seen = new Set<string>()
    const push = (link: AttackLink) => {
      const key = `${link.from}->${link.to}:${link.tone ?? 'player'}`
      if (seen.has(key)) return
      seen.add(key)
      links.push(link)
    }

    for (const [from, to] of Object.entries(state.attackAssignments)) {
      push({ from, to, tone: 'player' })
    }

    if (
      state.code === 'tbth' &&
      state.activeSide === 'player' &&
      state.playerPhase === 'combat'
    ) {
      for (const id of state.selectedAttackers) {
        push({ from: id, to: FX_HORDE, tone: 'player' })
      }
    }

    if (
      state.prompt?.kind === 'choose_blockers' ||
      (state.activeSide === 'challenge' && state.challengePhase === 'combat')
    ) {
      for (const link of challengeAttackLinks(state.revealed, state.blockAssignments)) {
        push(link)
      }
    }

    // Resolve-time arrows (assignments already cleared)
    if (state.fx?.links?.length && !state.prompt) {
      for (const link of state.fx.links) push(link)
    }

    return links
  }, [
    state.attackAssignments,
    state.selectedAttackers,
    state.blockAssignments,
    state.revealed,
    state.fx?.links,
    state.fx?.id,
    state.code,
    state.activeSide,
    state.playerPhase,
    state.challengePhase,
    state.prompt,
  ])

  const toggleCoach = useCallback(() => {
    setCoachOn((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COACH_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const toggleLog = useCallback(() => {
    setLogOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(LOG_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const setLogVisibility = useCallback((visible: boolean) => {
    setLogVisible(visible)
    try {
      localStorage.setItem(LOG_VISIBLE_KEY, visible ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const logPanelStyle = logPos
    ? { left: logPos.left, top: logPos.top, right: 'auto', bottom: 'auto' }
    : undefined

  const onLogDragStart = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    const el = logPanelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    logDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: rect.left,
      origTop: rect.top,
    }
    setLogDragging(true)
    el.setPointerCapture(e.pointerId)
  }, [])

  const onLogDragMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const drag = logDragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const el = logPanelRef.current
    const w = el?.offsetWidth ?? 280
    const h = el?.offsetHeight ?? 48
    const left = clamp(drag.origLeft + (e.clientX - drag.startX), 8, window.innerWidth - w - 8)
    const top = clamp(drag.origTop + (e.clientY - drag.startY), 8, window.innerHeight - h - 8)
    setLogPos({ left, top })
  }, [])

  const onLogDragEnd = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const drag = logDragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    logDragRef.current = null
    setLogDragging(false)
    try {
      logPanelRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }, [])

  const previewChallengeCard = useCallback(
    (card: CardInstance) => {
      const zhCard = zh ? getCardZh(code, card.name) : null
      setPreview({
        image: card.image,
        name: zhCard?.name ?? card.name,
        text: zhCard
          ? `${zhCard.typeLine}\n${zhCard.oracleText}`
          : `${card.typeLine}\n${card.oracleText}`,
      })
    },
    [zh, code],
  )

  useEffect(() => {
    if (!state.fx) return
    const t = window.setTimeout(() => act({ type: 'CLEAR_FX' }), 1150)
    return () => window.clearTimeout(t)
  }, [state.fx?.id, act])

  useEffect(() => {
    if (state.status === 'setup') return
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (type: string) => Promise<void>
      unlock?: () => void
    }
    void orientation.lock?.('landscape').catch(() => {
      /* Browser may require fullscreen; CSS gate still covers portrait. */
    })
    return () => {
      try {
        orientation.unlock?.()
      } catch {
        /* ignore */
      }
    }
  }, [state.status])

  const fxFor = useCallback(
    (targetId: string): FxPop | undefined =>
      state.fx?.pops?.find((p) => p.targetId === targetId),
    [state.fx],
  )

  const enterCombat = useCallback(() => {
    act({ type: 'SET_PHASE', phase: 'combat' })
  }, [act])

  const declareOrToggleAttacker = useCallback(
    (id: string) => {
      setFocusAttacker(id)
      act({ type: 'TOGGLE_ATTACKER', id })
    },
    [act],
  )

  if (!deck) return <Navigate to="/" replace />

  const challengeCreatures = state.challenge.battlefield.filter(
    (c) => c.power != null || c.isHead || c.isGod || c.isReveler || c.isMinotaur,
  )
  const challengeOthers = state.challenge.battlefield.filter(
    (c) => !challengeCreatures.includes(c),
  )

  const canTarget = (card: CardInstance) => {
    if (state.status !== 'playing' || state.activeSide !== 'player') return false
    if (state.pendingCast) {
      const mode = state.pendingCast.mode
      if (mode === 'damage') return true
      if (mode === 'destroy') return !card.isGod
      if (mode === 'fight_theirs') {
        return card.power != null || card.isHead || card.isGod || card.isReveler
      }
      return false
    }
    if (state.playerPhase !== 'combat') return false
    if (state.selectedAttackers.length === 0) return false
    if (state.code === 'tfth') return card.isHead
    if (state.code === 'tdag') return card.isReveler || card.isGod
    return false
  }

  const over = state.status === 'won' || state.status === 'lost'
  const heroArt = deck.heroArt
  const inCombat =
    state.activeSide === 'player' && state.playerPhase === 'combat' && !over
  const attackables = state.player.creatures.filter(
    (c) => !c.tapped && !c.summoningSickness,
  )
  const combatStep: 'pick' | 'aim' | 'resolve' =
    state.selectedAttackers.length === 0
      ? 'pick'
      : state.code !== 'tbth' &&
          state.selectedAttackers.some((id) => !state.attackAssignments[id])
        ? 'aim'
        : 'resolve'

  if (state.status === 'setup') {
    return (
      <main className={`arena-root theme-${deck.theme}`}>
        <RemoteArtBackground className="arena-bg" localPath={heroArt} kind="art_crop" />
        <div className="arena-bg-veil" />
        <section className="arena-setup">
          <Link to={`/decks/${code}`} className="back-link">
            ← {t('challenge.backDeck')}
          </Link>
          <p className="eyebrow">{t('challenge.eyebrow')}</p>
          <h1>{meta?.name ?? deck.name}</h1>
          <p className="lede">{t('challenge.setupLead')}</p>
          {code === 'tfth' ? (
            <label className="setup-field">
              <span>{t('challenge.startingHeads')}</span>
              <input
                type="range"
                min={1}
                max={4}
                value={heads}
                onChange={(e) => setHeads(Number(e.target.value))}
              />
              <strong>{heads}</strong>
            </label>
          ) : null}
          {code === 'tbth' ? (
            <label className="setup-field">
              <span>{t('challenge.hordeDelay')}</span>
              <input
                type="range"
                min={2}
                max={4}
                value={hordeDelay}
                onChange={(e) => setHordeDelay(Number(e.target.value))}
              />
              <strong>{hordeDelay}</strong>
            </label>
          ) : null}
          <div className="setup-heroes">
            <p className="setup-decks-label">{t('challenge.pickHeroes')}</p>
            <p className="setup-deck-hint">
              {t('challenge.pickHeroesHint', { max: maxHeroesFor(code) })}
            </p>
            <p className="setup-deck-preview">
              {t('challenge.heroSelected', {
                n: heroIds.length,
                max: maxHeroesFor(code),
              })}
            </p>
            <div className="setup-hero-grid" role="listbox" aria-multiselectable="true">
              {HERO_DEFS.map((hero) => {
                const selected = heroIds.includes(hero.id)
                const atCap = heroIds.length >= maxHeroesFor(code) && !selected
                return (
                  <button
                    key={hero.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={atCap}
                    className={`setup-hero-card ${selected ? 'is-selected' : ''}`}
                    onClick={() => {
                      setHeroIds((prev) => {
                        if (prev.includes(hero.id)) return prev.filter((id) => id !== hero.id)
                        if (prev.length >= maxHeroesFor(code)) return prev
                        return [...prev, hero.id]
                      })
                    }}
                  >
                    <span
                      className="setup-hero-art"
                      style={{
                        backgroundImage: `url(${preferredAssetUrl(hero.art || hero.image, { kind: 'art_crop' })})`,
                      }}
                    />
                    <strong>{zh ? hero.nameZh : hero.name}</strong>
                    <span>{zh ? hero.oracleTextZh : hero.oracleText}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="setup-decks">
            <p className="setup-decks-label">{t('challenge.pickDeck')}</p>
            <p className="setup-deck-hint">{t('challenge.pickDeckHint')}</p>
            <div className="setup-deck-grid" role="listbox" aria-label={t('challenge.pickDeck')}>
              {PLAYER_DECKS.map((d) => {
                const selected = playerDeckId === d.id
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`setup-deck-card ${selected ? 'is-selected' : ''}`}
                    onClick={() => {
                      setPlayerDeckId(d.id)
                      setRosterModalId(d.id)
                    }}
                  >
                    <span
                      className="setup-deck-art"
                      style={{ backgroundImage: `url(${preferredAssetUrl(d.art, { kind: 'art_crop' })})` }}
                    />
                    <span className="setup-deck-body">
                      <strong>{zh ? d.nameZh : d.name}</strong>
                      <span>{zh ? d.blurbZh : d.blurb}</span>
                      <em>{t('challenge.viewRoster')}</em>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="setup-deck-preview">
              {t('challenge.deckRoster', {
                name: zh
                  ? getPlayerDeck(playerDeckId).nameZh
                  : getPlayerDeck(playerDeckId).name,
                count: getDeckCards(playerDeckId).reduce((s, c) => s + c.quantity, 0 as number),
              })}
            </p>
          </div>
          <ul className="setup-notes">
            <li>{t('challenge.noteConstructed')}</li>
            <li>{t('challenge.noteCombat')}</li>
            <li>{t('challenge.noteMana')}</li>
            <li>{t('challenge.noteHeroes')}</li>
            <li>{t('challenge.noteOfficial')}</li>
          </ul>
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              act({
                type: 'START',
                config: {
                  code,
                  startingHeads: heads,
                  playerTurnsBeforeHorde: hordeDelay,
                  playerDeckId,
                  heroIds,
                },
              })
            }
          >
            {t('challenge.begin')}
          </button>
        </section>
        {rosterModalId ? (
          <DeckRosterModal
            deckId={rosterModalId}
            zh={zh}
            onClose={() => setRosterModalId(null)}
            onSelect={setPlayerDeckId}
          />
        ) : null}
      </main>
    )
  }

  const forceName = zh
    ? getPlayerDeck(state.playerDeckId).nameZh
    : getPlayerDeck(state.playerDeckId).name
  const challengeName = meta?.name ?? deck.name

  return (
    <main ref={arenaRef} className={`arena-root is-playing theme-${deck.theme}`}>
      <div
        className="arena-rotate-gate"
        role="dialog"
        aria-modal="true"
        aria-label={t('challenge.rotateLandscape')}
      >
        <p>{t('challenge.rotateLandscape')}</p>
      </div>
      <RemoteArtBackground className="arena-bg" localPath={heroArt} kind="art_crop" />
      <div className="arena-bg-veil" />
      <AttackArrows rootRef={arenaRef} links={attackLinks} />

      <header className="arena-topbar">
        <Link to={`/decks/${code}`} className="arena-link">
          ← {t('challenge.backDeck')}
        </Link>
        <div className="arena-title">
          <strong>{meta?.name ?? deck.name}</strong>
          <span>
            {t('challenge.turn')} {state.turnNumber}
          </span>
        </div>
        <div className="arena-topbar-actions">
          <button
            type="button"
            className={`btn ghost coach-toggle ${coachOn ? 'is-on' : ''}`}
            onClick={toggleCoach}
            aria-pressed={coachOn}
          >
            {coachOn ? t('challenge.coachOn') : t('challenge.coachOff')}
          </button>
          <button type="button" className="btn ghost" onClick={() => act({ type: 'RESET' })}>
            {t('challenge.resign')}
          </button>
          <LanguageSwitch />
        </div>
      </header>

      {/* Opponent chrome (log is fixed overlay — does not affect board size) */}
      <div className="arena-opponent-rail">
        <div className="arena-player-chrome is-opponent challenge-zone-piles">
          <ZonePile
            label={t('challenge.graveyard')}
            count={state.challenge.graveyard.length}
            kind="graveyard"
            onClick={() => setInspect('graveyard')}
          />
          <div className="zone-pile-wrap" data-instance-id={FX_HORDE}>
            <ZonePile
              label={t('challenge.library')}
              count={state.challenge.library.length}
              kind="library"
              stackImage={
                deck?.cards[0]?.images.back
                  ? preferredAssetUrl(deck.cards[0].images.back, { kind: 'card_back' })
                  : undefined
              }
              onClick={
                state.code === 'tbth' && state.pendingCast?.mode === 'damage'
                  ? () =>
                      act({
                        type: 'ASSIGN_TARGET',
                        attackerId: '',
                        targetId: FX_HORDE,
                      })
                  : undefined
              }
            />
            {fxFor(FX_HORDE) ? (
              <span className="combat-floater kind-mill chrome-floater">
                −{fxFor(FX_HORDE)!.amount ?? 0}
              </span>
            ) : null}
          </div>
          <div className="life-orb is-opponent">
            <span className="life-orb-label">
              {state.code === 'tbth'
                ? t('challenge.library')
                : state.code === 'tfth'
                  ? t('challenge.heads')
                  : 'XP'}
            </span>
            <strong>
              {state.code === 'tbth'
                ? state.challenge.library.length
                : state.code === 'tfth'
                  ? challengeCreatures.filter((c) => c.isHead).length
                  : state.challenge.battlefield.find((c) => c.isGod)
                    ? `${state.challenge.battlefield.find((c) => c.isGod)!.power}/${Math.max(
                        0,
                        (state.challenge.battlefield.find((c) => c.isGod)!.toughness ?? 0) -
                          (state.challenge.battlefield.find((c) => c.isGod)!.markedDamage ?? 0),
                      )}`
                    : '—'}
            </strong>
          </div>
        </div>
      </div>

      {logVisible ? (
        <aside
          ref={logPanelRef}
          className={[
            'arena-log',
            logOpen ? '' : 'is-collapsed',
            logDragging ? 'is-dragging' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={logPanelStyle}
          onPointerMove={onLogDragMove}
          onPointerUp={onLogDragEnd}
          onPointerCancel={onLogDragEnd}
        >
          <div
            className="arena-log-head"
            onPointerDown={onLogDragStart}
            title={t('challenge.log')}
          >
            <span className="arena-log-title">{t('challenge.log')}</span>
            <div className="arena-log-tools">
              <button
                type="button"
                className="arena-log-tool"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={toggleLog}
                aria-expanded={logOpen}
                aria-controls="arena-log-list"
                title={logOpen ? t('challenge.logCollapse') : t('challenge.logExpand')}
                aria-label={logOpen ? t('challenge.logCollapse') : t('challenge.logExpand')}
              >
                <span className="arena-log-chevron" aria-hidden>
                  ▾
                </span>
              </button>
              <button
                type="button"
                className="arena-log-tool"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setLogVisibility(false)}
                title={t('challenge.logClose')}
                aria-label={t('challenge.logClose')}
              >
                ×
              </button>
            </div>
          </div>
          {logOpen ? (
            <ul id="arena-log-list" className="arena-log-list">
              {state.log.slice(0, 12).map((e) => (
                <li key={e.id} className={`tone-${e.tone ?? 'info'}`}>
                  {formatLog(e)}
                </li>
              ))}
            </ul>
          ) : null}
        </aside>
      ) : (
        <button
          type="button"
          className="arena-log-reopen"
          style={logPanelStyle}
          onClick={() => setLogVisibility(true)}
          title={t('challenge.logShow')}
        >
          {t('challenge.log')}
        </button>
      )}

      <div className={`arena-battlefield ${inCombat ? 'is-combat' : ''}`}>
        <section className="bf-row opponent-row">
          <div className="bf-creatures">
            {challengeCreatures.map((card) => {
              const targeted = Object.values(state.attackAssignments).includes(
                card.instanceId,
              )
              const targetable = canTarget(card)
              const pop = fxFor(card.instanceId)
              return (
                <ArenaCard
                  key={card.instanceId}
                  instanceId={card.instanceId}
                  image={card.image}
                  name={localizeName(card.name)}
                  power={card.power}
                  toughness={card.toughness}
                  markedDamage={card.markedDamage}
                  tapped={card.tapped}
                  attacking={
                    targeted ||
                    state.revealed.some((r) => r.instanceId === card.instanceId) ||
                    pop?.kind === 'attack'
                  }
                  targetable={targetable}
                  hitFx={pop?.kind === 'damage'}
                  strikeFx={pop?.kind === 'attack'}
                  floater={
                    pop
                      ? { kind: pop.kind, amount: pop.amount }
                      : null
                  }
                  badge={
                    targetable
                      ? t('challenge.badge.target')
                      : targeted
                        ? t('challenge.badge.aimed')
                        : null
                  }
                  onClick={() => {
                    if (!targetable) {
                      previewChallengeCard(card)
                      return
                    }
                    if (state.pendingCast) {
                      act({
                        type: 'ASSIGN_TARGET',
                        attackerId: '',
                        targetId: card.instanceId,
                      })
                      return
                    }
                    const ids =
                      focusAttacker && state.selectedAttackers.includes(focusAttacker)
                        ? [focusAttacker]
                        : state.selectedAttackers
                    for (const id of ids) {
                      act({
                        type: 'ASSIGN_TARGET',
                        attackerId: id,
                        targetId: card.instanceId,
                      })
                    }
                  }}
                  onMouseEnter={() => previewChallengeCard(card)}
                  onMouseLeave={clearPreview}
                />
              )
            })}
          </div>
          <div className="bf-others">
            {challengeOthers.map((card) => (
              <ArenaCard
                key={card.instanceId}
                image={card.image}
                name={card.name}
                compact
                onMouseEnter={() => previewChallengeCard(card)}
                onMouseLeave={clearPreview}
              />
            ))}
          </div>
        </section>

        <div className="arena-midline">
          <div className="phase-strip">
            {(['main', 'combat', 'end'] as const).map((ph) => (
              <button
                key={ph}
                type="button"
                className={`phase-chip ${state.playerPhase === ph ? 'is-active' : ''} ${
                  state.activeSide === 'player' ? '' : 'is-locked'
                }`}
                disabled={state.activeSide !== 'player' || over}
                onClick={() => act({ type: 'SET_PHASE', phase: ph })}
              >
                {t(`challenge.phase.${ph}`)}
              </button>
            ))}
          </div>
          {inCombat ? (
            <ol className="combat-steps" aria-label={t('challenge.phase.combat')}>
              <li className={combatStep === 'pick' ? 'is-current' : 'is-done'}>
                <em>1</em>
                {t('challenge.combatStep.pick')}
              </li>
              <li
                className={
                  combatStep === 'aim'
                    ? 'is-current'
                    : combatStep === 'resolve'
                      ? 'is-done'
                      : ''
                }
              >
                <em>2</em>
                {state.code === 'tbth'
                  ? t('challenge.combatStep.aimHorde')
                  : t('challenge.combatStep.aim')}
              </li>
              <li className={combatStep === 'resolve' ? 'is-current' : ''}>
                <em>3</em>
                {t('challenge.combatStep.resolve')}
              </li>
            </ol>
          ) : state.fx ? (
            <div className={`fx-toast kind-${state.fx.kind}`} key={state.fx.id}>
              {state.fx.label ?? state.fx.kind}
              {state.fx.amount != null ? ` ${state.fx.amount}` : ''}
            </div>
          ) : coachOn ? (
            <div className="coach-tip" role="status">
              <span className="coach-tip-label">{t('challenge.tipLabel')}</span>
              <p>{t(`challenge.tip.${tipKey}`)}</p>
            </div>
          ) : (
            <span className="mid-hint">
              {state.activeSide === 'player'
                ? t('challenge.yourTurn')
                : t('challenge.theirTurn')}
            </span>
          )}
          {inCombat && state.fx ? (
            <div className={`fx-toast kind-${state.fx.kind}`} key={state.fx.id}>
              {state.fx.label ?? state.fx.kind}
              {state.fx.amount != null ? ` ${state.fx.amount}` : ''}
            </div>
          ) : null}
        </div>

        <section className="bf-row player-row">
          {state.player.heroes.length > 0 ? (
            <div className="hero-strip" aria-label={t('challenge.heroesOnBoard')}>
              <span className="hero-strip-label">{t('challenge.heroesOnBoard')}</span>
              {state.player.heroes.map((h) => {
                const def = HERO_DEFS.find((d) => d.id === h.defId)
                return (
                  <button
                    key={h.instanceId}
                    type="button"
                    className="hero-chip"
                    onMouseEnter={() =>
                      setPreview({
                        image: def?.image || h.image || '',
                        name: zh ? (def?.nameZh ?? h.name) : h.name,
                        text: zh
                          ? `${def?.typeLineZh ?? ''}\n${def?.oracleTextZh ?? h.oracleText}`
                          : `${def?.typeLine ?? 'Hero'}\n${h.oracleText}`,
                      })
                    }
                    onMouseLeave={clearPreview}
                  >
                    {def?.art || def?.image || h.image ? (
                      <CardImage
                        className="hero-chip-art"
                        localPath={def?.art || def?.image || h.image}
                        kind="art_crop"
                        alt=""
                        draggable={false}
                      />
                    ) : null}
                    <span>{zh ? (def?.nameZh ?? h.name) : h.name}</span>
                  </button>
                )
              })}
            </div>
          ) : null}
          <div className="bf-creatures">
            {state.player.creatures.map((c) => {
              const selected = state.selectedAttackers.includes(c.instanceId)
              const aimed = Boolean(state.attackAssignments[c.instanceId])
              const blocking = state.prompt?.kind === 'choose_blockers'
              const canDeclare =
                state.activeSide === 'player' &&
                !over &&
                !blocking &&
                !c.tapped &&
                !c.summoningSickness
              const label = zh
                ? (findCardDef(c.defId, state.playerDeckId)?.nameZh ?? c.name)
                : c.name
              const pendingMine =
                state.pendingCast?.mode === 'fight_mine' ||
                state.pendingCast?.mode === 'pump' ||
                state.pendingCast?.mode === 'fangs'
              const showReady =
                canDeclare &&
                !selected &&
                (inCombat || state.playerPhase === 'main')
              const badge = blocking
                ? null
                : pendingMine
                  ? t('challenge.badge.target')
                  : selected
                    ? aimed
                      ? t('challenge.badge.aimed')
                      : t('challenge.badge.attacking')
                    : showReady
                      ? t('challenge.badge.ready')
                      : null
              const pop = fxFor(c.instanceId)
              return (
                <ArenaCard
                  key={c.instanceId}
                  instanceId={c.instanceId}
                  image={c.image}
                  name={label}
                  power={c.power}
                  toughness={c.toughness}
                  markedDamage={c.markedDamage}
                  tapped={c.tapped}
                  selected={selected}
                  attacking={selected || pop?.kind === 'attack'}
                  attackReady={showReady}
                  targetable={pendingMine}
                  dimmed={c.summoningSickness || (c.tapped && !selected)}
                  hitFx={pop?.kind === 'damage'}
                  strikeFx={pop?.kind === 'attack'}
                  floater={
                    pop
                      ? { kind: pop.kind, amount: pop.amount }
                      : null
                  }
                  badge={badge}
                  onClick={() => {
                    if (over) return
                    if (state.pendingCast?.mode === 'fight_mine' || state.pendingCast?.mode === 'pump' || state.pendingCast?.mode === 'fangs') {
                      act({
                        type: 'ASSIGN_TARGET',
                        attackerId: '',
                        targetId: c.instanceId,
                      })
                      return
                    }
                    if (blocking) {
                      const attackers = state.revealed
                      if (!attackers.length) return
                      const current = state.blockAssignments[c.instanceId]
                      const idx = current
                        ? attackers.findIndex((a) => a.instanceId === current)
                        : -1
                      const next = attackers[(idx + 1) % attackers.length]
                      act({
                        type: 'ASSIGN_BLOCKER',
                        blockerId: c.instanceId,
                        attackerId: next?.instanceId ?? null,
                      })
                      return
                    }
                    if (!canDeclare && !selected) return
                    declareOrToggleAttacker(c.instanceId)
                  }}
                  onMouseEnter={() => {
                    const tpl = findCardDef(c.defId, state.playerDeckId)
                    setPreview({
                      image: c.image,
                      name: label,
                      text: tpl
                        ? `${zh ? tpl.typeLineZh : tpl.typeLine}\n${c.power}/${c.toughness}\n${zh ? tpl.oracleTextZh : tpl.oracleText}`
                        : `${c.power}/${c.toughness}`,
                    })
                  }}
                  onMouseLeave={clearPreview}
                />
              )
            })}
            {state.player.lands.map((land) => {
              const label = zh
                ? (findCardDef(land.defId, state.playerDeckId)?.nameZh ?? land.name)
                : land.name
              return (
                <ArenaCard
                  key={land.instanceId}
                  instanceId={land.instanceId}
                  image={land.image}
                  name={label}
                  tapped={land.tapped}
                  dimmed={land.tapped}
                  onMouseEnter={() =>
                    setPreview({
                      image: land.image,
                      name: label,
                      text: land.typeLine,
                    })
                  }
                  onMouseLeave={clearPreview}
                />
              )
            })}
          </div>
        </section>
      </div>

      {/* Player chrome + hand */}
      <div className="arena-player-chrome is-you challenge-zone-piles">
        <ZonePile
          label={t('challenge.graveyard')}
          count={state.player.graveyard.length}
          kind="graveyard"
        />
        <ZonePile
          label={t('challenge.library')}
          count={state.player.library.length}
          kind="library"
        />
        <div
          className={`life-orb is-you ${
            fxFor(FX_PLAYER_LIFE)?.kind === 'damage' ? 'is-hit' : ''
          }`}
          data-instance-id={FX_PLAYER_LIFE}
        >
          <span className="life-orb-label">{t('challenge.life')}</span>
          <strong>{state.player.life}</strong>
          <span className="life-orb-sub">
            {t('challenge.handCount', { n: state.player.hand.length })}
            {state.flags.preventCombatDamageThisTurn
              ? ` · ${t('challenge.fogActive')}`
              : ''}
          </span>
          {fxFor(FX_PLAYER_LIFE) ? (
            <span
              className={`combat-floater kind-${fxFor(FX_PLAYER_LIFE)!.kind} chrome-floater`}
            >
              {fxFor(FX_PLAYER_LIFE)!.kind === 'heal' ? '+' : '−'}
              {fxFor(FX_PLAYER_LIFE)!.amount ?? 0}
            </span>
          ) : null}
        </div>
        <div className="arena-actions">
          {state.pendingCast ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => act({ type: 'CANCEL_PENDING' })}
            >
              {t('challenge.cancelTarget')}
            </button>
          ) : null}
          {state.activeSide === 'player' && !over ? (
            <>
              {state.playerPhase === 'main' && attackables.length > 0 ? (
                <button type="button" className="btn primary" onClick={enterCombat}>
                  {t('challenge.enterCombat')}
                </button>
              ) : null}
              {state.playerPhase === 'combat' ? (
                <button
                  type="button"
                  className="btn primary"
                  disabled={
                    state.selectedAttackers.length === 0 ||
                    (state.code !== 'tbth' &&
                      state.selectedAttackers.some((id) => !state.attackAssignments[id]))
                  }
                  onClick={() => act({ type: 'RESOLVE_ATTACKS' })}
                >
                  {state.code === 'tbth'
                    ? t('challenge.attackHorde')
                    : t('challenge.resolveCombat')}
                </button>
              ) : null}
              <button
                type="button"
                className="btn end-turn"
                onClick={() => {
                  setFocusAttacker(null)
                  act({ type: 'END_TURN' })
                }}
              >
                {t('challenge.endTurn')}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="hand-dock">
        <p className="hand-label">
          {zh
            ? getPlayerDeck(state.playerDeckId).nameZh
            : getPlayerDeck(state.playerDeckId).name}{' '}
          · {t('challenge.handCount', { n: state.player.hand.length })}
          {state.pendingCast ? ` · ${t(`challenge.pending.${state.pendingCast.mode}`)}` : ''}
        </p>
        <div className="hand-fan">
          {state.player.hand.map((card, i) => {
            const unaffordable =
              !canAffordCard(state, card) ||
              state.flags.cannotCastSpells ||
              state.activeSide !== 'player' ||
              over ||
              (card.kind === 'sorcery' && state.playerPhase !== 'main') ||
              (card.kind === 'land' &&
                (state.playerPhase !== 'main' || state.player.landsPlayedThisTurn >= 1)) ||
              (card.kind !== 'instant' &&
                card.kind !== 'land' &&
                state.playerPhase !== 'main' &&
                state.playerPhase !== 'combat')
            const pending = state.pendingCast?.handInstanceId === card.instanceId
            return (
              <button
                key={card.instanceId}
                type="button"
                className={`hand-card ${unaffordable ? 'is-disabled' : ''} ${pending ? 'is-pending' : ''}`}
                style={{ '--i': i } as React.CSSProperties}
                disabled={unaffordable && !pending}
                onClick={() => {
                  if (pending) {
                    act({ type: 'CANCEL_PENDING' })
                    return
                  }
                  act({ type: 'CAST', handId: card.instanceId })
                }}
                onMouseEnter={() =>
                  setPreview({
                    image: card.image,
                    name: zh ? card.nameZh : card.name,
                    text: [
                      zh ? card.typeLineZh : card.typeLine,
                      card.kind === 'land'
                        ? t('challenge.land')
                        : card.power != null
                          ? `${card.power}/${card.toughness} · ${card.manaCost}`
                          : card.manaCost,
                      zh ? card.oracleTextZh : card.oracleText,
                    ]
                      .filter(Boolean)
                      .join('\n'),
                  })
                }
                onMouseLeave={clearPreview}
              >
                <CardImage localPath={card.image} kind="normal" alt="" draggable={false} />
                <span className="hand-cost">
                  {card.kind === 'land' ? t('challenge.landShort') : card.manaCost || '0'}
                </span>
                <span className="hand-meta">
                  <strong>{zh ? card.nameZh : card.name}</strong>
                  <em>
                    {card.power != null ? `${card.power}/${card.toughness}` : card.kind}
                  </em>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {preview ? (
        <aside className="card-preview-pane">
          {preview.image ? (
            <CardImage localPath={preview.image} kind="large" alt={preview.name} />
          ) : (
            <div className="preview-token">
              <strong>{preview.name}</strong>
            </div>
          )}
          <div className="card-preview-copy">
            <p className="card-preview-name">{preview.name}</p>
            {preview.text ? (
              <p className="card-preview-text">{preview.text}</p>
            ) : null}
          </div>
        </aside>
      ) : null}

      <CastStage
        card={
          state.awaitingAdvance && state.revealed[0] && state.challengePhase === 'reveal'
            ? state.revealed[0]
            : null
        }
        awaiting={state.awaitingAdvance && state.challengePhase === 'reveal'}
        onAdvance={advance}
        cardLabel={
          state.revealed[0] ? localizeName(state.revealed[0].name) : undefined
        }
        typeLine={
          state.revealed[0]
            ? (zh
                ? getCardZh(code, state.revealed[0].name)?.typeLine
                : undefined) ?? state.revealed[0].typeLine
            : undefined
        }
        oracleText={
          state.revealed[0]
            ? (zh
                ? getCardZh(code, state.revealed[0].name)?.oracleText
                : undefined) ?? state.revealed[0].oracleText
            : undefined
        }
      />

      {state.prompt ? (
        <div className="prompt-backdrop">
          <div className="prompt-shell">
            <h2>{t(`challenge.prompt.${state.prompt.titleKey}`)}</h2>
            <p>
              {t(`challenge.prompt.${state.prompt.messageKey}`, state.prompt.messageParams)}
            </p>
            {state.prompt.kind === 'choose_blockers' && state.revealed.length > 0 ? (
              <div className="block-panel">
                <p className="eyebrow">{t('challenge.attackers')}</p>
                <ul>
                  {state.revealed.map((a) => (
                    <li key={a.instanceId}>
                      {localizeName(a.name)} ({a.power}/{a.toughness})
                    </li>
                  ))}
                </ul>
                <p className="hint">{t('challenge.blockHint')}</p>
              </div>
            ) : null}
            <div className="prompt-actions">
              {(state.prompt.options ?? []).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="btn primary"
                  onClick={() => act({ type: 'ANSWER_PROMPT', optionId: opt.id })}
                >
                  {t(`challenge.prompt.${opt.labelKey}`, {
                    ...opt.labelParams,
                    name: opt.name ? localizeName(opt.name) : undefined,
                  })}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {over ? (
        <div className={`challenge-result-overlay is-${state.status}`}>
          <div
            className="settlement-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settlement-title"
          >
            <p className="settlement-eyebrow">
              {state.status === 'won'
                ? t('challenge.settlementWin')
                : t('challenge.settlementLoss')}
            </p>
            <h2 id="settlement-title">
              {state.status === 'won' ? t('challenge.victory') : t('challenge.defeat')}
            </h2>
            <p className="settlement-lead">
              {state.resultKey
                ? t(`challenge.result.${state.resultKey}`)
                : state.status === 'won'
                  ? t('challenge.victory')
                  : t('challenge.defeat')}
            </p>
            <p className="settlement-matchup">
              {forceName} <span>vs</span> {challengeName}
            </p>
            <dl className="settlement-stats">
              <div>
                <dt>{t('challenge.statTurns')}</dt>
                <dd>{state.turnNumber}</dd>
              </div>
              <div>
                <dt>{t('challenge.statLife')}</dt>
                <dd>{state.player.life}</dd>
              </div>
              <div>
                <dt>{t('challenge.statAlive')}</dt>
                <dd>{state.player.creatures.length}</dd>
              </div>
              <div>
                <dt>{t('challenge.statFallen')}</dt>
                <dd>{state.player.graveyard.length}</dd>
              </div>
              <div>
                <dt>{t('challenge.statLibrary')}</dt>
                <dd>{state.challenge.library.length}</dd>
              </div>
              <div>
                <dt>{t('challenge.statEnemyBoard')}</dt>
                <dd>{state.challenge.battlefield.length}</dd>
              </div>
            </dl>
            <div className="settlement-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => act({ type: 'RESET' })}
              >
                {t('challenge.playAgain')}
              </button>
              <Link to={`/decks/${code}`} className="btn ghost">
                {t('challenge.backDeck')}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {inspect === 'graveyard' ? (
        <div className="prompt-backdrop" onClick={() => setInspect(null)}>
          <div className="prompt-shell inspect-shell" onClick={(e) => e.stopPropagation()}>
            <h2>{t('challenge.graveyard')}</h2>
            <div className="inspect-grid">
              {state.challenge.graveyard.map((c) => (
                <ArenaCard key={c.instanceId} image={c.image} name={c.name} compact />
              ))}
            </div>
            <button type="button" className="btn ghost" onClick={() => setInspect(null)}>
              {t('deck.close')}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
