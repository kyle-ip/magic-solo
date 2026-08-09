import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { DragPayload, DropTarget } from '../assistant/dnd'
import { createAssistantReducer } from '../assistant/reducer'
import { createInitialSetup } from '../assistant/setup'
import {
  MAX_BOARD_CELLS,
  MAX_BOARD_COLS,
  MAX_BOARD_ROWS,
  boardBounds,
  groupCellsByRow,
} from '../assistant/layouts'
import type { AssistantAction, AssistantCard } from '../assistant/types'
import { ContextMenu, type ContextMenuItem } from '../components/assistant/ContextMenu'
import { DropZone } from '../components/assistant/DropZone'
import { LibrarySearchModal } from '../components/assistant/LibrarySearchModal'
import { NamedValuesEditor } from '../components/assistant/NamedValuesEditor'
import { findDropAttr, usePointerDrag } from '../components/assistant/usePointerDrag'
import { ArenaCard } from '../components/challenge/ArenaCard'
import { ZonePile } from '../components/challenge/ZonePile'
import {
  ArenaToolButton,
  arenaToolIcons,
} from '../components/ArenaToolButton'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { getDeck } from '../data/deckRegistry'
import { getCardZh } from '../data/locale/cardsZh'
import { deckMetaEn, deckMetaZh } from '../data/locale/deckMeta'
import type { ChallengeCode } from '../game/types'
import { defsFromDeck } from '../game/types'
import { assetUrl } from '../utils/assetUrl'

const CODES: ChallengeCode[] = ['tfth', 'tbth', 'tdag']

export function AssistantPage() {
  const { setCode = '' } = useParams()
  const code = setCode.toLowerCase() as ChallengeCode
  if (!CODES.includes(code)) return <Navigate to="/" replace />
  return <AssistantGame key={code} code={code} />
}

