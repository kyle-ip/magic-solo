import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import '../styles/arena.css'
import '../styles/llm.css'
import { ArenaCard } from '../components/challenge/ArenaCard'
import { AttackArrows } from '../components/challenge/AttackArrows'
import { CastStage } from '../components/challenge/CastStage'
import { DeckRosterModal } from '../components/challenge/DeckRosterModal'
import { CoachTipPanel } from '../components/challenge/CoachTipPanel'
import { ZonePile } from '../components/challenge/ZonePile'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { PackHeadIconButton } from '../components/PackHeadIconButton'
import { ChallengeSwitcher } from '../components/ChallengeSwitcher'
import { getDeck } from '../data/deckStore'
import { getCardZh } from '../data/locale/cardsZh'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import { coachTipKey } from '../game/coachTip'
import { challengeAttackLinks, FX_HORDE, FX_PLAYER_LIFE } from '../game/fx'
import {
  DEFAULT_PLAYER_DECK,
  findCardDef,
  findCardDefByName,
  getDeckCardCount,
  getDeckHint,
  getPlayerDeck,
  PLAYER_DECKS,
  type PlayerDeckId,
} from '../game/playerDecks'
import { ManaCost, ManaSymbol } from '../components/ManaCost'
import { canAffordCard } from '../game/playerCast'
import { HERO_DEFS, maxHeroesFor } from '../game/heroes'
import {
  canActivateCreature,
  canBlockAttacker,
  creatureEnhancement,
  effectivePower,
  effectiveToughness,
  formatEnhancementLabel,
} from '../game/playerAbilities'
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
  GameState,
  LogEntry,
  PromptKind,
} from '../game/types'
import { chatCompletion, LlmError } from '../llm/client'
import { battleReportContext } from '../llm/context/battleReport'
import {
  getBattleHistory,
  patchBattleHistory,
  upsertBattleHistory,
} from '../data/battleHistory'
import { summarizeGameBoard } from '../llm/context/gameBoard'
import {
  battleReportSystemPrompt,
  coachSystemPrompt,
  postGameAskSystemPrompt,
} from '../llm/prompts'
import { CardImage, RemoteArtBackground } from '../hooks/useCardImageSrc'
import { useHasLlmApiKey } from '../hooks/useLlmSettings'
import {
  preloadChallengeImages,
  type ChallengePreloadProgress,
} from '../utils/preloadChallengeImages'
import {
  useBoardExitGhosts,
  type BoardExitGhost,
} from '../hooks/useBoardExitGhosts'
import { SetupLlmAdvisor } from '../components/SetupLlmAdvisor'
import { LlmRichText } from '../components/LlmRichText'
import { preferredAssetUrl } from '../utils/remoteAsset'
import { setHideSiteChrome } from '../utils/siteChrome'
import { clampPreviewPosition } from '../utils/previewFollow'
import type { ArenaCounterBadge } from '../components/challenge/ArenaCard'

const CODES: ChallengeCode[] = ['tfth', 'tbth', 'tdag']
const COACH_KEY = 'magic-solo-coach'

function readCoachEnabled(): boolean {
  try {
    const v = localStorage.getItem(COACH_KEY)
    return v !== '0'
  } catch {
    return true
  }
}

type PromptPickCard = {
  image: string
  name: string
  nameZh: string
  text: string
}

