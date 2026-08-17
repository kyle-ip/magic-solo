import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import '../styles/arena.css'
import '../styles/cursors.css'
import type { DragPayload, DropTarget } from '../assistant/dnd'
import { createAssistantReducer } from '../assistant/reducer'
import { createInitialSetup } from '../assistant/setup'
import {
  MAX_BOARD_CELLS,
  MAX_BOARD_COLS,
  MAX_BOARD_ROWS,
  boardBounds,
} from '../assistant/layouts'
import type { AssistantAction, AssistantCard } from '../assistant/types'
import { ContextMenu, type ContextMenuItem } from '../components/assistant/ContextMenu'
import { DropZone } from '../components/assistant/DropZone'
import { LibrarySearchModal } from '../components/assistant/LibrarySearchModal'
import { NamedValuesEditor } from '../components/assistant/NamedValuesEditor'
import { PackHeadIconButton } from '../components/PackHeadIconButton'
import { findDropAttr, usePointerDrag } from '../components/assistant/usePointerDrag'
import { AssistantLlmAdvisor } from '../components/AssistantLlmAdvisor'
import { AssistantProcedurePanel } from '../components/assistant/AssistantProcedurePanel'
import { ArenaCard } from '../components/challenge/ArenaCard'
import { ZonePile } from '../components/challenge/ZonePile'
import { CardFlightLayer } from '../components/CardFlightLayer'
import {
  ArenaToolButton,
  arenaToolIcons,
} from '../components/ArenaToolButton'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { AppOverlay, UiButton } from '../components/ui'
import { getDeck } from '../data/deckStore'
import {
  clearAssistantSave,
  loadAssistantSave,
  saveAssistantSave,
} from '../data/sessionSave'
import { getCardZh } from '../data/locale/cardsZh'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import type { ChallengeCode } from '../game/types'
import { defsFromDeck } from '../game/types'
import { DeckAtmosphere } from '../components/DeckAtmosphere'
import { SetupPreloadOverlay } from '../components/challenge/SetupPreloadOverlay'
import { CardImage } from '../hooks/useCardImageSrc'
import { useArenaScale } from '../hooks/useArenaScale'
import { useBoardPan } from '../hooks/useBoardPan'
import {
  rectFromElement,
  useCardFlight,
  type FlightRect,
} from '../hooks/useCardFlight'
import { usePreviewCopyWheel } from '../hooks/usePreviewCopyWheel'
import { preferredAssetUrl } from '../utils/remoteAsset'
import { setHideSiteChrome } from '../utils/siteChrome'
import {
  flightImageUrl,
  instanceRect,
  zonePileRect,
} from '../utils/cardFlightDom'
import { isCoarsePointer } from '../utils/motionPrefs'
import { clampPreviewPosition } from '../utils/previewFollow'
import {
  preloadAssistantImages,
  type ImagePreloadProgress,
} from '../utils/preloadChallengeImages'

const CODES: ChallengeCode[] = ['tfth', 'tbth', 'tdag']

export function AssistantPage() {
  const { setCode = '' } = useParams()
  const code = setCode.toLowerCase() as ChallengeCode
  if (!CODES.includes(code)) return <Navigate to="/" replace />
  return <AssistantGame key={code} code={code} />
}

