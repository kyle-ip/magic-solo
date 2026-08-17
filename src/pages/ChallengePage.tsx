import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import '../styles/arena.css'
import '../styles/llm.css'
import '../styles/cursors.css'
import { ArenaCard } from '../components/challenge/ArenaCard'
import { AttackArrows } from '../components/challenge/AttackArrows'
import { CastStage } from '../components/challenge/CastStage'
import { ChallengePlayShell } from '../components/challenge/ChallengePlayShell'
import { ChallengeSetupView } from '../components/challenge/ChallengeSetupView'
import { DeckRosterModal } from '../components/challenge/DeckRosterModal'
import { CoachTipPanel } from '../components/challenge/CoachTipPanel'
import { LandStack } from '../components/challenge/LandStack'
import { ManaPoolHud } from '../components/challenge/ManaPoolHud'
import { PrimaryActionBar } from '../components/challenge/PrimaryActionBar'
import { PlayerPhaseMark } from '../components/challenge/PlayerPhaseMark'
import { ZonePile } from '../components/challenge/ZonePile'
import { computeBoardDensity } from '../challenge/boardDensity'
import { groupLandStacks } from '../challenge/landStacks'
import { resolvePrimaryAction } from '../challenge/primaryAction'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { PackHeadIconButton } from '../components/PackHeadIconButton'
import { getDeck } from '../data/deckStore'
import { getCardZh } from '../data/locale/cardsZh'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import { coachTipKey } from '../game/coachTip'
import { challengeAttackLinks, FX_HORDE, FX_PLAYER_LIFE } from '../game/fx'
import {
  DEFAULT_PLAYER_DECK,
  findCardDef,
  findCardDefByName,
  getPlayerDeck,
  type PlayerDeckId,
} from '../game/playerDecks'
import { ManaCost } from '../components/ManaCost'
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
import { useArenaScale } from '../hooks/useArenaScale'
import { useBoardPan } from '../hooks/useBoardPan'
import { useHasLlmApiKey } from '../hooks/useLlmSettings'
import {
  preloadChallengeImages,
  type ChallengePreloadProgress,
} from '../utils/preloadChallengeImages'
import {
  useBoardExitGhosts,
  type BoardExitGhost,
} from '../hooks/useBoardExitGhosts'
import {
  rectFromElement,
  useCardFlight,
  type FlightRect,
} from '../hooks/useCardFlight'
import { usePreviewCopyWheel } from '../hooks/usePreviewCopyWheel'
import { CardFlightLayer } from '../components/CardFlightLayer'
import { LlmRichText } from '../components/LlmRichText'
import { preferredAssetUrl } from '../utils/remoteAsset'
import {
  flightImageUrl,
  handDockFallbackRect,
  instanceRect,
  zonePileRect,
} from '../utils/cardFlightDom'
import { isCoarsePointer } from '../utils/motionPrefs'
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

const HAND_DRAG_THRESHOLD_PX = 14