function resolvePromptPickCard(
  state: GameState,
  kind: PromptKind,
  optionId: string,
  zh: boolean,
): PromptPickCard | null {
  if (kind === 'brainstorm') {
    const card = state.player.hand.find((c) => c.instanceId === optionId)
    if (!card) return null
    return {
      image: card.image,
      name: card.name,
      nameZh: card.nameZh || card.name,
      text: [
        zh ? card.typeLineZh || card.typeLine : card.typeLine,
        card.kind === 'land'
          ? ''
          : card.power != null
            ? `${card.power}/${card.toughness} · ${card.manaCost}`
            : card.manaCost,
        zh ? card.oracleTextZh || card.oracleText : card.oracleText,
      ]
        .filter(Boolean)
        .join('\n'),
    }
  }
  if (kind === 'choose_crawl') {
    const card = state.player.graveyard.find((c) => c.instanceId === optionId)
    if (!card) return null
    return {
      image: card.image,
      name: card.name,
      nameZh: card.nameZh || card.name,
      text: [
        zh ? card.typeLineZh || card.typeLine : card.typeLine,
        card.power != null ? `${card.power}/${card.toughness}` : '',
        zh ? card.oracleTextZh || card.oracleText : card.oracleText,
      ]
        .filter(Boolean)
        .join('\n'),
    }
  }
  if (kind === 'choose_crawl_zombie') {
    const c = state.player.creatures.find((x) => x.instanceId === optionId)
    if (!c) return null
    const def = findCardDef(c.defId, state.playerDeckId)
    return {
      image: c.image,
      name: c.name,
      nameZh: def?.nameZh || c.name,
      text: [
        def
          ? zh
            ? def.typeLineZh || def.typeLine
            : def.typeLine
          : '',
        `${c.power}/${c.toughness}`,
        def
          ? zh
            ? def.oracleTextZh || def.oracleText
            : def.oracleText
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    }
  }
  if (kind === 'choose_edict') {
    const c = state.challenge.battlefield.find((x) => x.instanceId === optionId)
    if (!c) return null
    const zhCard = zh ? getCardZh(state.code, c.name) : null
    return {
      image: c.image,
      name: c.name,
      nameZh: zhCard?.name || c.name,
      text: [
        zhCard?.typeLine || c.typeLine,
        c.power != null ? `${c.power}/${c.toughness}` : '',
        zhCard?.oracleText || c.oracleText,
      ]
        .filter(Boolean)
        .join('\n'),
    }
  }
  return null
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
  const [assetLoading, setAssetLoading] = useState(false)
  const [assetProgress, setAssetProgress] = useState<ChallengePreloadProgress>({
    done: 0,
    total: 0,
  })
  const assetLoadGenRef = useRef(0)
  const [focusAttacker, setFocusAttacker] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    image: string
    name: string
    text?: string
  } | null>(null)
  const [previewPos, setPreviewPos] = useState({ x: 16, y: 72 })
  const [inspect, setInspect] = useState<'graveyard' | 'player-graveyard' | null>(null)
  const [coachOn, setCoachOn] = useState(readCoachEnabled)
  const [logModalOpen, setLogModalOpen] = useState(false)
  const hasLlmKey = useHasLlmApiKey()
  const [llmTip, setLlmTip] = useState<string | null>(null)
  const [battleReport, setBattleReport] = useState('')
  const [battleReportError, setBattleReportError] = useState(false)
  const [battleReportLoading, setBattleReportLoading] = useState(false)
  const [postAsk, setPostAsk] = useState('')
  const [postAskAnswer, setPostAskAnswer] = useState('')
  const [postAskError, setPostAskError] = useState(false)
  const [postAskLoading, setPostAskLoading] = useState(false)
  const coachAbortRef = useRef<AbortController | null>(null)
  const reportAbortRef = useRef<AbortController | null>(null)
  const postAskAbortRef = useRef<AbortController | null>(null)
  const settlementIdRef = useRef<string | null>(null)
  const arenaRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // Keep SiteHeader on setup; hide chrome only while the board is active.
    const playing = state.status !== 'setup'
    setHideSiteChrome(playing)
    document.documentElement.classList.toggle('is-arena-playing', playing)
    return () => {
      setHideSiteChrome(false)
      document.documentElement.classList.remove('is-arena-playing')
    }
  }, [state.status])

  const act = useCallback((action: GameAction) => dispatch(action), [])

  const beginChallenge = useCallback(async () => {
    if (assetLoading) return
    const gen = ++assetLoadGenRef.current
    setAssetLoading(true)
    setAssetProgress({ done: 0, total: 0 })
    try {
      await preloadChallengeImages(
        { code, playerDeckId, heroIds },
        (progress) => {
          if (gen !== assetLoadGenRef.current) return
          setAssetProgress(progress)
        },
      )
    } finally {
      if (gen !== assetLoadGenRef.current) return
      setAssetLoading(false)
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
  }, [
    act,
    assetLoading,
    code,
    heads,
    heroIds,
    hordeDelay,
    playerDeckId,
  ])

  const advance = useCallback(() => act({ type: 'ADVANCE' }), [act])

  const clearPreviewTimer = useRef(0)

  const clearPreview = useCallback(() => {
    window.clearTimeout(clearPreviewTimer.current)
    // Delay hide so moving between cards does not flash the preview away
    clearPreviewTimer.current = window.setTimeout(() => setPreview(null), 160)
  }, [])

  const placePreview = useCallback(
    (
      next: { image: string; name: string; text?: string },
      point?: { clientX: number; clientY: number } | null,
    ) => {
      window.clearTimeout(clearPreviewTimer.current)
      setPreview(next)
      if (point) {
        setPreviewPos(clampPreviewPosition(point.clientX, point.clientY))
      }
    },
    [],
  )

  useEffect(() => {
    return () => window.clearTimeout(clearPreviewTimer.current)
  }, [])

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
  const staticTip = t(`challenge.tip.${tipKey}`)

  useEffect(() => {
    return () => {
      coachAbortRef.current?.abort()
      reportAbortRef.current?.abort()
      postAskAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (state.status === 'playing') return
    setLlmTip(null)
    coachAbortRef.current?.abort()
  }, [state.status])

  useEffect(() => {
    if (state.status === 'won' || state.status === 'lost') return
    setBattleReport('')
    setBattleReportError(false)
    setPostAsk('')
    setPostAskAnswer('')
    setPostAskError(false)
    settlementIdRef.current = null
    reportAbortRef.current?.abort()
    postAskAbortRef.current?.abort()
  }, [state.status])

  useEffect(() => {
    if (state.status !== 'won' && state.status !== 'lost') return
    const deckDef = getPlayerDeck(state.playerDeckId)
    const lang = i18n.language.startsWith('zh') ? 'zh' : 'en'
    if (!settlementIdRef.current) {
      settlementIdRef.current = crypto.randomUUID()
    }
    upsertBattleHistory({
      id: settlementIdRef.current,
      code,
      status: state.status,
      resultKey: state.resultKey,
      playerDeckId: state.playerDeckId,
      playerDeckName: deckDef.name,
      playerDeckNameZh: deckDef.nameZh,
      turnNumber: state.turnNumber,
      life: state.player.life,
      creaturesAlive: state.player.creatures.length,
      fallen: state.player.graveyard.length,
      enemyLibrary: state.challenge.library.length,
      enemyBoard: state.challenge.battlefield.length,
      ...(battleReportError ? {} : { battleReport }),
      lang,
    })
  }, [
    state.status,
    state.resultKey,
    state.playerDeckId,
    state.turnNumber,
    state.player.life,
    state.player.creatures.length,
    state.player.graveyard.length,
    state.challenge.library.length,
    state.challenge.battlefield.length,
    code,
    i18n.language,
    battleReport,
    battleReportError,
  ])

  useEffect(() => {
    if (!settlementIdRef.current) return
    if (state.status !== 'won' && state.status !== 'lost') return
    if (!postAskAnswer || postAskError) return
    const q = postAsk.trim()
    if (!q) return
    const id = settlementIdRef.current
    const existing = getBattleHistory(id)?.postAsks ?? []
    const last = existing[existing.length - 1]
    if (last?.question === q && last?.answer === postAskAnswer) return
    patchBattleHistory(id, {
      postAsks: [...existing, { question: q, answer: postAskAnswer }],
    })
  }, [postAskAnswer, postAskError, postAsk, state.status])

  useEffect(() => {
    if (!coachOn || !hasLlmKey || state.status !== 'playing') {
      setLlmTip(null)
      coachAbortRef.current?.abort()
      return
    }

    coachAbortRef.current?.abort()
    const ac = new AbortController()
    coachAbortRef.current = ac

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const text = await chatCompletion({
            signal: ac.signal,
            maxTokens: 180,
            temperature: 0.5,
            messages: [
              { role: 'system', content: coachSystemPrompt(i18n.language) },
              {
                role: 'user',
                content: [
                  `Tip intent: ${tipKey}`,
                  `Static tip (fallback): ${staticTip}`,
                  `Board JSON:\n${JSON.stringify(summarizeGameBoard(state))}`,
                ].join('\n'),
              },
            ],
            cache: {
              scope: 'challenge.coach',
              payload: {
                lang: i18n.language,
                tipKey,
                board: summarizeGameBoard(state),
              },
              ttlMs: null,
            },
          })
          if (!ac.signal.aborted) {
            setLlmTip(text)
          }
        } catch (err) {
          if (err instanceof LlmError && err.code === 'aborted') return
          if (!ac.signal.aborted) {
            setLlmTip(null)
          }
        }
      })()
    }, 450)

    return () => {
      window.clearTimeout(timer)
      ac.abort()
    }
    // Intentionally keyed on tip/phase signals, not full state object identity churn every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- throttle on tip + turn signals
  }, [
    coachOn,
    hasLlmKey,
    state.status,
    tipKey,
    state.turnNumber,
    state.activeSide,
    state.playerPhase,
    state.challengePhase,
    state.awaitingAdvance,
    state.pendingCast?.mode,
    state.prompt?.kind,
    i18n.language,
    staticTip,
  ])

  const generateBattleReport = useCallback(async () => {
    if (!hasLlmKey || battleReportLoading) return
    if (state.status !== 'won' && state.status !== 'lost') return
    reportAbortRef.current?.abort()
    const ac = new AbortController()
    reportAbortRef.current = ac
    setBattleReportLoading(true)
    setBattleReportError(false)
    const matchPayload = battleReportContext(state, formatLog)
    const regenerate = Boolean(battleReport)
    try {
      const text = await chatCompletion({
        signal: ac.signal,
        maxTokens: 900,
        temperature: 0.55,
        messages: [
          { role: 'system', content: battleReportSystemPrompt(i18n.language) },
          {
            role: 'user',
            content: `Match data:\n${JSON.stringify(matchPayload)}`,
          },
        ],
        cache: {
          scope: 'challenge.battleReport',
          payload: { lang: i18n.language, match: matchPayload },
          ttlMs: null,
        },
        skipCache: regenerate,
      })
      setBattleReport(text)
    } catch (err) {
      if (err instanceof LlmError && err.code === 'aborted') return
      setBattleReportError(true)
      setBattleReport(
        err instanceof Error ? err.message : t('llm.errorGeneric'),
      )
    } finally {
      setBattleReportLoading(false)
    }
  }, [
    hasLlmKey,
    battleReportLoading,
    battleReport,
    state,
    formatLog,
    i18n.language,
    t,
  ])

  const askPostGame = useCallback(async () => {
    const q = postAsk.trim()
    if (!hasLlmKey || postAskLoading || !q) return
    if (state.status !== 'won' && state.status !== 'lost') return
    postAskAbortRef.current?.abort()
    const ac = new AbortController()
    postAskAbortRef.current = ac
    setPostAskLoading(true)
    setPostAskError(false)
    setPostAskAnswer('')
    try {
      const matchPayload = battleReportContext(state, formatLog)
      const text = await chatCompletion({
        signal: ac.signal,
        maxTokens: 360,
        temperature: 0.45,
        messages: [
          { role: 'system', content: postGameAskSystemPrompt(i18n.language) },
          {
            role: 'user',
            content: [
              `Match data:\n${JSON.stringify(matchPayload)}`,
              `Question: ${q}`,
            ].join('\n\n'),
          },
        ],
        cache: {
          scope: 'challenge.postAsk',
          payload: { lang: i18n.language, match: matchPayload, question: q },
          ttlMs: null,
        },
      })
      setPostAskAnswer(text)
    } catch (err) {
      if (err instanceof LlmError && err.code === 'aborted') return
      setPostAskError(true)
      setPostAskAnswer(err instanceof Error ? err.message : t('llm.errorGeneric'))
    } finally {
      setPostAskLoading(false)
    }
  }, [postAsk, hasLlmKey, postAskLoading, state, formatLog, i18n.language, t])

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

  const previewChallengeCard = useCallback(
    (
      card: CardInstance,
      point?: { clientX: number; clientY: number } | null,
    ) => {
      const zhCard = zh ? getCardZh(code, card.name) : null
      placePreview(
        {
          image: card.image,
          name: zhCard?.name ?? card.name,
          text: zhCard
            ? `${zhCard.typeLine}\n${zhCard.oracleText}`
            : `${card.typeLine}\n${card.oracleText}`,
        },
        point,
      )
    },
    [zh, code, placePreview],
  )

  useEffect(() => {
    if (!preview) return
    const onMove = (e: PointerEvent) => {
      setPreviewPos(clampPreviewPosition(e.clientX, e.clientY))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [preview])

  useEffect(() => {
    if (!logModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLogModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [logModalOpen])

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

  const cancelCombat = useCallback(() => {
    setFocusAttacker(null)
    act({ type: 'SET_PHASE', phase: 'main' })
  }, [act])

  const declareOrToggleAttacker = useCallback(
    (id: string) => {
      setFocusAttacker(id)
      act({ type: 'TOGGLE_ATTACKER', id })
    },
    [act],
  )

  const challengeCreatures = useMemo(
    () =>
      state.challenge.battlefield.filter(
        (c) => c.power != null || c.isHead || c.isGod || c.isReveler || c.isMinotaur,
      ),
    [state.challenge.battlefield],
  )
  const challengeOthers = useMemo(
    () =>
      state.challenge.battlefield.filter(
        (c) =>
          !(c.power != null || c.isHead || c.isGod || c.isReveler || c.isMinotaur),
      ),
    [state.challenge.battlefield],
  )

  const boardExitLive = useMemo((): BoardExitGhost[] => {
    const challengeCreatureIds = new Set(challengeCreatures.map((c) => c.instanceId))
    const out: BoardExitGhost[] = []
    for (const card of challengeCreatures) {
      out.push({
        id: card.instanceId,
        zone: 'challenge-creatures',
        image: card.image,
        name: localizeName(card.name),
        power: card.power,
        toughness: card.toughness,
        markedDamage: card.markedDamage,
        tapped: card.tapped,
        keywords: card.keywords,
      })
    }
    for (const card of state.challenge.battlefield) {
      if (challengeCreatureIds.has(card.instanceId)) continue
      out.push({
        id: card.instanceId,
        zone: 'challenge-others',
        image: card.image,
        name: card.name,
        tapped: card.tapped,
      })
    }
    for (const c of state.player.creatures) {
      const def = findCardDef(c.defId, state.playerDeckId)
      out.push({
        id: c.instanceId,
        zone: 'player-creatures',
        image: c.image,
        name: zh
          ? (findCardDef(c.defId, state.playerDeckId)?.nameZh ?? c.name)
          : c.name,
        power: effectivePower(state, c),
        toughness: effectiveToughness(state, c),
        markedDamage: c.markedDamage,
        tapped: c.tapped,
        keywords: c.keywords?.length ? c.keywords : def?.keywords,
        manaCost: def?.manaCost,
        colors: c.produces,
      })
    }
    for (const land of state.player.lands) {
      out.push({
        id: land.instanceId,
        zone: 'player-lands',
        image: land.image,
        name: zh
          ? (findCardDef(land.defId, state.playerDeckId)?.nameZh ?? land.name)
          : land.name,
        tapped: land.tapped,
        colors: land.produces,
      })
    }
    return out
  }, [
    challengeCreatures,
    state.challenge.battlefield,
    state.player.creatures,
    state.player.lands,
    state.playerDeckId,
    state,
    zh,
    localizeName,
  ])

  const exitGhosts = useBoardExitGhosts(
    boardExitLive,
    state.status === 'playing',
  )

  if (!deck) return <Navigate to="/" replace />

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
    const preloadPct =
      assetProgress.total > 0
        ? Math.round((assetProgress.done / assetProgress.total) * 100)
        : 0
    return (
      <main className={`arena-root theme-${deck.theme}`}>
        <RemoteArtBackground className="arena-bg" localPath={heroArt} kind="art_crop" />
        <div className="arena-bg-veil" />
        <section className={`arena-setup${assetLoading ? ' is-preloading' : ''}`}>
          {assetLoading ? (
            <div className="setup-preload" role="status" aria-live="polite">
              <p>
                {t('challenge.loadingAssets', {
                  done: assetProgress.done,
                  total: assetProgress.total || '…',
                })}
              </p>
              <div className="setup-preload-bar" aria-hidden="true">
                <span style={{ width: `${preloadPct}%` }} />
              </div>
            </div>
          ) : null}
          <div className="page-top-nav">
            <Link to={`/decks/${code}`} className="back-link">
              ← {t('challenge.backDeck')}
            </Link>
            <ChallengeSwitcher currentCode={code} mode="challenge" />
          </div>
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
                const hint = getDeckHint(d.id, code, zh)
                const count = getDeckCardCount(d.id)
                return (
                  <div
                    key={d.id}
                    role="option"
                    tabIndex={0}
                    aria-selected={selected}
                    className={`setup-deck-card ${selected ? 'is-selected' : ''}`}
                    onClick={() => setPlayerDeckId(d.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setPlayerDeckId(d.id)
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
                          setPlayerDeckId(d.id)
                          setRosterModalId(d.id)
                        }}
                      >
                        {t('challenge.viewRoster')}
                      </button>
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="setup-deck-preview">
              {t('challenge.deckRoster', {
                name: zh
                  ? getPlayerDeck(playerDeckId).nameZh
                  : getPlayerDeck(playerDeckId).name,
                count: getDeckCardCount(playerDeckId),
              })}
            </p>
            <p className="setup-deck-selected-hint">
              <span className="setup-deck-hint-label">{t('challenge.deckHint')}</span>
              {getDeckHint(playerDeckId, code, zh)}
            </p>
          </div>
          <ul className="setup-notes">
            <li>{t('challenge.noteConstructed')}</li>
            <li>{t('challenge.noteCombat')}</li>
            <li>{t('challenge.noteMana')}</li>
            <li>{t('challenge.noteHeroes')}</li>
            <li>{t('challenge.noteOfficial')}</li>
          </ul>
          <div className="setup-cta-row">
            <SetupLlmAdvisor
              code={code}
              heads={heads}
              hordeDelay={hordeDelay}
              heroIds={heroIds}
              playerDeckId={playerDeckId}
            />
            <button
              type="button"
              className={`btn primary${assetLoading ? ' is-busy' : ''}`}
              disabled={assetLoading}
              onClick={() => void beginChallenge()}
            >
              {assetLoading ? t('challenge.beginLoading') : t('challenge.begin')}
            </button>
          </div>
        </section>
        {rosterModalId ? (
          <DeckRosterModal
            deckId={rosterModalId}
            code={code}
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

      <div className="arena-topbar-shell">
        <div className="arena-topbar-hotzone" aria-hidden="true" />
        <header className="arena-topbar">
          <div className="arena-topbar-actions is-tools">
            <button type="button" className="btn ghost" onClick={() => act({ type: 'RESET' })}>
              {t('challenge.resign')}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setLogModalOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={logModalOpen}
            >
              {t('challenge.log')}
            </button>
            <button
              type="button"
              className={`btn ghost coach-toggle ${coachOn ? 'is-on' : ''}`}
              onClick={toggleCoach}
              aria-pressed={coachOn}
            >
              {coachOn ? t('challenge.coachOn') : t('challenge.coachOff')}
            </button>
            <LanguageSwitch compact asButton />
          </div>
          <div className="arena-title">
            <strong>{meta?.name ?? deck.name}</strong>
            <span className="arena-turn-meta">
              <span className="arena-turn-count">
                {t('challenge.turn')} {state.turnNumber}
              </span>
              <span
                className={`arena-turn-side ${
                  state.activeSide === 'player' ? 'is-you' : 'is-them'
                }`}
              >
                {state.activeSide === 'player'
                  ? t('challenge.yourTurn')
                  : t('challenge.theirTurn')}
              </span>
            </span>
          </div>
          <div className="arena-topbar-actions is-play-spacer" aria-hidden="true" />
        </header>
      </div>

      {/* Opponent chrome */}
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

      {logModalOpen ? (
        <div
          className="arena-log-overlay"
          role="presentation"
          onClick={() => setLogModalOpen(false)}
        >
          <div
            className="arena-log-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="arena-log-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="arena-log-modal-head">
              <h2 id="arena-log-modal-title">{t('challenge.log')}</h2>
              <PackHeadIconButton
                icon="close"
                label={t('challenge.logClose')}
                onClick={() => setLogModalOpen(false)}
              />
            </div>
            <ul className="arena-log-modal-list">
              {state.log.length === 0 ? (
                <li className="tone-info">{t('challenge.logEmpty')}</li>
              ) : (
                state.log.map((e) => (
                  <li key={e.id} className={`tone-${e.tone ?? 'info'}`}>
                    {formatLog(e)}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}

      <div
        className={`arena-battlefield ${inCombat ? 'is-combat' : ''}`}
      >
        <section className="bf-row opponent-row">
          <div className="bf-board is-opponent">
            {/* Always reserve two rows so card size matches the player half */}
            <div className="bf-lands bf-row-reserve" aria-hidden="true" />
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
                  variant="board"
                  instanceId={card.instanceId}
                  image={card.image}
                  name={localizeName(card.name)}
                  keywords={card.keywords}
                  zhLabels={zh}
                  counters={[
                    ...(card.isHead
                      ? [
                          {
                            id: 'head',
                            text: zh ? '头' : 'H',
                            title: zh ? 'Hydra head' : 'Head',
                            tone: 'gold' as const,
                          },
                        ]
                      : []),
                    ...(card.isElite
                      ? [
                          {
                            id: 'elite',
                            text: '★',
                            title: 'Elite',
                            tone: 'gold' as const,
                          },
                        ]
                      : []),
                  ]}
                  power={card.power}
                  toughness={card.toughness}
                  markedDamage={card.markedDamage}
                  tapped={card.tapped}
                  showPt
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
                  onMouseEnter={(e) => previewChallengeCard(card, e)}
                  onMouseLeave={clearPreview}
                />
              )
            })}
              {exitGhosts
                .filter((g) => g.zone === 'challenge-creatures')
                .map((g) => (
                  <ArenaCard
                    key={`exit-${g.id}`}
                    variant="board"
                    dying
                    image={g.image}
                    name={g.name}
                    keywords={g.keywords}
                    zhLabels={zh}
                    power={g.power}
                    toughness={g.toughness}
                    markedDamage={g.markedDamage}
                    tapped={g.tapped}
                    showPt
                  />
                ))}
            </div>
          </div>
          <div className="bf-others">
            {challengeOthers.map((card) => (
              <ArenaCard
                key={card.instanceId}
                variant="board"
                image={card.image}
                name={card.name}
                compact
                onMouseEnter={(e) => previewChallengeCard(card, e)}
                onMouseLeave={clearPreview}
              />
            ))}
            {exitGhosts
              .filter((g) => g.zone === 'challenge-others')
              .map((g) => (
                <ArenaCard
                  key={`exit-${g.id}`}
                  variant="board"
                  dying
                  image={g.image}
                  name={g.name}
                  compact
                  tapped={g.tapped}
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
                    onMouseEnter={(e) =>
                      placePreview(
                        {
                          image: def?.image || h.image || '',
                          name: zh ? (def?.nameZh ?? h.name) : h.name,
                          text: zh
                            ? `${def?.typeLineZh ?? ''}\n${def?.oracleTextZh ?? h.oracleText}`
                            : `${def?.typeLine ?? 'Hero'}\n${h.oracleText}`,
                        },
                        e,
                      )
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
          <div className="bf-board">
          <div
            className={`bf-creatures${
              state.player.creatures.length + state.player.lands.length > 6
                ? ' is-dense'
                : ''
            }${
              state.player.creatures.length + state.player.lands.length > 10
                ? ' is-crowded'
                : ''
            }`}
          >
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
              const power = effectivePower(state, c)
              const toughness = effectiveToughness(state, c)
              const canAct =
                canActivateCreature(state, c.instanceId) && !pendingMine && !blocking
              const enh = creatureEnhancement(state, c)
              const enhLabel = enh ? formatEnhancementLabel(enh) : null
              const def = findCardDef(c.defId, state.playerDeckId)
              const boardCounters: ArenaCounterBadge[] = []
              if (c.monstrous) {
                boardCounters.push({
                  id: 'monstrous',
                  text: 'M',
                  title: zh ? '已蛮化' : 'Monstrous',
                  tone: 'gold',
                })
              }
              const temp = Math.min(c.tempPower ?? 0, c.tempToughness ?? 0)
              if (temp > 0 && (c.tempPower ?? 0) === (c.tempToughness ?? 0)) {
                boardCounters.push({
                  id: 'p1p1',
                  text: `+${temp}`,
                  title: zh ? `+1/+1 ×${temp}` : `+1/+1 ×${temp}`,
                  tone: 'buff',
                })
              }
              return (
                <ArenaCard
                  key={c.instanceId}
                  variant="board"
                  instanceId={c.instanceId}
                  image={c.image}
                  name={label}
                  manaCost={def?.manaCost}
                  colors={c.produces}
                  keywords={c.keywords?.length ? c.keywords : def?.keywords}
                  zhLabels={zh}
                  counters={boardCounters}
                  power={power}
                  toughness={toughness}
                  markedDamage={c.markedDamage}
                  tapped={c.tapped}
                  showPt
                  selected={selected}
                  attacking={selected || pop?.kind === 'attack'}
                  attackReady={showReady}
                  targetable={pendingMine}
                  dimmed={c.summoningSickness || (c.tapped && !selected)}
                  hitFx={pop?.kind === 'damage'}
                  strikeFx={pop?.kind === 'attack'}
                  enhancement={enhLabel}
                  floater={
                    pop
                      ? { kind: pop.kind, amount: pop.amount }
                      : null
                  }
                  badge={
                    canAct
                      ? t('challenge.badge.activate')
                      : badge
                  }
                  note={canAct ? t('challenge.activateHint') : null}
                  onDoubleClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (over) return
                    if (canActivateCreature(state, c.instanceId)) {
                      act({ type: 'ACTIVATE', creatureId: c.instanceId })
                    }
                  }}
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
                      const legal = attackers.filter((a) => canBlockAttacker(c, a))
                      if (legal.length === 0) return
                      const current = state.blockAssignments[c.instanceId]
                      const idx = current
                        ? legal.findIndex((a) => a.instanceId === current)
                        : -1
                      const next = legal[(idx + 1) % legal.length]
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
                  onMouseEnter={(e) => {
                    const tpl = findCardDef(c.defId, state.playerDeckId)
                    placePreview(
                      {
                        image: c.image,
                        name: label,
                        text: tpl
                          ? `${zh ? tpl.typeLineZh : tpl.typeLine}\n${power}/${toughness}${
                              enhLabel ? ` (${enhLabel})` : ''
                            }\n${zh ? tpl.oracleTextZh : tpl.oracleText}`
                          : `${power}/${toughness}`,
                      },
                      e,
                    )
                  }}
                  onMouseLeave={clearPreview}
                />
              )
            })}
            {exitGhosts
              .filter((g) => g.zone === 'player-creatures')
              .map((g) => (
                <ArenaCard
                  key={`exit-${g.id}`}
                  variant="board"
                  dying
                  image={g.image}
                  name={g.name}
                  manaCost={g.manaCost}
                  colors={g.colors}
                  keywords={g.keywords}
                  zhLabels={zh}
                  power={g.power}
                  toughness={g.toughness}
                  markedDamage={g.markedDamage}
                  tapped={g.tapped}
                  showPt
                />
              ))}
          </div>
            <div
              className={`bf-lands${
                state.player.lands.length > 6 ? ' is-dense' : ''
              }${state.player.lands.length > 10 ? ' is-crowded' : ''}`}
            >
              {state.player.lands.map((land) => {
                const label = zh
                  ? (findCardDef(land.defId, state.playerDeckId)?.nameZh ?? land.name)
                  : land.name
                return (
                  <ArenaCard
                    key={land.instanceId}
                    variant="board"
                    instanceId={land.instanceId}
                    image={land.image}
                    name={label}
                    colors={land.produces}
                    tapped={land.tapped}
                    dimmed={land.tapped}
                    onMouseEnter={(e) =>
                      placePreview(
                        {
                          image: land.image,
                          name: label,
                          text: land.typeLine,
                        },
                        e,
                      )
                    }
                    onMouseLeave={clearPreview}
                  />
                )
              })}
              {exitGhosts
                .filter((g) => g.zone === 'player-lands')
                .map((g) => (
                  <ArenaCard
                    key={`exit-${g.id}`}
                    variant="board"
                    dying
                    image={g.image}
                    name={g.name}
                    colors={g.colors}
                    tapped={g.tapped}
                  />
                ))}
            </div>
          </div>
        </section>
      </div>

      {coachOn && state.status === 'playing' ? (
        <CoachTipPanel label={t('challenge.tipLabel')}>
          {hasLlmKey && llmTip ? <LlmRichText text={llmTip} inline /> : staticTip}
        </CoachTipPanel>
      ) : null}

      <div className="player-dock">
        <div className="arena-player-chrome is-you challenge-zone-piles">
          <div
            className={`life-orb is-you ${
              fxFor(FX_PLAYER_LIFE)?.kind === 'damage' ? 'is-hit' : ''
            }`}
            data-instance-id={FX_PLAYER_LIFE}
          >
            <span className="life-orb-label">{t('challenge.life')}</span>
            <strong>{state.player.life}</strong>
            {state.flags.preventCombatDamageThisTurn ? (
              <span className="life-orb-sub">{t('challenge.fogActive')}</span>
            ) : null}
            {fxFor(FX_PLAYER_LIFE) ? (
              <span
                className={`combat-floater kind-${fxFor(FX_PLAYER_LIFE)!.kind} chrome-floater`}
              >
                {fxFor(FX_PLAYER_LIFE)!.kind === 'heal' ? '+' : '−'}
                {fxFor(FX_PLAYER_LIFE)!.amount ?? 0}
              </span>
            ) : null}
          </div>
          <ZonePile
            label={t('challenge.graveyard')}
            count={state.player.graveyard.length}
            kind="graveyard"
            onClick={() => setInspect('player-graveyard')}
            hint={
              state.player.graveyard.some((c) => c.flashback)
                ? t('challenge.flashbackHint')
                : undefined
            }
          />
          <div className="zone-pile-wrap">
            <ZonePile
              label={t('challenge.library')}
              count={state.player.library.length}
              kind="library"
            />
          </div>
        </div>

        <div className="hand-dock">
          <div
            className="hand-fan"
            style={
              {
                '--hand-mid': Math.max(0, (state.player.hand.length - 1) / 2),
              } as CSSProperties
            }
          >
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
                  style={{ '--i': i } as CSSProperties}
                  aria-disabled={unaffordable && !pending ? true : undefined}
                  onClick={() => {
                    if (pending) {
                      act({ type: 'CANCEL_PENDING' })
                      return
                    }
                    if (unaffordable) return
                    act({ type: 'CAST', handId: card.instanceId })
                  }}
                  onMouseEnter={(e) =>
                    placePreview(
                      {
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
                      },
                      e,
                    )
                  }
                  onMouseLeave={clearPreview}
                >
                  <CardImage localPath={card.image} kind="normal" alt="" draggable={false} />
                </button>
              )
            })}
          </div>
        </div>

        <div className="arena-play-actions">
          {state.activeSide === 'player' && !over ? (
            <>
              {state.playerPhase === 'main' && attackables.length > 0 ? (
                <button type="button" className="btn ghost" onClick={enterCombat}>
                  {t('challenge.enterCombat')}
                </button>
              ) : null}
              {state.playerPhase === 'combat' ? (
                <>
                  <button type="button" className="btn ghost" onClick={cancelCombat}>
                    {t('challenge.cancelCombat')}
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
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
                </>
              ) : null}
              {state.pendingCast ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => act({ type: 'CANCEL_PENDING' })}
                >
                  {t('challenge.cancelTarget')}
                </button>
              ) : null}
              <button
                type="button"
                className="btn ghost is-end-turn"
                onClick={() => {
                  setFocusAttacker(null)
                  act({ type: 'END_TURN' })
                }}
              >
                {t('challenge.endTurn')}
              </button>
            </>
          ) : state.pendingCast ? (
            <button
              type="button"
              className="btn ghost"
              onClick={() => act({ type: 'CANCEL_PENDING' })}
            >
              {t('challenge.cancelTarget')}
            </button>
          ) : null}
        </div>
      </div>

      {preview
        ? createPortal(
            <aside
              className="card-preview-pane is-follow"
              aria-hidden="true"
              style={
                {
                  '--preview-x': `${previewPos.x}px`,
                  '--preview-y': `${previewPos.y}px`,
                } as CSSProperties
              }
            >
              <div
                className="card-preview-swap"
                key={`${preview.image}|${preview.name}`}
              >
                {preview.image ? (
                  <div className="card-preview-art">
                    <CardImage
                      localPath={preview.image}
                      kind="png"
                      alt={preview.name}
                    />
                  </div>
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
              </div>
            </aside>,
            document.body,
          )
        : null}

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
          <div
            className={`prompt-shell${
              state.prompt.kind === 'scry' ? ' prompt-shell-scry' : ''
            }${
              state.prompt.kind === 'brainstorm' ||
              state.prompt.kind === 'choose_crawl' ||
              state.prompt.kind === 'choose_crawl_zombie' ||
              state.prompt.kind === 'choose_edict'
                ? ' prompt-shell-cards'
                : ''
            }`}
          >
            <h2>{t(`challenge.prompt.${state.prompt.titleKey}`)}</h2>
            {state.prompt.kind === 'scry' && state.player.library[0] ? (
              (() => {
                const top = state.player.library[0]
                const label = zh ? top.nameZh || top.name : top.name
                const typeLine = zh ? top.typeLineZh || top.typeLine : top.typeLine
                const oracle = zh ? top.oracleTextZh || top.oracleText : top.oracleText
                return (
                  <div className="scry-preview">
                    <ArenaCard
                      image={top.image}
                      name={label}
                      power={top.power}
                      toughness={top.toughness}
                    />
                    <div className="scry-preview-copy">
                      <p className="scry-preview-name">{label}</p>
                      {typeLine ? (
                        <p className="scry-preview-type">{typeLine}</p>
                      ) : null}
                      {top.manaCost ? (
                        <ManaCost
                          cost={top.manaCost}
                          className="pack-mana-cost scry-preview-cost"
                        />
                      ) : null}
                      {oracle ? (
                        <p className="scry-preview-oracle">{oracle}</p>
                      ) : null}
                      <p className="scry-preview-hint">
                        {t('challenge.prompt.scryChoose')}
                      </p>
                    </div>
                  </div>
                )
              })()
            ) : (
              <p>
                {t(
                  `challenge.prompt.${state.prompt.messageKey}`,
                  state.prompt.messageParams,
                )}
              </p>
            )}
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
            {state.prompt.kind === 'brainstorm' ||
            state.prompt.kind === 'choose_crawl' ||
            state.prompt.kind === 'choose_crawl_zombie' ||
            state.prompt.kind === 'choose_edict' ? (
              <div className="prompt-card-picker" role="listbox">
                {(state.prompt.options ?? []).map((opt) => {
                  const picked = resolvePromptPickCard(
                    state,
                    state.prompt!.kind,
                    opt.id,
                    zh,
                  )
                  if (!picked) return null
                  const label = zh ? picked.nameZh : picked.name
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className="prompt-pick-card"
                      role="option"
                      aria-label={label}
                      onClick={() =>
                        act({ type: 'ANSWER_PROMPT', optionId: opt.id })
                      }
                      onMouseEnter={(e) =>
                        placePreview(
                          {
                            image: picked.image,
                            name: label,
                            text: picked.text,
                          },
                          e,
                        )
                      }
                      onMouseLeave={clearPreview}
                    >
                      <CardImage
                        localPath={picked.image}
                        kind="normal"
                        alt=""
                        draggable={false}
                      />
                      <span className="prompt-pick-card-name">{label}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="prompt-actions">
                {(state.prompt.options ?? []).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="btn primary"
                    onClick={() =>
                      act({ type: 'ANSWER_PROMPT', optionId: opt.id })
                    }
                  >
                    {t(`challenge.prompt.${opt.labelKey}`, {
                      ...opt.labelParams,
                      name: opt.name ? localizeName(opt.name) : undefined,
                    })}
                  </button>
                ))}
              </div>
            )}
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
            {hasLlmKey ? (
              <div className="settlement-report">
                {battleReport ? (
                  <div
                    className={`llm-battle-report ${battleReportError ? 'is-error' : ''}`}
                    role="status"
                  >
                    <strong>{t('llm.battleReport')}</strong>
                    <LlmRichText text={battleReport} className="llm-md-flush" />
                  </div>
                ) : null}
                <form
                  className="llm-postgame-ask"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void askPostGame()
                  }}
                >
                  <input
                    type="text"
                    value={postAsk}
                    onChange={(e) => setPostAsk(e.target.value)}
                    placeholder={t('llm.postAskPlaceholder')}
                    disabled={postAskLoading}
                    aria-label={t('llm.postAskPlaceholder')}
                  />
                  <button
                    type="submit"
                    className="btn ghost"
                    disabled={postAskLoading || !postAsk.trim()}
                  >
                    {postAskLoading ? t('llm.rulesLoading') : t('llm.postAsk')}
                  </button>
                </form>
                {postAskAnswer ? (
                  <div
                    className={`llm-battle-report ${postAskError ? 'is-error' : ''}`}
                    role="status"
                  >
                    <LlmRichText text={postAskAnswer} />
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="settlement-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => act({ type: 'RESET' })}
              >
                {t('challenge.playAgain')}
              </button>
              {hasLlmKey ? (
                <button
                  type="button"
                  className="btn ghost"
                  disabled={battleReportLoading}
                  onClick={() => void generateBattleReport()}
                >
                  {battleReportLoading
                    ? t('llm.rulesLoading')
                    : battleReport
                      ? t('llm.battleReportAgain')
                      : t('llm.battleReportGenerate')}
                </button>
              ) : null}
              <Link to={`/decks/${code}`} className="btn ghost">
                {t('challenge.backDeck')}
              </Link>
            </div>
            <ChallengeSwitcher
              currentCode={code}
              mode="challenge"
              className="settlement-switcher"
            />
          </div>
        </div>
      ) : null}

      {inspect === 'graveyard' ? (
        <div
          className="prompt-backdrop"
          onClick={() => {
            clearPreview()
            setInspect(null)
          }}
        >
          <div className="prompt-shell inspect-shell" onClick={(e) => e.stopPropagation()}>
            <header className="inspect-shell-head">
              <h2>{t('challenge.graveyard')}</h2>
              <PackHeadIconButton
                icon="close"
                label={t('deck.close')}
                onClick={() => setInspect(null)}
              />
            </header>
            <div className="inspect-grid">
              {state.challenge.graveyard.map((c) => (
                <ArenaCard
                  key={c.instanceId}
                  image={c.image}
                  name={localizeName(c.name)}
                  onMouseEnter={(e) => previewChallengeCard(c, e)}
                  onMouseLeave={clearPreview}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {inspect === 'player-graveyard' ? (
        <div
          className="prompt-backdrop"
          onClick={() => {
            clearPreview()
            setInspect(null)
          }}
        >
          <div className="prompt-shell inspect-shell" onClick={(e) => e.stopPropagation()}>
            <header className="inspect-shell-head">
              <h2>{t('challenge.yourGraveyard')}</h2>
              <PackHeadIconButton
                icon="close"
                label={t('deck.close')}
                onClick={() => {
                  clearPreview()
                  setInspect(null)
                }}
              />
            </header>
            <p className="setup-deck-hint">{t('challenge.flashbackHint')}</p>
            <div className="inspect-grid">
              {state.player.graveyard.map((c) => {
                const label = zh ? c.nameZh || c.name : c.name
                const canFb =
                  !!c.flashback &&
                  state.activeSide === 'player' &&
                  state.status === 'playing' &&
                  !state.pendingCast
                return (
                  <div key={c.instanceId} className="player-gy-card">
                    <ArenaCard
                      image={c.image}
                      name={label}
                      onMouseEnter={(e) =>
                        placePreview(
                          {
                            image: c.image,
                            name: label,
                            text: [
                              zh ? c.typeLineZh || c.typeLine : c.typeLine,
                              c.power != null ? `${c.power}/${c.toughness}` : null,
                              zh ? c.oracleTextZh || c.oracleText : c.oracleText,
                            ]
                              .filter(Boolean)
                              .join('\n'),
                          },
                          e,
                        )
                      }
                      onMouseLeave={clearPreview}
                    />
                    {canFb ? (
                      <button
                        type="button"
                        className="btn primary btn-sm"
                        onClick={() => {
                          act({ type: 'CAST_FLASHBACK', gyId: c.instanceId })
                          clearPreview()
                          setInspect(null)
                        }}
                      >
                        {t('challenge.castFlashback', {
                          cost: c.flashback!.manaCost,
                        })}
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