function AssistantGame({ code }: { code: ChallengeCode }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const deck = getDeck(code)
  const metaTable = i18n.language.startsWith('zh') ? deckMetaZh : deckMetaEn
  const meta = metaTable[code]
  const zh = i18n.language.startsWith('zh')
  const lifeLabel = t('assistant.defaultLife')

  const defs = useMemo(() => (deck ? defsFromDeck(deck.cards) : []), [deck])

  const reducer = useMemo(
    () =>
      createAssistantReducer({
        defs,
        lifeLabel,
      }),
    [defs, lifeLabel],
  )

  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialSetup(code, deck?.theme ?? 'hydra', lifeLabel),
  )
  const stateRef = useRef(state)
  stateRef.current = state
  const pendingResumeRef = useRef(loadAssistantSave(code))
  const [resumePromptOpen, setResumePromptOpen] = useState(
    () => pendingResumeRef.current != null,
  )

  const act = useCallback(
    (action: AssistantAction) => {
      if (action.type === 'RESET') clearAssistantSave(code)
      dispatch(action)
    },
    [code],
  )

  useEffect(() => {
    if (state.status !== 'playing') return
    const timer = window.setTimeout(() => {
      saveAssistantSave(code, state)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [state, code])

  useEffect(() => {
    return () => {
      if (stateRef.current.status === 'playing') {
        saveAssistantSave(code, stateRef.current)
      }
    }
  }, [code])

  const [assetLoading, setAssetLoading] = useState(false)
  const [assetProgress, setAssetProgress] = useState<ImagePreloadProgress>({
    done: 0,
    total: 0,
  })
  const [assetsReady, setAssetsReady] = useState(false)
  const assetLoadGenRef = useRef(0)
  const assetsReadyRef = useRef(false)
  const warmPromiseRef = useRef<Promise<ImagePreloadProgress> | null>(null)
  const enterGenRef = useRef(0)
  const arenaRef = useRef<HTMLElement | null>(null)
  const boardStageRef = useRef<HTMLDivElement | null>(null)
  const boardPanRef = useRef<HTMLDivElement | null>(null)
  const playing = state.status === 'playing'
  useArenaScale(arenaRef, playing)
  const boardPan = useBoardPan(boardStageRef, boardPanRef, playing)

  const discardResume = useCallback(() => {
    if (assetLoading) return
    clearAssistantSave(code)
    pendingResumeRef.current = null
    setResumePromptOpen(false)
  }, [assetLoading, code])

  useEffect(() => {
    // Keep SiteHeader on setup; hide chrome only while the board is active.
    setHideSiteChrome(playing)
    document.documentElement.classList.toggle('is-arena-playing', playing)
    document.documentElement.classList.toggle('is-assistant-fit', playing)
    return () => {
      setHideSiteChrome(false)
      document.documentElement.classList.remove('is-arena-playing')
      document.documentElement.classList.remove('is-assistant-fit')
    }
  }, [playing])

  const warmAssistantAssets = useCallback(() => {
    const gen = ++assetLoadGenRef.current
    assetsReadyRef.current = false
    setAssetsReady(false)
    setAssetProgress({ done: 0, total: 0 })
    const run = preloadAssistantImages(code, (progress) => {
      if (gen !== assetLoadGenRef.current) return
      setAssetProgress(progress)
    })
    warmPromiseRef.current = run
    void run.finally(() => {
      if (gen !== assetLoadGenRef.current) return
      assetsReadyRef.current = true
      setAssetsReady(true)
      warmPromiseRef.current = null
    })
    return run
  }, [code])

  useEffect(() => {
    if (state.status !== 'setup') return
    warmAssistantAssets()
  }, [state.status, warmAssistantAssets])

  const beginAssistant = useCallback(async () => {
    if (assetLoading) return
    const enterGen = ++enterGenRef.current
    setAssetLoading(true)
    try {
      if (!assetsReadyRef.current) {
        await (warmPromiseRef.current ?? warmAssistantAssets())
      }
      if (enterGen !== enterGenRef.current) return
      if (!assetsReadyRef.current) {
        await warmAssistantAssets()
      }
      if (enterGen !== enterGenRef.current) return
      if (!assetsReadyRef.current) return
      act({ type: 'START' })
    } finally {
      if (enterGen === enterGenRef.current) {
        setAssetLoading(false)
      }
    }
  }, [act, assetLoading, warmAssistantAssets])

  const cancelAssetLoading = useCallback(() => {
    enterGenRef.current += 1
    setAssetLoading(false)
  }, [])

  const resumeAssistant = useCallback(async () => {
    const saved = pendingResumeRef.current
    if (!saved || assetLoading) return
    // Keep the dialog up until HYDRATE leaves setup to avoid a setup-page flash.
    const enterGen = ++enterGenRef.current
    setAssetLoading(true)
    try {
      if (!assetsReadyRef.current) {
        await (warmPromiseRef.current ?? warmAssistantAssets())
      }
      if (enterGen !== enterGenRef.current) return
      if (!assetsReadyRef.current) {
        await warmAssistantAssets()
      }
      if (enterGen !== enterGenRef.current) return
      if (!assetsReadyRef.current) return
      pendingResumeRef.current = null
      setResumePromptOpen(false)
      act({ type: 'HYDRATE', state: saved })
    } finally {
      if (enterGen === enterGenRef.current) {
        setAssetLoading(false)
      }
    }
  }, [act, assetLoading, warmAssistantAssets])

  const [previewPos, setPreviewPos] = useState({ x: 16, y: 72 })
  const localizeName = useCallback(
    (name: string) => {
      if (!zh) return name
      return getCardZh(code, name)?.name ?? name
    },
    [zh, code],
  )

  const localizeCardText = useCallback(
    (card: AssistantCard) => {
      const zhCard = zh ? getCardZh(code, card.name) : null
      const typeLine = zhCard?.typeLine ?? card.typeLine
      const oracle = zhCard?.oracleText ?? card.oracleText
      return `${typeLine}\n${oracle}`
    },
    [zh, code],
  )

  const [searchOpen, setSearchOpen] = useState(false)
  const [inspect, setInspect] = useState<'graveyard' | 'exile' | null>(null)
  const drawClickTimer = useRef<number | null>(null)
  const [preview, setPreview] = useState<{
    image: string
    name: string
    text: string
    instanceId?: string
  } | null>(null)
  const [menu, setMenu] = useState<{
    x: number
    y: number
    card: AssistantCard
  } | null>(null)
  const [noteEditId, setNoteEditId] = useState<string | null>(null)
  /** Which blank-board seat shows +/−. */
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null)
  /** Desktop: after add/remove, ignore hover until the pointer leaves the seat. */
  const suppressSeatHoverRef = useRef(false)

  const [coarsePointer, setCoarsePointer] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(hover: none), (pointer: coarse)')
    const sync = () => setCoarsePointer(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const previewCard = useCallback(
    (
      card: AssistantCard,
      point?: { clientX: number; clientY: number } | null,
    ) => {
      setPreview({
        image: card.image,
        name: localizeName(card.name),
        text: localizeCardText(card),
        instanceId: card.instanceId,
      })
      if (point) {
        setPreviewPos(clampPreviewPosition(point.clientX, point.clientY))
      }
    },
    [localizeName, localizeCardText],
  )
  const clearPreview = useCallback(() => setPreview(null), [])
  const previewPaneRef = useRef<HTMLElement | null>(null)
  usePreviewCopyWheel(Boolean(preview) && !coarsePointer, previewPaneRef)

  const { flights, enqueue } = useCardFlight()
  const [flightHiddenIds, setFlightHiddenIds] = useState<Set<string>>(
    () => new Set(),
  )
  const expectDrawRef = useRef(false)
  const prevStagingIdRef = useRef<string | null>(null)
  const pendingMoveRef = useRef<{
    id: string
    image: string
    from: FlightRect
    to:
      | 'battlefield'
      | 'graveyard'
      | 'exile'
      | 'library'
  } | null>(null)

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
  }, [flightHiddenIds, state.staging, state.battlefield])

  const queueMoveFlight = useCallback(
    (
      card: { instanceId: string; image: string },
      to: 'battlefield' | 'graveyard' | 'exile' | 'library',
      fromOverride?: FlightRect | null,
    ) => {
      const from =
        fromOverride ??
        instanceRect(card.instanceId) ??
        zonePileRect('assistant-library')
      if (!from) return
      pendingMoveRef.current = {
        id: card.instanceId,
        image: card.image,
        from,
        to,
      }
    },
    [],
  )

  // Draw: library → staging
  useEffect(() => {
    const id = state.staging?.instanceId ?? null
    if (
      expectDrawRef.current &&
      id &&
      id !== prevStagingIdRef.current &&
      state.staging
    ) {
      expectDrawRef.current = false
      const card = state.staging
      hideDuringFlight(id)
      enqueue({
        id: `asst-draw-${id}`,
        imageUrl: flightImageUrl(card.image),
        from: () => zonePileRect('assistant-library'),
        to: () =>
          instanceRect(id) ??
          rectFromElement(document.querySelector('.assistant-staging')),
        durationMs: isCoarsePointer() ? 280 : 380,
        trail: !isCoarsePointer(),
        onComplete: () => clearFlightHidden(id),
      })
    }
    prevStagingIdRef.current = id
  }, [state.staging, enqueue, hideDuringFlight, clearFlightHidden])

  // MOVE_CARD settle flights
  useEffect(() => {
    const pending = pendingMoveRef.current
    if (!pending) return
    pendingMoveRef.current = null
    const { id, image, from, to } = pending
    hideDuringFlight(id)
    enqueue({
      id: `asst-move-${id}-${to}`,
      imageUrl: flightImageUrl(image),
      from,
      to: () => {
        if (to === 'battlefield') {
          return (
            instanceRect(id) ??
            rectFromElement(document.querySelector('.assistant-board-shell'))
          )
        }
        if (to === 'graveyard') return zonePileRect('assistant-graveyard')
        if (to === 'exile') return zonePileRect('assistant-exile')
        return zonePileRect('assistant-library')
      },
      durationMs: isCoarsePointer() ? 260 : 360,
      trail: to === 'battlefield' && !isCoarsePointer(),
      onComplete: () => clearFlightHidden(id),
    })
  }, [
    state.battlefield,
    state.graveyard,
    state.exile,
    state.library,
    state.staging,
    enqueue,
    hideDuringFlight,
    clearFlightHidden,
  ])

  useEffect(() => {
    if (!preview || coarsePointer) return
    const onMove = (e: PointerEvent) => {
      setPreviewPos(clampPreviewPosition(e.clientX, e.clientY))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [preview, coarsePointer])
  const toggleTouchPreview = useCallback(
    (card: AssistantCard) => {
      setPreview((prev) =>
        prev?.instanceId === card.instanceId
          ? null
          : {
              image: card.image,
              name: localizeName(card.name),
              text: localizeCardText(card),
              instanceId: card.instanceId,
            },
      )
    },
    [localizeName, localizeCardText],
  )

  const onLibraryClick = useCallback(() => {
    if (drawClickTimer.current != null) window.clearTimeout(drawClickTimer.current)
    drawClickTimer.current = window.setTimeout(() => {
      drawClickTimer.current = null
      expectDrawRef.current = true
      act({ type: 'DRAW' })
    }, 220)
  }, [act])

  const onLibraryDoubleClick = useCallback(() => {
    if (drawClickTimer.current != null) {
      window.clearTimeout(drawClickTimer.current)
      drawClickTimer.current = null
    }
    expectDrawRef.current = false
    setSearchOpen(true)
  }, [])

  const resolveDropTarget = useCallback((el: Element | null): DropTarget | null => {
    const node = findDropAttr(el)
    if (!node) return null
    const zone = node.dataset.dropZone
    if (!zone) return null
    if (zone === 'battlefield') {
      const index = node.dataset.dropIndex
      return {
        zone: 'battlefield',
        index: index != null ? Number(index) : undefined,
      }
    }
    if (zone === 'graveyard') return { zone: 'graveyard' }
    if (zone === 'exile') return { zone: 'exile' }
    if (zone === 'library') {
      const placement = node.dataset.dropPlacement === 'top' ? 'top' : 'bottom'
      return { zone: 'library', placement }
    }
    if (zone === 'search') {
      const index = Number(node.dataset.dropIndex ?? 0)
      return { zone: 'search', index }
    }
    return null
  }, [])

  const handleDrop = useCallback(
    (payload: DragPayload, target: DropTarget) => {
      clearPreview()
      if (target.zone === 'search') {
        const from =
          payload.source.zone === 'library' || payload.source.zone === 'search'
            ? payload.source.index
            : state.library.findIndex((c) => c.instanceId === payload.instanceId)
        if (from < 0) return
        act({ type: 'REORDER_LIBRARY', fromIndex: from, toIndex: target.index })
        return
      }
      // Drag already followed the pointer — settle in place without a second flight.
      if (target.zone === 'library') {
        act({
          type: 'MOVE_CARD',
          instanceId: payload.instanceId,
          to: 'library',
          libraryPlacement: target.placement,
        })
        return
      }
      if (target.zone === 'battlefield') {
        act({
          type: 'MOVE_CARD',
          instanceId: payload.instanceId,
          to: 'battlefield',
          index: target.index,
        })
        if (searchOpen && payload.source.zone === 'search') setSearchOpen(false)
        return
      }
      act({
        type: 'MOVE_CARD',
        instanceId: payload.instanceId,
        to: target.zone,
      })
      if (searchOpen && payload.source.zone === 'search') setSearchOpen(false)
    },
    [
      act,
      clearPreview,
      searchOpen,
      state.library,
    ],
  )

  const battlefieldRef = useRef(state.battlefield)
  battlefieldRef.current = state.battlefield
  const coarseRef = useRef(coarsePointer)
  coarseRef.current = coarsePointer

  const { drag, startDrag } = usePointerDrag({
    onDrop: handleDrop,
    resolveDropTarget,
    onTap: (payload) => {
      if (!coarseRef.current) return
      if (payload.source.zone !== 'battlefield') return
      const card = battlefieldRef.current.find(
        (c) => c?.instanceId === payload.instanceId,
      )
      if (card) toggleTouchPreview(card)
    },
  })

  // Dragging skips mouseleave on the source card — clear the hover preview.
  useEffect(() => {
    if (drag) clearPreview()
  }, [drag, clearPreview])

  useEffect(() => {
    if (!preview || !coarsePointer) return
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target
      if (!(el instanceof Element)) return
      if (el.closest('.assistant-card-slot.has-card')) return
      if (el.closest('.assistant-preview-pane')) return
      if (el.closest('.assistant-context-menu')) return
      if (el.closest('.assistant-modal')) return
      if (el.closest('.assistant-modal-backdrop')) return
      clearPreview()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [preview, coarsePointer, clearPreview])

  const openCardMenu = (e: React.MouseEvent, card: AssistantCard) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, card })
  }

  const openCardMenuAt = (card: AssistantCard, x: number, y: number) => {
    setMenu({ x, y, card })
  }

  const menuZone = menu
    ? state.battlefield.some((c) => c?.instanceId === menu.card.instanceId)
      ? 'battlefield'
      : state.exile.some((c) => c.instanceId === menu.card.instanceId)
        ? 'exile'
        : state.graveyard.some((c) => c.instanceId === menu.card.instanceId)
          ? 'graveyard'
          : state.staging?.instanceId === menu.card.instanceId
            ? 'staging'
            : 'library'
    : null

  const menuItems: ContextMenuItem[] = menu
    ? menuZone === 'battlefield'
      ? [
          { id: 'tap', label: t('assistant.toggleTap') },
          { id: 'dmg+', label: t('assistant.damagePlus') },
          { id: 'dmg-', label: t('assistant.damageMinus') },
          { id: 'pt+', label: t('assistant.ptPlus') },
          { id: 'pt-', label: t('assistant.ptMinus') },
          { id: 'note', label: t('assistant.editNote') },
          { id: 'gy', label: t('assistant.moveToGraveyard') },
          { id: 'exile', label: t('assistant.moveToExile') },
          { id: 'top', label: t('assistant.moveToLibraryTop') },
          { id: 'bottom', label: t('assistant.moveToLibraryBottom') },
        ]
      : [
          {
            id: 'battlefield',
            label:
              menuZone === 'exile'
                ? t('assistant.leaveExile')
                : menuZone === 'graveyard'
                  ? t('assistant.leaveGraveyard')
                  : t('assistant.playToBattlefield'),
          },
          { id: 'gy', label: t('assistant.moveToGraveyard') },
          { id: 'exile', label: t('assistant.moveToExile') },
          { id: 'top', label: t('assistant.moveToLibraryTop') },
          { id: 'bottom', label: t('assistant.moveToLibraryBottom') },
        ]
    : []

  const onMenuSelect = (id: string) => {
    if (!menu) return
    const { card } = menu
    if (id === 'tap') act({ type: 'TOGGLE_TAP', instanceId: card.instanceId })
    if (id === 'dmg+')
      act({ type: 'ADJUST_MARKED_DAMAGE', instanceId: card.instanceId, delta: 1 })
    if (id === 'dmg-')
      act({ type: 'ADJUST_MARKED_DAMAGE', instanceId: card.instanceId, delta: -1 })
    if (id === 'pt+')
      act({
        type: 'ADJUST_POWER_TOUGHNESS',
        instanceId: card.instanceId,
        powerDelta: 1,
        toughnessDelta: 1,
      })
    if (id === 'pt-')
      act({
        type: 'ADJUST_POWER_TOUGHNESS',
        instanceId: card.instanceId,
        powerDelta: -1,
        toughnessDelta: -1,
      })
    if (id === 'note') setNoteEditId(card.instanceId)
    if (id === 'battlefield') {
      clearPreview()
      queueMoveFlight(card, 'battlefield')
      act({ type: 'MOVE_CARD', instanceId: card.instanceId, to: 'battlefield' })
    }
    if (id === 'gy' || id === 'clear') {
      clearPreview()
      queueMoveFlight(card, 'graveyard')
      act({ type: 'MOVE_CARD', instanceId: card.instanceId, to: 'graveyard' })
    }
    if (id === 'exile') {
      clearPreview()
      queueMoveFlight(card, 'exile')
      act({ type: 'MOVE_CARD', instanceId: card.instanceId, to: 'exile' })
    }
    if (id === 'top') {
      clearPreview()
      queueMoveFlight(card, 'library')
      act({
        type: 'MOVE_CARD',
        instanceId: card.instanceId,
        to: 'library',
        libraryPlacement: 'top',
      })
    }
    if (id === 'bottom') {
      clearPreview()
      queueMoveFlight(card, 'library')
      act({
        type: 'MOVE_CARD',
        instanceId: card.instanceId,
        to: 'library',
        libraryPlacement: 'bottom',
      })
    }
    setMenu(null)
  }

  const noteCard = state.battlefield.find((c) => c?.instanceId === noteEditId)

  if (!deck) return <Navigate to="/" replace />

  const atmosphere = <DeckAtmosphere deck={deck} />

  if (state.status === 'setup') {
    const preloadPct =
      assetProgress.total > 0
        ? Math.round((assetProgress.done / assetProgress.total) * 100)
        : 0
    return (
      <>
        <main className={`arena-root assistant-root theme-${deck.theme} is-setup`}>
          {atmosphere}
          <div className={`assistant-setup arena-setup${assetLoading ? ' is-preloading' : ''}`}>
            {assetLoading ? (
              <SetupPreloadOverlay
                titleKey="assistant.loadingTitle"
                done={assetProgress.done}
                total={assetProgress.total}
                ns="assistant"
                onCancel={cancelAssetLoading}
              />
            ) : null}
            <h1>{meta?.name ?? deck.name}</h1>
            <p className="lede">{t('assistant.setupLead')}</p>

            <div className="assistant-setup-modes">
              <button
                type="button"
                className={`assistant-setup-card ${state.setupKind === 'blank' ? 'is-selected' : ''}`}
                disabled={assetLoading}
                onClick={() => act({ type: 'SET_SETUP_KIND', kind: 'blank' })}
              >
                <strong>{t('assistant.setupBlank')}</strong>
                <span>{t('assistant.setupBlankHint')}</span>
              </button>
              <button
                type="button"
                className={`assistant-setup-card ${state.setupKind === 'rules' ? 'is-selected' : ''}`}
                disabled={assetLoading}
                onClick={() => act({ type: 'SET_SETUP_KIND', kind: 'rules' })}
              >
                <strong>{t('assistant.setupRules')}</strong>
                <span>{t('assistant.setupRulesHint')}</span>
              </button>
            </div>

            {state.setupKind === 'rules' && code === 'tfth' ? (
              <label className="assistant-slider">
                <span>
                  {t('assistant.startingHeads')}: {state.startingHeads}
                </span>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={state.startingHeads}
                  disabled={assetLoading}
                  onChange={(e) =>
                    act({ type: 'SET_STARTING_HEADS', n: Number(e.target.value) })
                  }
                />
              </label>
            ) : null}

            <div className="setup-cta-begin">
              {!assetsReady && assetProgress.total > 0 && !assetLoading ? (
                <p className="setup-warm-hint" role="status">
                  {t('assistant.warmingAssets', { pct: preloadPct })}
                </p>
              ) : null}
              <button
                type="button"
                className={`btn primary${assetLoading ? ' is-busy' : ''}`}
                disabled={assetLoading}
                onClick={() => void beginAssistant()}
              >
                {assetLoading ? t('assistant.beginLoading') : t('assistant.begin')}
              </button>
            </div>
          </div>
        </main>
        {resumePromptOpen ? (
          <AppOverlay
            open
            mode="modal"
            onClose={discardResume}
            closeOnBackdrop={false}
            title={t('sessionResume.title')}
            titleId="assistant-resume-title"
            shellClassName="pack-confirm-dialog"
            size="narrow"
          >
            <p id="assistant-resume-desc">{t('sessionResume.body')}</p>
            <div className="pack-confirm-actions">
              <UiButton variant="ghost" onClick={discardResume} disabled={assetLoading}>
                {t('sessionResume.restart')}
              </UiButton>
              <UiButton
                variant="primary"
                onClick={() => void resumeAssistant()}
                disabled={assetLoading}
              >
                {assetLoading ? t('assistant.beginLoading') : t('sessionResume.continue')}
              </UiButton>
            </div>
          </AppOverlay>
        ) : null}
      </>
    )
  }

  const isBlankBoard = state.setupKind === 'blank'
  const bounds = boardBounds(state.boardCells)
  const boardSlots = bounds.cols
  const boardRows = bounds.rows
  const canEditSlots = isBlankBoard && state.status === 'playing'

  const canAddFrom = (
    slotIndex: number,
    direction: 'up' | 'down' | 'left' | 'right',
  ) => {
    if (!canEditSlots || state.boardCells.length >= MAX_BOARD_CELLS) return false
    const cell = state.boardCells[slotIndex]
    if (!cell) return false
    const colRows = state.boardCells
      .filter((c) => c.col === cell.col)
      .map((c) => c.row)
    const rowCols = state.boardCells
      .filter((c) => c.row === cell.row)
      .map((c) => c.col)
    const colMax = colRows.length ? Math.max(...colRows) : -1
    const rowMax = rowCols.length ? Math.max(...rowCols) : -1

    if (direction === 'up') {
      const above = cell.row - 1
      if (
        above >= 0 &&
        !state.boardCells.some((c) => c.row === above && c.col === cell.col)
      ) {
        return true
      }
      return colMax + 1 < MAX_BOARD_ROWS
    }
    if (direction === 'down') {
      const below = cell.row + 1
      if (below >= MAX_BOARD_ROWS) return false
      if (!state.boardCells.some((c) => c.row === below && c.col === cell.col)) {
        return true
      }
      return colMax + 1 < MAX_BOARD_ROWS
    }
    if (direction === 'left') {
      const left = cell.col - 1
      if (
        left >= 0 &&
        !state.boardCells.some((c) => c.row === cell.row && c.col === left)
      ) {
        return true
      }
      return rowMax + 1 < MAX_BOARD_COLS
    }
    const right = cell.col + 1
    if (right >= MAX_BOARD_COLS) return false
    if (!state.boardCells.some((c) => c.row === cell.row && c.col === right)) {
      return true
    }
    return rowMax + 1 < MAX_BOARD_COLS
  }

  const afterBoardEdit = () => {
    if (!coarsePointer) suppressSeatHoverRef.current = true
    setActiveSeatId(null)
    const el = document.activeElement
    if (el instanceof HTMLElement) el.blur()
  }

  const renderSlot = (slotIndex: number) => {
    const card = state.battlefield[slotIndex]
    const cell = state.boardCells[slotIndex]
    const seatId = cell?.id ?? `slot-${slotIndex}`
    const controlsOpen = canEditSlots && activeSeatId === seatId
    const tapToEdit = canEditSlots && coarsePointer && !card
    return (
      <div
        key={seatId}
        className={[
          'assistant-card-slot',
          card ? 'has-card' : 'is-empty',
          drag ? 'is-droppable' : '',
          canEditSlots ? 'is-editable' : '',
          controlsOpen ? 'is-controls-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          cell
            ? ({
                gridColumn: cell.col + 1,
                gridRow: cell.row + 1,
              } as CSSProperties)
            : undefined
        }
        data-drop-zone="battlefield"
        data-drop-index={String(slotIndex)}
        aria-label={
          card
            ? localizeName(card.name)
            : t(coarsePointer ? 'assistant.emptySlotTap' : 'assistant.emptySlot')
        }
        aria-expanded={tapToEdit ? controlsOpen : undefined}
        role={tapToEdit ? 'button' : undefined}
        tabIndex={tapToEdit ? 0 : undefined}
        onPointerEnter={
          canEditSlots && !coarsePointer
            ? () => {
                if (suppressSeatHoverRef.current) return
                setActiveSeatId(seatId)
              }
            : undefined
        }
        onPointerLeave={
          canEditSlots && !coarsePointer
            ? () => {
                suppressSeatHoverRef.current = false
                setActiveSeatId((cur) => (cur === seatId ? null : cur))
              }
            : undefined
        }
        onClick={
          tapToEdit
            ? (e) => {
                e.stopPropagation()
                setActiveSeatId((cur) => (cur === seatId ? null : seatId))
              }
            : undefined
        }
        onKeyDown={
          tapToEdit
            ? (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                e.stopPropagation()
                setActiveSeatId((cur) => (cur === seatId ? null : seatId))
              }
            : undefined
        }
      >
        {card ? (
          <ArenaCard
            variant="board"
            image={card.image}
            name={localizeName(card.name)}
            instanceId={card.instanceId}
            power={card.power}
            toughness={card.toughness}
            markedDamage={card.markedDamage}
            tapped={card.tapped}
            keywords={card.keywords}
            zhLabels={zh}
            counters={
              card.isHead
                ? [
                    {
                      id: 'head',
                      text: zh ? '头' : 'H',
                      title: zh ? 'Hydra head' : 'Head',
                      tone: 'gold',
                    },
                  ]
                : card.isElite
                  ? [{ id: 'elite', text: '★', title: 'Elite', tone: 'gold' }]
                  : null
            }
            showPt={card.power != null && card.toughness != null}
            note={card.note || null}
            onMouseEnter={
              coarsePointer ? undefined : (e) => previewCard(card, e)
            }
            onMouseLeave={coarsePointer ? undefined : clearPreview}
            onDoubleClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              act({ type: 'TOGGLE_TAP', instanceId: card.instanceId })
            }}
            onContextMenu={(e) => openCardMenu(e, card)}
            onLongPress={() =>
              openCardMenuAt(
                card,
                Math.round(window.innerWidth * 0.5),
                Math.round(window.innerHeight * 0.4),
              )
            }
            onPointerDown={(e) =>
              startDrag(
                e,
                {
                  instanceId: card.instanceId,
                  source: { zone: 'battlefield', index: slotIndex },
                },
                { image: card.image, name: localizeName(card.name) },
              )
            }
          />
        ) : (
          <span className="assistant-slot-marker" aria-hidden="true" />
        )}
        {canEditSlots ? (
          <>
            <button
              type="button"
              className="assistant-slot-ctrl is-remove"
              tabIndex={controlsOpen ? 0 : -1}
              disabled={state.boardCells.length <= 1}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                act({ type: 'REMOVE_BOARD_SLOT', index: slotIndex })
                afterBoardEdit()
              }}
              aria-label={t('assistant.removeSlot')}
              title={t('assistant.removeSlot')}
            >
              −
            </button>
            {(
              [
                ['up', 'expandUp', 'is-add-up'],
                ['down', 'expandDown', 'is-add-down'],
                ['left', 'expandLeft', 'is-add-left'],
                ['right', 'expandRight', 'is-add-right'],
              ] as const
            ).map(([direction, labelKey, className]) => (
              <button
                key={direction}
                type="button"
                className={`assistant-slot-ctrl ${className}`}
                tabIndex={controlsOpen ? 0 : -1}
                disabled={!canAddFrom(slotIndex, direction)}
                onPointerDown={(e) => {
                  // Capture before layout shifts / neighbor hit-testing can steal the click.
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  act({
                    type: 'ADD_BOARD_SLOT',
                    fromIndex: slotIndex,
                    direction,
                  })
                  afterBoardEdit()
                }}
                aria-label={t(`assistant.${labelKey}`)}
                title={t(`assistant.${labelKey}`)}
              >
                +
              </button>
            ))}
          </>
        ) : null}
      </div>
    )
  }

  return (
    <main
      ref={arenaRef}
      className={`arena-root assistant-root theme-${deck.theme} is-playing is-assistant-fit layout-${code} setup-${state.setupKind}${
        drag ? ' is-dragging' : ''
      }${boardPan.dragging ? ' is-board-panning' : ''}`}
    >
      <div className="arena-scene-veil" aria-hidden="true" />
      <CardFlightLayer flights={flights} />
      {atmosphere}

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
          <DropZone
            zone="battlefield"
            className="arena-battlefield assistant-battlefield-half"
          >
            <div
              className="assistant-board-shell is-dynamic"
              onClick={
                canEditSlots && coarsePointer
                  ? () => setActiveSeatId(null)
                  : undefined
              }
            >
              <section
                className="assistant-slot-board is-sparse"
                data-rows={boardRows}
                style={
                  {
                    '--assistant-row-slots': boardSlots,
                    '--assistant-rows': boardRows,
                    '--assistant-grid-cols': bounds.cols,
                    '--assistant-grid-rows': bounds.rows,
                  } as CSSProperties
                }
              >
                {state.boardCells.map((_, i) => renderSlot(i))}
              </section>
            </div>
          </DropZone>
        </div>
      </div>

      <div className="arena-chrome-layer">
      <div className="arena-topbar-shell">
        <div className="arena-topbar-hotzone" aria-hidden="true" />
        <header className="arena-topbar assistant-topbar">
          <div className="arena-topbar-actions is-back">
            <ArenaToolButton
              label={t('assistant.back')}
              icon={arenaToolIcons.back}
              onClick={() => {
                const idx = window.history.state?.idx
                if (typeof idx === 'number' && idx > 0) {
                  navigate(-1)
                  return
                }
                navigate(`/decks/${code}`)
              }}
            />
          </div>
          <div className="arena-topbar-actions">
            <ArenaToolButton
              label={t('assistant.reset')}
              icon={arenaToolIcons.reset}
              onClick={() => {
                if (window.confirm(t('assistant.resetConfirm'))) {
                  act({ type: 'RESET' })
                }
              }}
            />
            <ArenaToolButton
              label={t('assistant.shuffle')}
              icon={arenaToolIcons.shuffle}
              onClick={() => act({ type: 'SHUFFLE_LIBRARY' })}
            />
            <ArenaToolButton
              label={t('assistant.search')}
              icon={arenaToolIcons.search}
              onClick={() => setSearchOpen(true)}
            />
            <AssistantLlmAdvisor state={state} />
            <LanguageSwitch compact asButton />
          </div>
        </header>
      </div>

      <div className="assistant-side-tools">
        {state.staging ? (
          <p className="assistant-hint-bar" role="status">
            {t('assistant.hintBarStaging')}
          </p>
        ) : (
          <p className="assistant-hint-bar is-muted">{t('assistant.hintBar')}</p>
        )}
        <AssistantProcedurePanel code={code} />
      </div>

      <div className="arena-opponent-rail assistant-opponent-rail">
        {/* Must stay inside .arena-player-chrome: the rail itself has pointer-events:none. */}
        <div className="arena-player-chrome is-opponent assistant-zone-stack">
          <div className="assistant-zone-piles challenge-zone-piles">
            <ZonePile
              kind="exile"
              label={t('assistant.exile')}
              count={state.exile.length}
              dataZone="assistant-exile"
              onClick={() => setInspect('exile')}
              dropZone="exile"
              activeDrop={drag != null}
            />
            <ZonePile
              kind="graveyard"
              label={t('assistant.graveyard')}
              count={state.graveyard.length}
              dataZone="assistant-graveyard"
              onClick={() => setInspect('graveyard')}
              dropZone="graveyard"
              activeDrop={drag != null}
            />
            <div className="assistant-library-anchor">
              <ZonePile
                kind="library"
                label={t('assistant.library')}
                count={state.library.length}
                dataZone="assistant-library"
                hint={t('assistant.drawHint')}
                stackImage={
                  deck?.cards[0]?.images.back
                    ? preferredAssetUrl(deck.cards[0].images.back, { kind: 'card_back' })
                    : undefined
                }
                onClick={onLibraryClick}
                onDoubleClick={onLibraryDoubleClick}
                dropZone="library"
                dropPlacement="bottom"
                activeDrop={drag != null}
              />
              {state.staging ? (
                <div className="assistant-staging">
                  <div
                    className="assistant-drag-source"
                    role="button"
                    tabIndex={0}
                    aria-label={localizeName(state.staging.name)}
                    onPointerDown={(e) =>
                      startDrag(
                        e,
                        {
                          instanceId: state.staging!.instanceId,
                          source: { zone: 'staging' },
                        },
                        {
                          image: state.staging!.image,
                          name: localizeName(state.staging!.name),
                        },
                      )
                    }
                    onContextMenu={(e) => openCardMenu(e, state.staging!)}
                    onMouseEnter={() => previewCard(state.staging!)}
                    onMouseLeave={clearPreview}
                  >
                    <ArenaCard
                      image={state.staging.image}
                      name={localizeName(state.staging.name)}
                      instanceId={state.staging.instanceId}
                    />
                  </div>
                  <p aria-hidden="true">{t('assistant.stagingHint')}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="arena-player-chrome is-you assistant-player-chrome">
        <NamedValuesEditor
          title={t('assistant.playerValues')}
          values={state.playerValues}
          compact
          floating
          storageKey={`ms-named-values:${code}`}
          onAdd={() => act({ type: 'ADD_PLAYER_VALUE' })}
          onUpdate={(id, patch) => act({ type: 'UPDATE_PLAYER_VALUE', id, ...patch })}
          onRemove={(id) => act({ type: 'REMOVE_PLAYER_VALUE', id })}
        />
      </div>

      {boardPan.offCenter ? (
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
      ) : null}
      </div>

      {preview ? (
        <aside
          ref={previewPaneRef}
          className={[
            'card-preview-pane',
            'assistant-preview-pane',
            coarsePointer ? '' : 'is-follow',
            inspect || searchOpen || noteEditId ? 'is-above-modal' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={
            coarsePointer
              ? undefined
              : ({
                  '--preview-x': `${previewPos.x}px`,
                  '--preview-y': `${previewPos.y}px`,
                } as CSSProperties)
          }
        >
          <CardImage localPath={preview.image} kind="png" alt={preview.name} />
          <div
            className="card-preview-copy"
            key={`copy-${preview.instanceId ?? preview.name}`}
          >
            <p className="card-preview-name">{preview.name}</p>
            <p className="card-preview-text">{preview.text}</p>
          </div>
        </aside>
      ) : null}

      {drag ? (
        <div
          className="assistant-drag-ghost"
          style={{ left: drag.x, top: drag.y }}
          aria-hidden="true"
        >
          <CardImage localPath={drag.image} kind="normal" alt="" />
        </div>
      ) : null}

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onSelect={onMenuSelect}
          onClose={() => setMenu(null)}
        />
      ) : null}

      {searchOpen ? (
        <LibrarySearchModal
          library={state.library}
          onClose={() => setSearchOpen(false)}
          localizeName={localizeName}
          onStartDrag={startDrag}
          onHoverCard={previewCard}
          onLeaveCard={clearPreview}
          onPlay={(instanceId) => {
            const card = state.library.find((c) => c.instanceId === instanceId)
            if (card) queueMoveFlight(card, 'battlefield')
            act({ type: 'MOVE_CARD', instanceId, to: 'battlefield' })
            setSearchOpen(false)
          }}
        />
      ) : null}

      {inspect ? (
        <div
          className="assistant-modal-backdrop"
          role="presentation"
          onClick={() => setInspect(null)}
        >
          <div
            className="assistant-modal"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="assistant-modal-head">
              <h2>
                {inspect === 'graveyard'
                  ? t('assistant.inspectGraveyard')
                  : t('assistant.inspectExile')}
              </h2>
              <PackHeadIconButton
                icon="close"
                label={t('assistant.closeSearch')}
                onClick={() => setInspect(null)}
              />
            </header>
            <div className="assistant-inspect-grid">
              {(inspect === 'graveyard' ? state.graveyard : state.exile).length === 0 ? (
                <p className="assistant-empty">{t('assistant.zoneEmpty')}</p>
              ) : (
                (inspect === 'graveyard' ? state.graveyard : state.exile).map((card, index) => (
                  <ArenaCard
                    key={card.instanceId}
                    image={card.image}
                    name={localizeName(card.name)}
                    onMouseEnter={() => previewCard(card)}
                    onMouseLeave={clearPreview}
                    onPointerDown={(e) =>
                      startDrag(
                        e,
                        {
                          instanceId: card.instanceId,
                          source: {
                            zone: inspect,
                            index,
                          },
                        },
                        { image: card.image, name: localizeName(card.name) },
                      )
                    }
                    onContextMenu={(e) => openCardMenu(e, card)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {noteCard ? (
        <div
          className="assistant-modal-backdrop"
          role="presentation"
          onClick={() => setNoteEditId(null)}
        >
          <div
            className="assistant-modal is-narrow"
            role="dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="assistant-modal-head">
              <h2>
                {t('assistant.note')} · {localizeName(noteCard.name)}
              </h2>
              <PackHeadIconButton
                icon="close"
                label={t('assistant.closeSearch')}
                onClick={() => setNoteEditId(null)}
              />
            </header>
            <label className="assistant-note-field">
              <span className="sr-only">{t('assistant.note')}</span>
              <textarea
                value={noteCard.note}
                rows={4}
                placeholder={t('assistant.notePlaceholder')}
                onChange={(e) =>
                  act({
                    type: 'SET_CARD_NOTE',
                    instanceId: noteCard.instanceId,
                    note: e.target.value,
                  })
                }
              />
            </label>
          </div>
        </div>
      ) : null}
    </main>
  )
}
