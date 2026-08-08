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
import { ArenaCard } from '../components/challenge/ArenaCard'
import { AttackArrows } from '../components/challenge/AttackArrows'
import { CastStage } from '../components/challenge/CastStage'
import { DeckRosterModal } from '../components/challenge/DeckRosterModal'
import { ZonePile } from '../components/challenge/ZonePile'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { getDeck } from '../data/deckRegistry'
import { getCardZh } from '../data/locale/cardsZh'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import { coachTipKey } from '../game/coachTip'
import { challengeAttackLinks, FX_HORDE, FX_PLAYER_LIFE } from '../game/fx'
import {
  DEFAULT_PLAYER_DECK,
  findTemplate,
  findTemplateByName,
  getPlayerDeck,
  getRoster,
  PLAYER_DECKS,
  type PlayerDeckId,
} from '../game/playerDecks'
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
import { assetUrl } from '../utils/assetUrl'

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

  const act = useCallback((action: GameAction) => dispatch(action), [])

  const advance = useCallback(() => act({ type: 'ADVANCE' }), [act])

  const clearPreview = useCallback(() => setPreview(null), [])

  const roster = useMemo(
    () => getRoster(state.status === 'setup' ? playerDeckId : state.playerDeckId),
    [state.status, state.playerDeckId, playerDeckId],
  )

  const localizeName = useCallback(
    (name: string) => {
      if (!zh) return name
      return (
        getCardZh(code, name)?.name ??
        findTemplateByName(name)?.nameZh ??
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
    if (state.activeSide !== 'player' || state.playerPhase !== 'combat') return false
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
        <div
          className="arena-bg"
          style={
            heroArt ? { backgroundImage: `url(${assetUrl(heroArt)})` } : undefined
          }
        />
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
                      style={{ backgroundImage: `url(${assetUrl(d.art)})` }}
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
                count: getRoster(playerDeckId).length,
              })}
            </p>
          </div>
          <ul className="setup-notes">
            <li>{t('challenge.noteMuster')}</li>
            <li>{t('challenge.noteCombat')}</li>
            <li>{t('challenge.noteSimplified')}</li>
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
        className="arena-bg"
        style={
          heroArt ? { backgroundImage: `url(${assetUrl(heroArt)})` } : undefined
        }
      />
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
        <div className="arena-player-chrome is-opponent">
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

      <div className="arena-battlefield">
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
            {challengeCreatures.length === 0 ? (
              <p className="bf-empty">{t('challenge.emptyBoard')}</p>
            ) : null}
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
          ) : null}
          {state.fx ? (
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
        </div>

        <section className="bf-row player-row">
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
                ? (findTemplate(c.templateId, state.playerDeckId)?.nameZh ?? c.name)
                : c.name
              const showReady =
                canDeclare &&
                !selected &&
                (inCombat || state.playerPhase === 'main')
              const badge = blocking
                ? null
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
                    const tpl = findTemplate(c.templateId, state.playerDeckId)
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
            {state.player.creatures.length === 0 ? (
              <p className="bf-empty">{t('challenge.musterHint')}</p>
            ) : null}
          </div>
        </section>
      </div>

      {/* Player chrome + hand */}
      <div className="arena-player-chrome is-you">
        <ZonePile
          label={t('challenge.graveyard')}
          count={state.player.graveyard.length}
          kind="graveyard"
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
            {t('challenge.muster')} {state.player.muster}
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
          · {t('challenge.muster')} {state.player.muster}
        </p>
        <div className="hand-fan">
          {roster.map((tpl, i) => {
            const unaffordable =
              state.player.muster < tpl.cost ||
              state.flags.cannotCastSpells ||
              state.activeSide !== 'player' ||
              state.playerPhase !== 'main' ||
              over
            return (
              <button
                key={tpl.id}
                type="button"
                className={`hand-card ${unaffordable ? 'is-disabled' : ''}`}
                style={{ '--i': i } as React.CSSProperties}
                disabled={unaffordable}
                onClick={() => act({ type: 'SUMMON', templateId: tpl.id })}
                onMouseEnter={() =>
                  setPreview({
                    image: tpl.image,
                    name: zh ? tpl.nameZh : tpl.name,
                    text: [
                      zh ? tpl.typeLineZh : tpl.typeLine,
                      `${tpl.power}/${tpl.toughness} · ${t('challenge.musterCost', { n: tpl.cost })}`,
                      zh ? tpl.oracleTextZh : tpl.oracleText,
                    ].join('\n'),
                  })
                }
                onMouseLeave={clearPreview}
              >
                <img src={assetUrl(tpl.image)} alt="" draggable={false} />
                <span className="hand-cost">{tpl.cost}</span>
                <span className="hand-meta">
                  <strong>{zh ? tpl.nameZh : tpl.name}</strong>
                  <em>
                    {tpl.power}/{tpl.toughness}
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
            <img src={assetUrl(preview.image)} alt={preview.name} />
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