function ChallengeHandCard({
  index,
  instanceId,
  image,
  unaffordable,
  pending,
  selected,
  touchUi,
  flightHidden,
  onCast,
  onPreview,
  onClearPreview,
}: {
  index: number
  instanceId: string
  image: string
  unaffordable: boolean
  pending: boolean
  selected: boolean
  touchUi: boolean
  flightHidden?: boolean
  onCast: (from: FlightRect | null) => void
  onPreview: (point?: { clientX: number; clientY: number }) => void
  onClearPreview: () => void
}) {
  const [ghost, setGhost] = useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  const suppressClickRef = useRef(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    active: boolean
    w: number
    h: number
  } | null>(null)
  const endDragListeners = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      endDragListeners.current?.()
      document.body.classList.remove('is-hand-casting')
    }
  }, [])

  const cleanupDrag = () => {
    endDragListeners.current?.()
    endDragListeners.current = null
    dragRef.current = null
    setGhost(null)
    document.body.classList.remove('is-hand-casting')
  }

  const captureFrom = (target: HTMLElement): FlightRect | null =>
    rectFromElement(target)

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!touchUi || e.button > 0) return
    // Unaffordable: tap for detail only — no cast drag.
    if (unaffordable && !pending) return
    // Touch: press+drag out to cast; tap selects / shows detail.
    e.stopPropagation()
    const target = e.currentTarget
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      // Layout box (not AABB) so fan rotate does not inflate the ghost
      w: target.offsetWidth,
      h: target.offsetHeight,
    }
    suppressClickRef.current = false

    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== ev.pointerId) return
      const dx = ev.clientX - drag.startX
      const dy = ev.clientY - drag.startY
      if (!drag.active) {
        if (dx * dx + dy * dy < HAND_DRAG_THRESHOLD_PX * HAND_DRAG_THRESHOLD_PX) {
          return
        }
        drag.active = true
        suppressClickRef.current = true
        try {
          target.setPointerCapture(ev.pointerId)
        } catch {
          /* ignore */
        }
        document.body.classList.add('is-hand-casting')
        onClearPreview()
      }
      ev.preventDefault()
      setGhost({ x: ev.clientX, y: ev.clientY, w: drag.w, h: drag.h })
    }

    const onUp = (ev: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== ev.pointerId) return
      const wasActive = drag.active
      const startY = drag.startY
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const inHand = Boolean(el?.closest?.('.hand-dock'))
      const draggedUp = ev.clientY < startY - 40
      const from: FlightRect | null = wasActive
        ? {
            left: ev.clientX - drag.w / 2,
            top: ev.clientY - drag.h / 2,
            width: drag.w,
            height: drag.h,
          }
        : captureFrom(target)
      cleanupDrag()
      try {
        if (target.hasPointerCapture(ev.pointerId)) {
          target.releasePointerCapture(ev.pointerId)
        }
      } catch {
        /* ignore */
      }
      if (wasActive && (!inHand || draggedUp)) {
        onCast(from)
      }
    }

    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    endDragListeners.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }

  return (
    <>
      <button
        type="button"
        data-instance-id={instanceId}
        className={`hand-card${unaffordable ? ' is-disabled' : ' is-playable'}${
          pending ? ' is-pending' : ''
        }${selected ? ' is-selected' : ''}${ghost ? ' is-hand-drag-source' : ''}${
          flightHidden ? ' is-flight-hidden' : ''
        }`}
        style={{ '--i': index } as CSSProperties}
        aria-disabled={unaffordable && !pending ? true : undefined}
        onPointerDown={onPointerDown}
        onClick={(e) => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false
            return
          }
          if (touchUi) {
            // Tap = select + detail only (never cast).
            onPreview()
            return
          }
          if (unaffordable && !pending) return
          onCast(captureFrom(e.currentTarget))
        }}
        onMouseEnter={
          touchUi
            ? undefined
            : (e) => onPreview({ clientX: e.clientX, clientY: e.clientY })
        }
        onMouseLeave={touchUi ? undefined : onClearPreview}
      >
        <span className="hand-card-face">
          <CardImage localPath={image} kind="normal" alt="" draggable={false} />
        </span>
      </button>
      {ghost
        ? createPortal(
            <div
              className="hand-cast-ghost"
              style={{
                left: ghost.x,
                top: ghost.y,
                width: ghost.w,
                height: ghost.h,
              }}
              aria-hidden
            >
              <CardImage localPath={image} kind="normal" alt="" draggable={false} />
            </div>,
            document.body,
          )
        : null}
    </>
  )
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
  const [assetsReady, setAssetsReady] = useState(false)
  const assetLoadGenRef = useRef(0)
  const assetsReadyRef = useRef(false)
  const warmPromiseRef = useRef<Promise<ChallengePreloadProgress> | null>(null)
  const [focusAttacker, setFocusAttacker] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    image: string
    name: string
    text?: string
    instanceId?: string
  } | null>(null)
  const [previewZoom, setPreviewZoom] = useState(false)
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
  const [handOpen, setHandOpen] = useState(false)
  const [handPinned, setHandPinned] = useState(false)
  const [touchHandUi, setTouchHandUi] = useState(false)
  const handShellRef = useRef<HTMLDivElement | null>(null)
  const coachAbortRef = useRef<AbortController | null>(null)
  const reportAbortRef = useRef<AbortController | null>(null)
  const postAskAbortRef = useRef<AbortController | null>(null)
  const settlementIdRef = useRef<string | null>(null)
  const arenaRef = useRef<HTMLElement | null>(null)
  const boardStageRef = useRef<HTMLDivElement | null>(null)
  const boardPanRef = useRef<HTMLDivElement | null>(null)
  const playing = state.status !== 'setup'
  useArenaScale(arenaRef, playing)

  const over =
    state.status === 'won' || state.status === 'lost'
  const inCombat =
    playing &&
    state.activeSide === 'player' &&
    state.playerPhase === 'combat' &&
    !over
  const landStacks = groupLandStacks(state.player.lands)
  const boardDensity = computeBoardDensity({
    creatureCount: state.player.creatures.length,
    landCount: state.player.lands.length,
    landStackCount: landStacks.length,
    opponentCount: state.challenge.battlefield.length,
  })
  const boardPan = useBoardPan(boardStageRef, boardPanRef, playing)

  useEffect(() => {
    // Keep SiteHeader on setup; hide chrome only while the board is active.
    setHideSiteChrome(playing)
    document.documentElement.classList.toggle('is-arena-playing', playing)
    document.documentElement.classList.toggle('is-challenge-fit', playing)
    return () => {
      setHideSiteChrome(false)
      document.documentElement.classList.remove('is-arena-playing')
      document.documentElement.classList.remove('is-challenge-fit')
    }
  }, [playing])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(hover: none), (pointer: coarse)')
    const sync = () => {
      const coarse = mq.matches
      setTouchHandUi(coarse)
      document.documentElement.classList.toggle('is-touch-ui', coarse)
      if (coarse) setHandPinned(false)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => {
      mq.removeEventListener('change', sync)
      document.documentElement.classList.remove('is-touch-ui')
    }
  }, [])

  useEffect(() => {
    if (!playing) {
      setHandOpen(false)
      setHandPinned(false)
      setPreview(null)
    }
  }, [playing])

  useEffect(() => {
    if (!handOpen && !handPinned && !preview) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHandOpen(false)
        setHandPinned(false)
        setPreview(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handOpen, handPinned, preview])

  useEffect(() => {
    if (!handOpen || handPinned || !touchHandUi) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && handShellRef.current?.contains(target)) return
      // Keep the hand open while the text detail pane is up
      if (preview) return
      setHandOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [handOpen, handPinned, touchHandUi, preview])

  const toggleHandPin = useCallback(() => {
    if (handPinned) {
      setHandPinned(false)
      setHandOpen(false)
      return
    }
    // Pin alone keeps the hand visible; do not set handOpen or it sticks after unpin.
    setHandPinned(true)
  }, [handPinned])

  const act = useCallback((action: GameAction) => dispatch(action), [])

  const warmChallengeAssets = useCallback(() => {
    const gen = ++assetLoadGenRef.current
    assetsReadyRef.current = false
    setAssetsReady(false)
    setAssetProgress({ done: 0, total: 0 })

    const run = preloadChallengeImages(
      { code, playerDeckId, heroIds },
      (progress) => {
        if (gen !== assetLoadGenRef.current) return
        setAssetProgress(progress)
      },
    )
    warmPromiseRef.current = run

    void run.finally(() => {
      if (gen !== assetLoadGenRef.current) return
      assetsReadyRef.current = true
      setAssetsReady(true)
      warmPromiseRef.current = null
    })

    return run
  }, [code, heroIds, playerDeckId])

  // Soft-warm while the player configures setup (overlay only on Begin).
  useEffect(() => {
    if (state.status !== 'setup') return
    warmChallengeAssets()
  }, [state.status, warmChallengeAssets])

  const beginChallenge = useCallback(async () => {
    if (assetLoading) return
    setAssetLoading(true)
    try {
      if (!assetsReadyRef.current) {
        await (warmPromiseRef.current ?? warmChallengeAssets())
      }
      if (!assetsReadyRef.current) {
        await warmChallengeAssets()
      }
      if (!assetsReadyRef.current) return
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
    } finally {
      setAssetLoading(false)
    }
  }, [
    act,
    assetLoading,
    code,
    heads,
    heroIds,
    hordeDelay,
    playerDeckId,
    warmChallengeAssets,
  ])

  const advance = useCallback(() => act({ type: 'ADVANCE' }), [act])

  const clearPreviewTimer = useRef(0)
  const previewPaneRef = useRef<HTMLElement | null>(null)
  const previewPointerRef = useRef({ x: 16, y: 72 })

  const clearPreview = useCallback(() => {
    window.clearTimeout(clearPreviewTimer.current)
    // Delay hide so moving between cards does not flash the preview away
    clearPreviewTimer.current = window.setTimeout(() => {
      setPreview(null)
      setPreviewZoom(false)
    }, 160)
  }, [])

  const dismissPreview = useCallback(() => {
    window.clearTimeout(clearPreviewTimer.current)
    setPreview(null)
    setPreviewZoom(false)
  }, [])

  const placePreview = useCallback(
    (
      next: { image: string; name: string; text?: string; instanceId?: string },
      point?: { clientX: number; clientY: number } | null,
    ) => {
      window.clearTimeout(clearPreviewTimer.current)
      setPreview(next)
      if (point) {
        previewPointerRef.current = { x: point.clientX, y: point.clientY }
        const el = previewPaneRef.current
        setPreviewPos(
          clampPreviewPosition(point.clientX, point.clientY, {
            paneW: el?.offsetWidth || 340,
            paneH: el?.offsetHeight || 560,
          }),
        )
      }
    },
    [],
  )

  const toggleTouchPreview = useCallback(
    (next: { image: string; name: string; text?: string; instanceId?: string }) => {
      setPreviewZoom(false)
      setPreview((prev) => {
        window.clearTimeout(clearPreviewTimer.current)
        if (next.instanceId && prev?.instanceId === next.instanceId) return null
        if (!next.instanceId && prev?.image === next.image && prev?.name === next.name) {
          return null
        }
        return next
      })
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
      const payload = {
        image: card.image,
        name: zhCard?.name ?? card.name,
        text: zhCard
          ? `${zhCard.typeLine}\n${zhCard.oracleText}`
          : `${card.typeLine}\n${card.oracleText}`,
        instanceId: card.instanceId,
      }
      if (touchHandUi) {
        toggleTouchPreview(payload)
        return
      }
      placePreview(payload, point)
    },
    [zh, code, placePreview, toggleTouchPreview, touchHandUi],
  )

  const bindCardPreview = useCallback(
    (card: CardInstance) =>
      touchHandUi
        ? {
            onLongPress: () => previewChallengeCard(card),
          }
        : {
            onMouseEnter: (
              e: { clientX: number; clientY: number },
            ) => previewChallengeCard(card, e),
            onMouseLeave: clearPreview,
          },
    [touchHandUi, previewChallengeCard, clearPreview],
  )

  useEffect(() => {
    if (!preview || touchHandUi) return
    const onMove = (e: PointerEvent) => {
      previewPointerRef.current = { x: e.clientX, y: e.clientY }
      const el = previewPaneRef.current
      setPreviewPos(
        clampPreviewPosition(e.clientX, e.clientY, {
          paneW: el?.offsetWidth || 340,
          paneH: el?.offsetHeight || 560,
        }),
      )
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [preview, touchHandUi])

  usePreviewCopyWheel(Boolean(preview), previewPaneRef)

  useEffect(() => {
    if (!preview || !touchHandUi) return
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target
      if (!(el instanceof Element)) return
      if (el.closest('.challenge-preview-pane')) return
      if (el.closest('.card-preview-zoom')) return
      if (el.closest('.hand-card')) return
      if (el.closest('.arena-card')) return
      if (el.closest('.hand-dock-hotzone')) return
      if (el.closest('.prompt-backdrop')) return
      dismissPreview()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [preview, touchHandUi, dismissPreview])

  // After preview mounts / content swaps, re-clamp using measured pane size.
  useEffect(() => {
    if (!preview || touchHandUi) return
    const el = previewPaneRef.current
    if (!el) return
    const reclamp = () => {
      const pt = previewPointerRef.current
      setPreviewPos(
        clampPreviewPosition(pt.x, pt.y, {
          paneW: el.offsetWidth || 340,
          paneH: el.offsetHeight || 560,
        }),
      )
    }
    const raf = requestAnimationFrame(reclamp)
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => reclamp())
        : null
    ro?.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [preview, touchHandUi])

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

  const { flights, enqueue } = useCardFlight()
  const [flightHiddenIds, setFlightHiddenIds] = useState<Set<string>>(
    () => new Set(),
  )
  const prevHandIdsRef = useRef<Set<string>>(new Set())
  const skipDrawFxRef = useRef(true)
  const castFromRectRef = useRef<Map<string, FlightRect>>(new Map())
  const castMetaRef = useRef<
    Map<string, { image: string; kind: string }>
  >(new Map())
  const boardRectCacheRef = useRef<Map<string, FlightRect>>(new Map())
  const boardMetaCacheRef = useRef<
    Map<string, { image: string; zone: BoardExitGhost['zone'] }>
  >(new Map())
  const prevBoardIdsRef = useRef<Set<string>>(new Set())
  const seenExitFlightRef = useRef<Set<string>>(new Set())
  const prevChallengeBfIdsRef = useRef<Set<string>>(new Set())
  const skipChallengeEnterFxRef = useRef(true)
  const prevRevealedIdsRef = useRef<string[]>([])

  const hideDuringFlight = useCallback((id: string) => {
    setFlightHiddenIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const clearFlightHidden = useCallback((id: string) => {
    setFlightHiddenIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  useEffect(() => {
    const nodes: Element[] = []
    for (const id of flightHiddenIds) {
      document
        .querySelectorAll(`[data-instance-id="${CSS.escape(id)}"]`)
        .forEach((el) => {
          el.classList.add('is-flight-hidden')
          nodes.push(el)
        })
    }
    return () => {
      for (const el of nodes) el.classList.remove('is-flight-hidden')
    }
  }, [
    flightHiddenIds,
    state.player.hand,
    state.player.creatures,
    state.player.lands,
    state.challenge.battlefield,
  ])

  // Snapshot board card rects + zone for exit flights (ghosts lag one effect tick).
  useLayoutEffect(() => {
    if (state.status !== 'playing') return
    const next = new Map<string, FlightRect>()
    for (const card of boardExitLive) {
      const r = instanceRect(card.id)
      if (r) next.set(card.id, r)
      boardMetaCacheRef.current.set(card.id, {
        image: card.image,
        zone: card.zone,
      })
    }
    boardRectCacheRef.current = next
  }, [boardExitLive, state.status, boardPan.offset])

  // Draw: library → hand
  useEffect(() => {
    if (state.status !== 'playing') {
      prevHandIdsRef.current = new Set(
        state.player.hand.map((c) => c.instanceId),
      )
      skipDrawFxRef.current = true
      return
    }
    const prev = prevHandIdsRef.current
    const added = state.player.hand.filter((c) => !prev.has(c.instanceId))
    prevHandIdsRef.current = new Set(
      state.player.hand.map((c) => c.instanceId),
    )
    if (skipDrawFxRef.current) {
      skipDrawFxRef.current = false
      return
    }
    if (!added.length) return
    const stagger = isCoarsePointer() ? 55 : 48
    const duration = isCoarsePointer() ? 300 : 400
    added.forEach((card, i) => {
      window.setTimeout(() => {
        hideDuringFlight(card.instanceId)
        enqueue({
          id: `draw-${card.instanceId}-${i}`,
          imageUrl: flightImageUrl(card.image),
          alt: card.name,
          from: () => zonePileRect('player-library'),
          to: () =>
            instanceRect(card.instanceId) ?? handDockFallbackRect(),
          durationMs: duration,
          trail: !isCoarsePointer(),
          onComplete: () => clearFlightHidden(card.instanceId),
        })
      }, i * stagger)
    })
  }, [
    state.player.hand,
    state.status,
    enqueue,
    hideDuringFlight,
    clearFlightHidden,
  ])

  // Cast: hand leave → board / graveyard
  useEffect(() => {
    if (state.status !== 'playing') return
    const pending = castFromRectRef.current
    if (!pending.size) return
    for (const [id, from] of [...pending.entries()]) {
      const stillInHand = state.player.hand.some((c) => c.instanceId === id)
      if (stillInHand) continue
      pending.delete(id)
      const meta = castMetaRef.current.get(id)
      castMetaRef.current.delete(id)
      if (!meta) continue
      const onBoard =
        state.player.creatures.some((c) => c.instanceId === id) ||
        state.player.lands.some((c) => c.instanceId === id)
      hideDuringFlight(id)
      enqueue({
        id: `cast-${id}`,
        imageUrl: flightImageUrl(meta.image),
        from,
        to: () =>
          onBoard
            ? instanceRect(id) ?? zonePileRect('player-graveyard')
            : zonePileRect('player-graveyard'),
        durationMs: isCoarsePointer() ? 300 : 420,
        trail: !isCoarsePointer(),
        onComplete: () => clearFlightHidden(id),
      })
    }
  }, [
    state.player.hand,
    state.player.creatures,
    state.player.lands,
    state.player.graveyard,
    state.status,
    enqueue,
    hideDuringFlight,
    clearFlightHidden,
  ])

  // Clear / leave board → owning side's graveyard
  useEffect(() => {
    if (state.status !== 'playing') {
      prevBoardIdsRef.current = new Set(boardExitLive.map((c) => c.id))
      seenExitFlightRef.current.clear()
      return
    }
    const prev = prevBoardIdsRef.current
    const liveIds = new Set(boardExitLive.map((c) => c.id))
    const gone = [...prev].filter((id) => !liveIds.has(id))
    prevBoardIdsRef.current = liveIds
    for (const id of gone) {
      if (seenExitFlightRef.current.has(id)) continue
      seenExitFlightRef.current.add(id)
      const from = boardRectCacheRef.current.get(id)
      const meta = boardMetaCacheRef.current.get(id)
      const ghost = exitGhosts.find((g) => g.id === id)
      const image = ghost?.image ?? meta?.image
      const zone = ghost?.zone ?? meta?.zone
      if (!from || !image || !zone) continue
      const toPlayer = zone.startsWith('player-')
      enqueue({
        id: `exit-${id}`,
        imageUrl: flightImageUrl(image),
        from,
        to: () =>
          zonePileRect(toPlayer ? 'player-graveyard' : 'challenge-graveyard'),
        durationMs: isCoarsePointer() ? 280 : 380,
        trail: false,
      })
    }
  }, [boardExitLive, exitGhosts, state.status, enqueue])

  // Opponent cast: challenge library → battlefield
  useEffect(() => {
    const challengeCards = boardExitLive.filter((c) =>
      c.zone.startsWith('challenge-'),
    )
    if (state.status !== 'playing') {
      prevChallengeBfIdsRef.current = new Set(challengeCards.map((c) => c.id))
      skipChallengeEnterFxRef.current = true
      return
    }
    const prev = prevChallengeBfIdsRef.current
    const added = challengeCards.filter((c) => !prev.has(c.id))
    prevChallengeBfIdsRef.current = new Set(challengeCards.map((c) => c.id))
    if (skipChallengeEnterFxRef.current) {
      skipChallengeEnterFxRef.current = false
      return
    }
    if (!added.length) return
    const stagger = isCoarsePointer() ? 55 : 48
    const duration = isCoarsePointer() ? 320 : 440
    added.forEach((card, i) => {
      window.setTimeout(() => {
        hideDuringFlight(card.id)
        enqueue({
          id: `opp-cast-${card.id}-${i}`,
          imageUrl: flightImageUrl(card.image),
          alt: card.name,
          from: () => zonePileRect('challenge-library'),
          to: () =>
            instanceRect(card.id) ?? zonePileRect('challenge-library'),
          durationMs: duration,
          trail: !isCoarsePointer(),
          onComplete: () => clearFlightHidden(card.id),
        })
      }, i * stagger)
    })
  }, [
    boardExitLive,
    state.status,
    enqueue,
    hideDuringFlight,
    clearFlightHidden,
  ])

  // Opponent spells: after CastStage resolve into challenge graveyard
  useEffect(() => {
    if (state.status !== 'playing') {
      prevRevealedIdsRef.current = state.revealed.map((c) => c.instanceId)
      return
    }
    const prev = prevRevealedIdsRef.current
    const nextIds = state.revealed.map((c) => c.instanceId)
    const left = prev.filter((id) => !nextIds.includes(id))
    prevRevealedIdsRef.current = nextIds
    for (const id of left) {
      const inGy = state.challenge.graveyard.find((c) => c.instanceId === id)
      if (!inGy) continue
      // Permanents on the battlefield are handled by the enter-BF flight above.
      if (state.challenge.battlefield.some((c) => c.instanceId === id)) continue
      enqueue({
        id: `opp-spell-${id}`,
        imageUrl: flightImageUrl(inGy.image),
        alt: inGy.name,
        from: () => zonePileRect('challenge-library'),
        to: () => zonePileRect('challenge-graveyard'),
        durationMs: isCoarsePointer() ? 280 : 400,
        trail: !isCoarsePointer(),
      })
    }
  }, [
    state.revealed,
    state.challenge.graveyard,
    state.challenge.battlefield,
    state.status,
    enqueue,
  ])

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

  const heroArt = deck.heroArt
  const attackables = state.player.creatures.filter(
    (c) => !c.tapped && !c.summoningSickness,
  )
  const allAttackersAimed =
    state.code === 'tbth' ||
    state.selectedAttackers.every((id) => Boolean(state.attackAssignments[id]))
  const combatStep: 'pick' | 'aim' | 'resolve' =
    state.selectedAttackers.length === 0
      ? 'pick'
      : state.code !== 'tbth' &&
          state.selectedAttackers.some((id) => !state.attackAssignments[id])
        ? 'aim'
        : 'resolve'
  const primaryAction = resolvePrimaryAction({
    activeSide: state.activeSide,
    over,
    awaitingAdvance: state.awaitingAdvance,
    playerPhase: state.playerPhase,
    attackableCount: attackables.length,
    selectedAttackerCount: state.selectedAttackers.length,
    allAttackersAimed,
    code: state.code,
    pendingCast: Boolean(state.pendingCast),
    combatStep: state.playerPhase === 'combat' ? combatStep : undefined,
  })
  const onPrimaryAction = () => {
    switch (primaryAction.kind) {
      case 'advance':
        advance()
        break
      case 'enter_combat':
        enterCombat()
        break
      case 'resolve_combat':
        act({ type: 'RESOLVE_ATTACKS' })
        break
      case 'end_turn':
        setFocusAttacker(null)
        act({ type: 'END_TURN' })
        break
      default:
        break
    }
  }

  if (state.status === 'setup') {
    return (
      <ChallengeSetupView
        code={code}
        theme={deck.theme}
        title={meta?.name ?? deck.name}
        zh={zh}
        assetLoading={assetLoading}
        assetProgress={assetProgress}
        assetsReady={assetsReady}
        heads={heads}
        hordeDelay={hordeDelay}
        heroIds={heroIds}
        playerDeckId={playerDeckId}
        background={
          <RemoteArtBackground className="arena-bg" localPath={heroArt} kind="art_crop" />
        }
        onHeads={setHeads}
        onHordeDelay={setHordeDelay}
        onToggleHero={(id) => {
          setHeroIds((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id)
            if (prev.length >= maxHeroesFor(code)) return prev
            return [...prev, id]
          })
        }}
        onPickDeck={setPlayerDeckId}
        onViewRoster={setRosterModalId}
        onBegin={() => void beginChallenge()}
        rosterModal={
          rosterModalId ? (
            <DeckRosterModal
              deckId={rosterModalId}
              code={code}
              zh={zh}
              onClose={() => setRosterModalId(null)}
              onSelect={setPlayerDeckId}
            />
          ) : null
        }
      />
    )
  }

  const forceName = zh
    ? getPlayerDeck(state.playerDeckId).nameZh
    : getPlayerDeck(state.playerDeckId).name
  const challengeName = meta?.name ?? deck.name

  return (
    <ChallengePlayShell
      theme={deck.theme}
      rootRef={arenaRef}
      style={{ '--bf-density': String(boardDensity.density) } as CSSProperties}
    >
      <CardFlightLayer flights={flights} />
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
      <AttackArrows
        rootRef={arenaRef}
        links={attackLinks}
        panOffset={boardPan.offset}
        resolving={state.fx?.kind === 'attack'}
      />

      <div
        ref={boardStageRef}
        className={`arena-board-stage${boardPan.dragging ? ' is-dragging' : ''}`}
        onPointerDown={boardPan.onPointerDown}
      >
        <div
          ref={boardPanRef}
          className="arena-board-pan"
          style={
            {
              transform: `translate(${boardPan.offset.x}px, ${boardPan.offset.y}px)`,
            } as CSSProperties
          }
        >
          <div
            className={`arena-battlefield ${inCombat ? 'is-combat' : ''}`}
          >
            <section className="bf-half bf-half-opponent bf-row opponent-row">
              <div className="bf-board is-opponent">
                {/* Always reserve two rows so card size matches the player half */}
                <div className="bf-lands bf-row-reserve" aria-hidden="true" />
                <div className={`bf-creatures${boardDensity.opponentClass}`}>
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
                  {...bindCardPreview(card)}
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
                    {...bindCardPreview(card)}
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

            <div className="bf-half-divider" aria-hidden="true" />

            <section className="bf-half bf-half-player bf-row player-row">
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
                        onMouseEnter={
                          touchHandUi
                            ? undefined
                            : (e) =>
                                placePreview(
                                  {
                                    image: def?.image || h.image || '',
                                    name: zh ? (def?.nameZh ?? h.name) : h.name,
                                    text: zh
                                      ? `${def?.typeLineZh ?? ''}\n${def?.oracleTextZh ?? h.oracleText}`
                                      : `${def?.typeLine ?? 'Hero'}\n${h.oracleText}`,
                                    instanceId: h.instanceId,
                                  },
                                  e,
                                )
                        }
                        onMouseLeave={touchHandUi ? undefined : clearPreview}
                        onClick={
                          touchHandUi
                            ? () =>
                                toggleTouchPreview({
                                  image: def?.image || h.image || '',
                                  name: zh ? (def?.nameZh ?? h.name) : h.name,
                                  text: zh
                                    ? `${def?.typeLineZh ?? ''}\n${def?.oracleTextZh ?? h.oracleText}`
                                    : `${def?.typeLine ?? 'Hero'}\n${h.oracleText}`,
                                  instanceId: h.instanceId,
                                })
                            : undefined
                        }
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
              <div className={`bf-creatures${boardDensity.creatureClass}`}>
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
                  onMouseEnter={
                    touchHandUi
                      ? undefined
                      : (e) => {
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
                              instanceId: c.instanceId,
                            },
                            e,
                          )
                        }
                  }
                  onMouseLeave={touchHandUi ? undefined : clearPreview}
                  onLongPress={
                    touchHandUi
                      ? () => {
                          const tpl = findCardDef(c.defId, state.playerDeckId)
                          toggleTouchPreview({
                            image: c.image,
                            name: label,
                            text: tpl
                              ? `${zh ? tpl.typeLineZh : tpl.typeLine}\n${power}/${toughness}${
                                  enhLabel ? ` (${enhLabel})` : ''
                                }\n${zh ? tpl.oracleTextZh : tpl.oracleText}`
                              : `${power}/${toughness}`,
                            instanceId: c.instanceId,
                          })
                        }
                      : undefined
                  }
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
                <div className={`bf-lands${boardDensity.landClass}`}>
                  {landStacks.map((stack) => {
                    const label = zh
                      ? (findCardDef(stack.defId, state.playerDeckId)?.nameZh ?? stack.name)
                      : stack.name
                    return (
                      <LandStack
                        key={stack.key}
                        stack={stack}
                        label={label}
                        onPreview={placePreview}
                        onClearPreview={clearPreview}
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
        </div>
      </div>

      <div className="arena-chrome-layer">
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
            dataZone="challenge-graveyard"
            onClick={() => setInspect('graveyard')}
          />
          <div className="zone-pile-wrap" data-instance-id={FX_HORDE}>
            <ZonePile
              label={t('challenge.library')}
              count={state.challenge.library.length}
              kind="library"
              dataZone="challenge-library"
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

      {state.fx ? (
        <div className={`fx-toast kind-${state.fx.kind}`} key={state.fx.id}>
          {state.fx.label ?? state.fx.kind}
          {state.fx.amount != null ? ` ${state.fx.amount}` : ''}
        </div>
      ) : null}

      {coachOn && state.status === 'playing' ? (
        <CoachTipPanel label={t('challenge.tipLabel')}>
          {hasLlmKey && llmTip ? <LlmRichText text={llmTip} inline /> : staticTip}
        </CoachTipPanel>
      ) : null}

      <div className="player-dock">
        <div className="arena-player-chrome is-you challenge-zone-piles">
          <div className="player-life-stack">
            <PlayerPhaseMark
              phase={state.playerPhase}
              active={state.activeSide === 'player' && !over}
              combatStepLabel={
                inCombat
                  ? combatStep === 'pick'
                    ? t('challenge.combatStep.pick')
                    : combatStep === 'aim'
                      ? state.code === 'tbth'
                        ? t('challenge.combatStep.aimHorde')
                        : t('challenge.combatStep.aim')
                      : t('challenge.combatStep.resolve')
                  : null
              }
            />
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
          </div>
          <ZonePile
            label={t('challenge.graveyard')}
            count={state.player.graveyard.length}
            kind="graveyard"
            dataZone="player-graveyard"
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
              dataZone="player-library"
            />
          </div>
          <ManaPoolHud pool={state.player.manaPool} />
        </div>

        <div
          ref={handShellRef}
          className={`hand-dock-shell${handOpen ? ' is-hand-open' : ''}${
            handPinned ? ' is-hand-pinned' : ''
          }`}
        >
          <button
            type="button"
            className="hand-dock-hotzone"
            aria-label={
              handOpen || handPinned ? t('challenge.handHide') : t('challenge.handReveal')
            }
            aria-expanded={handOpen || handPinned}
            tabIndex={touchHandUi ? 0 : -1}
            onClick={() => {
              if (!touchHandUi) return
              if (handOpen) dismissPreview()
              setHandOpen((open) => !open)
            }}
          >
            {touchHandUi && !handOpen ? (
              <span className="hand-dock-hotzone-label">
                {t('challenge.handCount', { n: state.player.hand.length })}
              </span>
            ) : null}
          </button>
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
                const selected = preview?.instanceId === card.instanceId
                const previewPayload = {
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
                  instanceId: card.instanceId,
                }
                return (
                  <ChallengeHandCard
                    key={card.instanceId}
                    index={i}
                    instanceId={card.instanceId}
                    unaffordable={unaffordable}
                    pending={pending}
                    selected={selected}
                    touchUi={touchHandUi}
                    flightHidden={flightHiddenIds.has(card.instanceId)}
                    image={card.image}
                    onCast={(from) => {
                      if (pending) {
                        castFromRectRef.current.delete(card.instanceId)
                        castMetaRef.current.delete(card.instanceId)
                        act({ type: 'CANCEL_PENDING' })
                        return
                      }
                      if (unaffordable) return
                      dismissPreview()
                      if (from) castFromRectRef.current.set(card.instanceId, from)
                      castMetaRef.current.set(card.instanceId, {
                        image: card.image,
                        kind: card.kind,
                      })
                      act({ type: 'CAST', handId: card.instanceId })
                    }}
                    onPreview={(point) => {
                      if (touchHandUi) toggleTouchPreview(previewPayload)
                      else placePreview(previewPayload, point)
                    }}
                    onClearPreview={clearPreview}
                  />
                )
              })}
              {!touchHandUi ? (
                <button
                  type="button"
                  className={`hand-pin-btn${handPinned ? ' is-pinned' : ''}`}
                  aria-pressed={handPinned}
                  aria-label={handPinned ? t('challenge.handUnpin') : t('challenge.handPin')}
                  title={handPinned ? t('challenge.handUnpin') : t('challenge.handPin')}
                  onClick={toggleHandPin}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    {handPinned ? (
                      <path
                        fill="currentColor"
                        d="M16 4v4.3l2.4 2.4c.4.4.6.9.6 1.4V14h-4.2l-.3 6h-1l-.3-6H9v-1.9c0-.5.2-1 .6-1.4L12 8.3V4h4zm-1 1h-2v3.7l-2.6 2.6c-.1.1-.2.3-.2.4V13h7.6v-.3c0-.1-.1-.3-.2-.4L15 8.7V5z"
                      />
                    ) : (
                      <path
                        fill="currentColor"
                        d="M15.5 3.5 14 5v4.2l2.6 2.6c.5.5.8 1.2.8 1.9V15h-4.1L13 21h-2l-.3-6H7v-1.3c0-.7.3-1.4.8-1.9L10.5 9.2V5L9 3.5 10.5 2h5l1.5 1.5z"
                      />
                    )}
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <PrimaryActionBar
          action={primaryAction}
          onPrimary={onPrimaryAction}
          onCancelCombat={cancelCombat}
          onCancelTarget={() => act({ type: 'CANCEL_PENDING' })}
          onEndTurn={() => {
            setFocusAttacker(null)
            act({ type: 'END_TURN' })
          }}
          above={
            boardPan.offCenter ? (
              <button
                type="button"
                className="btn ghost arena-recenter-btn"
                onClick={boardPan.resetPan}
                aria-label={t('challenge.recenterBoard')}
                title={t('challenge.recenterBoard')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M12 2a1 1 0 0 1 1 1v1.07A8.001 8.001 0 0 1 19.93 11H21a1 1 0 1 1 0 2h-1.07A8.001 8.001 0 0 1 13 19.93V21a1 1 0 1 1-2 0v-1.07A8.001 8.001 0 0 1 4.07 13H3a1 1 0 1 1 0-2h1.07A8.001 8.001 0 0 1 11 4.07V3a1 1 0 0 1 1-1zm0 4a6 6 0 1 0 0 12A6 6 0 0 0 12 6zm0 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"
                  />
                </svg>
              </button>
            ) : null
          }
        />
      </div>
      </div>

      {preview
        ? createPortal(
            <aside
              ref={previewPaneRef}
              className={[
                'card-preview-pane',
                'challenge-preview-pane',
                touchHandUi ? 'is-text-only' : 'is-follow',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={preview.name}
              style={
                touchHandUi
                  ? undefined
                  : ({
                      '--preview-x': `${previewPos.x}px`,
                      '--preview-y': `${previewPos.y}px`,
                    } as CSSProperties)
              }
              onMouseEnter={() => {
                window.clearTimeout(clearPreviewTimer.current)
              }}
              onMouseLeave={() => {
                if (!touchHandUi) clearPreview()
              }}
            >
              <div
                className="card-preview-swap"
                key={`${preview.image}|${preview.name}`}
              >
                {preview.image ? (
                  touchHandUi ? (
                    <button
                      type="button"
                      className="card-preview-art is-zoomable"
                      onClick={() => setPreviewZoom(true)}
                      aria-label={t('challenge.previewOpenLarge')}
                    >
                      <CardImage
                        localPath={preview.image}
                        kind="png"
                        alt={preview.name}
                      />
                    </button>
                  ) : (
                    <div className="card-preview-art">
                      <CardImage
                        localPath={preview.image}
                        kind="png"
                        alt={preview.name}
                      />
                    </div>
                  )
                ) : null}
                <div
                  className="card-preview-copy"
                  key={`copy-${preview.instanceId ?? preview.name}`}
                >
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

      {previewZoom && preview?.image
        ? createPortal(
            <div
              className="card-preview-zoom"
              role="dialog"
              aria-modal="true"
              aria-label={preview.name}
              onClick={() => setPreviewZoom(false)}
            >
              <div
                className="card-preview-zoom-frame"
                onClick={(e) => e.stopPropagation()}
              >
                <CardImage
                  localPath={preview.image}
                  kind="png"
                  alt={preview.name}
                />
              </div>
              <button
                type="button"
                className="btn ghost card-preview-zoom-close"
                onClick={() => setPreviewZoom(false)}
              >
                {t('llm.close')}
              </button>
            </div>,
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
                <p className="block-panel-label">{t('challenge.attackers')}</p>
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
              <Link to="/" className="btn ghost">
                {t('app.home')}
              </Link>
            </div>
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
                  {...bindCardPreview(c)}
                  onClick={touchHandUi ? () => previewChallengeCard(c) : undefined}
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
              <div className="inspect-shell-titles">
                <h2>{t('challenge.graveyard')}</h2>
                <p className="inspect-shell-hint">{t('challenge.flashbackHint')}</p>
              </div>
              <PackHeadIconButton
                icon="close"
                label={t('deck.close')}
                onClick={() => {
                  clearPreview()
                  setInspect(null)
                }}
              />
            </header>
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
                      onMouseEnter={
                        touchHandUi
                          ? undefined
                          : (e) =>
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
                                  instanceId: c.instanceId,
                                },
                                e,
                              )
                      }
                      onMouseLeave={touchHandUi ? undefined : clearPreview}
                      onClick={
                        touchHandUi
                          ? () =>
                              toggleTouchPreview({
                                image: c.image,
                                name: label,
                                text: [
                                  zh ? c.typeLineZh || c.typeLine : c.typeLine,
                                  c.power != null ? `${c.power}/${c.toughness}` : null,
                                  zh ? c.oracleTextZh || c.oracleText : c.oracleText,
                                ]
                                  .filter(Boolean)
                                  .join('\n'),
                                instanceId: c.instanceId,
                              })
                          : undefined
                      }
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
    </ChallengePlayShell>
  )
}