function AssistantGame({ code }: { code: ChallengeCode }) {
  const { t, i18n } = useTranslation()
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

  const act = useCallback((action: AssistantAction) => dispatch(action), [])

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
    (card: AssistantCard) => {
      setPreview({
        image: card.image,
        name: localizeName(card.name),
        text: localizeCardText(card),
        instanceId: card.instanceId,
      })
    },
    [localizeName, localizeCardText],
  )
  const clearPreview = useCallback(() => setPreview(null), [])

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
      act({ type: 'DRAW' })
    }, 220)
  }, [act])

  const onLibraryDoubleClick = useCallback(() => {
    if (drawClickTimer.current != null) {
      window.clearTimeout(drawClickTimer.current)
      drawClickTimer.current = null
    }
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
    [act, clearPreview, searchOpen, state.library],
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
          { id: 'note', label: t('assistant.editNote') },
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
    if (id === 'note') setNoteEditId(card.instanceId)
    if (id === 'battlefield') {
      clearPreview()
      act({ type: 'MOVE_CARD', instanceId: card.instanceId, to: 'battlefield' })
    }
    if (id === 'gy' || id === 'clear') {
      clearPreview()
      act({ type: 'MOVE_CARD', instanceId: card.instanceId, to: 'graveyard' })
    }
    if (id === 'exile') {
      clearPreview()
      act({ type: 'MOVE_CARD', instanceId: card.instanceId, to: 'exile' })
    }
    if (id === 'top') {
      clearPreview()
      act({
        type: 'MOVE_CARD',
        instanceId: card.instanceId,
        to: 'library',
        libraryPlacement: 'top',
      })
    }
    if (id === 'bottom') {
      clearPreview()
      act({
        type: 'MOVE_CARD',
        instanceId: card.instanceId,
        to: 'library',
        libraryPlacement: 'bottom',
      })
    }
  }

  const noteCard = state.battlefield.find((c) => c?.instanceId === noteEditId)
  const heroArt =
    deck?.cards.find((c) => c.images.artCrop === deck.heroArt)?.images.artCrop ??
    deck?.cards[0]?.images.artCrop

  if (!deck) return <Navigate to="/" replace />

  if (state.status === 'setup') {
    return (
      <main className={`arena-root assistant-root theme-${deck.theme} is-setup`}>
        <div
          className="arena-bg"
          style={
            heroArt ? { backgroundImage: `url(${assetUrl(heroArt)})` } : undefined
          }
        />
        <div className="arena-bg-veil" />
        <div className="assistant-setup arena-setup">
          <Link to={`/decks/${code}`} className="back-link">
            ← {t('assistant.backDeck')}
          </Link>
          <p className="eyebrow">{t('assistant.eyebrow')}</p>
          <h1>{meta?.name ?? deck.name}</h1>
          <p className="lede">{t('assistant.setupLead')}</p>

          <div className="assistant-setup-modes">
            <button
              type="button"
              className={`assistant-setup-card ${state.setupKind === 'blank' ? 'is-selected' : ''}`}
              onClick={() => act({ type: 'SET_SETUP_KIND', kind: 'blank' })}
            >
              <strong>{t('assistant.setupBlank')}</strong>
              <span>{t('assistant.setupBlankHint')}</span>
            </button>
            <button
              type="button"
              className={`assistant-setup-card ${state.setupKind === 'rules' ? 'is-selected' : ''}`}
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
                onChange={(e) =>
                  act({ type: 'SET_STARTING_HEADS', n: Number(e.target.value) })
                }
              />
            </label>
          ) : null}

          <button type="button" className="btn primary" onClick={() => act({ type: 'START' })}>
            {t('assistant.begin')}
          </button>
        </div>
      </main>
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

  const renderSlot = (slotIndex: number, compact?: boolean) => {
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
          isBlankBoard && cell
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
            image={card.image}
            name={localizeName(card.name)}
            instanceId={card.instanceId}
            power={card.power}
            toughness={card.toughness}
            markedDamage={card.markedDamage}
            tapped={card.tapped}
            compact={compact}
            note={card.note || null}
            onMouseEnter={coarsePointer ? undefined : () => previewCard(card)}
            onMouseLeave={coarsePointer ? undefined : clearPreview}
            onDoubleClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              act({ type: 'TOGGLE_TAP', instanceId: card.instanceId })
            }}
            onContextMenu={(e) => openCardMenu(e, card)}
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
      className={`arena-root assistant-root theme-${deck.theme} is-playing layout-${code} setup-${state.setupKind}${
        drag ? ' is-dragging' : ''
      }`}
    >
      <div
        className="arena-bg"
        style={
          heroArt ? { backgroundImage: `url(${assetUrl(heroArt)})` } : undefined
        }
      />
      <div className="arena-bg-veil" />

      <header className="arena-topbar assistant-topbar">
        <Link to={`/decks/${code}`} className="arena-link">
          ← {t('assistant.backDeck')}
        </Link>
        <div className="arena-topbar-actions">
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
          <LanguageSwitch compact />
        </div>
      </header>

      <div className="arena-opponent-rail assistant-opponent-rail">
        {/* Must stay inside .arena-player-chrome: the rail itself has pointer-events:none. */}
        <div className="arena-player-chrome is-opponent assistant-zone-stack">
          <div className="assistant-zone-piles">
            <ZonePile
              kind="exile"
              label={t('assistant.exile')}
              count={state.exile.length}
              onClick={() => setInspect('exile')}
              dropZone="exile"
              activeDrop={drag != null}
            />
            <ZonePile
              kind="graveyard"
              label={t('assistant.graveyard')}
              count={state.graveyard.length}
              onClick={() => setInspect('graveyard')}
              dropZone="graveyard"
              activeDrop={drag != null}
            />
            <div className="assistant-library-anchor">
              <ZonePile
                kind="library"
                label={t('assistant.library')}
                count={state.library.length}
                hint={t('assistant.drawHint')}
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

      <DropZone
        zone="battlefield"
        className="arena-battlefield assistant-battlefield-half"
      >
        <div
          className={`assistant-board-shell${isBlankBoard ? ' is-dynamic' : ''}`}
          onClick={
            canEditSlots && coarsePointer
              ? () => setActiveSeatId(null)
              : undefined
          }
        >
          <section
            className={`assistant-slot-board${isBlankBoard ? ' is-sparse' : ''}`}
            data-rows={boardRows}
            style={
              {
                '--assistant-row-slots': boardSlots,
                ...(isBlankBoard
                  ? {
                      '--assistant-grid-cols': bounds.cols,
                      '--assistant-grid-rows': bounds.rows,
                    }
                  : null),
              } as CSSProperties
            }
          >
            {isBlankBoard
              ? state.boardCells.map((_, i) => renderSlot(i, false))
              : groupCellsByRow(state.boardCells).map((row, rowIndex, rows) => {
                  const isLower = rowIndex === rows.length - 1
                  return (
                    <div
                      key={`row-${row.row}`}
                      className={`assistant-slot-row ${isLower ? 'is-front' : 'is-back'}`}
                      style={
                        {
                          '--assistant-row-slots': row.entries.length,
                        } as CSSProperties
                      }
                    >
                      {row.entries.map(({ index }) =>
                        renderSlot(index, !isLower && rows.length > 1),
                      )}
                    </div>
                  )
                })}
          </section>
        </div>
      </DropZone>

      <div className="arena-player-chrome is-you assistant-player-chrome">
        <NamedValuesEditor
          title={t('assistant.playerValues')}
          values={state.playerValues}
          compact
          onAdd={() => act({ type: 'ADD_PLAYER_VALUE' })}
          onUpdate={(id, patch) => act({ type: 'UPDATE_PLAYER_VALUE', id, ...patch })}
          onRemove={(id) => act({ type: 'REMOVE_PLAYER_VALUE', id })}
        />
      </div>

      {preview ? (
        <aside
          className={[
            'card-preview-pane',
            'assistant-preview-pane',
            inspect || searchOpen || noteEditId ? 'is-above-modal' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <img src={assetUrl(preview.image)} alt={preview.name} />
          <div className="card-preview-copy">
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
          <img src={assetUrl(drag.image)} alt="" />
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
              <button type="button" className="btn ghost" onClick={() => setInspect(null)}>
                {t('assistant.closeSearch')}
              </button>
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
              <button
                type="button"
                className="btn ghost"
                onClick={() => setNoteEditId(null)}
              >
                {t('assistant.closeSearch')}
              </button>
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
