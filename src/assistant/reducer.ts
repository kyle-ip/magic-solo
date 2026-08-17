import { ensureIdSeqAtLeast, maxSeqFromIds } from '../game/buildDeck'
import { shuffle } from '../game/shuffle'
import type { CardDef } from '../game/types'
import {
  ensureBoardCellSeqAtLeast,
  MAX_BOARD_CELLS,
  MAX_BOARD_COLS,
  MAX_BOARD_ROWS,
  hasCellAt,
  nextBoardCellId,
  type BoardCell,
} from './layouts'
import {
  buildAssistantStart,
  createInitialSetup,
  ensureValueSeqAtLeast,
  nextValueId,
} from './setup'
import {
  type AssistantAction,
  type AssistantCard,
  type AssistantState,
  type AssistantZone,
  type LibraryPlacement,
  type NamedValue,
} from './types'

type BoardDirection = 'up' | 'down' | 'left' | 'right'

function collectAssistantInstanceIds(state: AssistantState): string[] {
  const ids: string[] = []
  for (const c of state.library) ids.push(c.instanceId)
  if (state.staging) ids.push(state.staging.instanceId)
  for (const c of state.battlefield) {
    if (c) ids.push(c.instanceId)
  }
  for (const c of state.graveyard) ids.push(c.instanceId)
  for (const c of state.exile) ids.push(c.instanceId)
  return ids
}

function syncSeqsFromAssistantState(state: AssistantState): void {
  ensureIdSeqAtLeast(maxSeqFromIds(collectAssistantInstanceIds(state)))
  ensureBoardCellSeqAtLeast(maxSeqFromIds(state.boardCells.map((c) => c.id)))
  ensureValueSeqAtLeast(maxSeqFromIds(state.playerValues.map((v) => v.id)))
}

function sortBoardPairs(
  cells: BoardCell[],
  battlefield: (AssistantCard | null)[],
): { boardCells: BoardCell[]; battlefield: (AssistantCard | null)[] } {
  const pairs = cells.map((cell, i) => ({
    cell,
    card: battlefield[i] ?? null,
  }))
  pairs.sort((a, b) => a.cell.row - b.cell.row || a.cell.col - b.cell.col)
  return {
    boardCells: pairs.map((p) => p.cell),
    battlefield: pairs.map((p) => p.card),
  }
}

/** Keep the occupied bounding box at (0,0) so the board stays centered. */
function normalizeBoardOrigin(cells: BoardCell[]): BoardCell[] {
  if (cells.length === 0) return cells
  const minRow = Math.min(...cells.map((c) => c.row))
  const minCol = Math.min(...cells.map((c) => c.col))
  if (minRow === 0 && minCol === 0) return cells
  return cells.map((c) => ({
    ...c,
    row: c.row - minRow,
    col: c.col - minCol,
  }))
}

function finalizeBoard(
  cells: BoardCell[],
  battlefield: (AssistantCard | null)[],
): { boardCells: BoardCell[]; battlefield: (AssistantCard | null)[] } {
  return sortBoardPairs(normalizeBoardOrigin(cells), battlefield)
}

function columnMaxRow(cells: BoardCell[], col: number): number {
  const rows = cells.filter((c) => c.col === col).map((c) => c.row)
  return rows.length ? Math.max(...rows) : -1
}

function rowMaxCol(cells: BoardCell[], row: number): number {
  const cols = cells.filter((c) => c.row === row).map((c) => c.col)
  return cols.length ? Math.max(...cols) : -1
}

/**
 * Add one seat in `direction` from `fromIndex`.
 * Empty neighbor → place there (origin stays put).
 * Occupied / past the edge → insert by shifting this column/row.
 */
function addBoardSlot(
  state: AssistantState,
  fromIndex: number,
  direction: BoardDirection,
): AssistantState {
  if (
    state.status !== 'playing' ||
    state.setupKind !== 'blank' ||
    fromIndex < 0 ||
    fromIndex >= state.boardCells.length ||
    state.boardCells.length >= MAX_BOARD_CELLS
  ) {
    return state
  }

  const origin = state.boardCells[fromIndex]
  let cells = state.boardCells.map((c) => ({ ...c }))
  const cards = [...state.battlefield]
  let insertRow = origin.row
  let insertCol = origin.col

  if (direction === 'up') {
    const above = origin.row - 1
    if (above >= 0 && !hasCellAt(cells, above, origin.col)) {
      insertRow = above
      insertCol = origin.col
    } else if (above < 0) {
      // Grow past the top edge: shift this column down, place at row 0.
      if (columnMaxRow(cells, origin.col) + 1 >= MAX_BOARD_ROWS) return state
      cells = cells.map((c) =>
        c.col === origin.col ? { ...c, row: c.row + 1 } : c,
      )
      insertRow = 0
      insertCol = origin.col
    } else {
      // Occupied above — insert between by pushing this seat (and below) down.
      if (columnMaxRow(cells, origin.col) + 1 >= MAX_BOARD_ROWS) return state
      cells = cells.map((c) =>
        c.col === origin.col && c.row >= origin.row
          ? { ...c, row: c.row + 1 }
          : c,
      )
      insertRow = origin.row
      insertCol = origin.col
    }
  } else if (direction === 'down') {
    insertRow = origin.row + 1
    insertCol = origin.col
    if (insertRow >= MAX_BOARD_ROWS) return state
    if (hasCellAt(cells, insertRow, insertCol)) {
      if (columnMaxRow(cells, origin.col) + 1 >= MAX_BOARD_ROWS) return state
      cells = cells.map((c) =>
        c.col === origin.col && c.row >= insertRow
          ? { ...c, row: c.row + 1 }
          : c,
      )
    }
  } else if (direction === 'left') {
    const left = origin.col - 1
    if (left >= 0 && !hasCellAt(cells, origin.row, left)) {
      insertRow = origin.row
      insertCol = left
    } else if (left < 0) {
      if (rowMaxCol(cells, origin.row) + 1 >= MAX_BOARD_COLS) return state
      cells = cells.map((c) =>
        c.row === origin.row ? { ...c, col: c.col + 1 } : c,
      )
      insertRow = origin.row
      insertCol = 0
    } else {
      if (rowMaxCol(cells, origin.row) + 1 >= MAX_BOARD_COLS) return state
      cells = cells.map((c) =>
        c.row === origin.row && c.col >= origin.col
          ? { ...c, col: c.col + 1 }
          : c,
      )
      insertRow = origin.row
      insertCol = origin.col
    }
  } else {
    // right
    insertRow = origin.row
    insertCol = origin.col + 1
    if (insertCol >= MAX_BOARD_COLS) return state
    if (hasCellAt(cells, insertRow, insertCol)) {
      if (rowMaxCol(cells, origin.row) + 1 >= MAX_BOARD_COLS) return state
      cells = cells.map((c) =>
        c.row === origin.row && c.col >= insertCol
          ? { ...c, col: c.col + 1 }
          : c,
      )
    }
  }

  if (hasCellAt(cells, insertRow, insertCol)) return state

  cells.push({ id: nextBoardCellId(), row: insertRow, col: insertCol })
  cards.push(null)
  return { ...state, ...finalizeBoard(cells, cards) }
}

function removeBoardSlot(
  state: AssistantState,
  index: number,
): AssistantState {
  if (
    state.status !== 'playing' ||
    state.setupKind !== 'blank' ||
    index < 0 ||
    index >= state.boardCells.length ||
    state.boardCells.length <= 1
  ) {
    return state
  }

  const card = state.battlefield[index]
  const boardCells = state.boardCells.filter((_, i) => i !== index)
  const battlefield = state.battlefield.filter((_, i) => i !== index)
  const next = finalizeBoard(boardCells, battlefield)

  if (!card) return { ...state, ...next }
  return {
    ...state,
    ...next,
    graveyard: [...state.graveyard, card],
  }
}

export type AssistantReducerContext = {
  defs: CardDef[]
  lifeLabel: string
}

function firstEmptySlot(slots: (AssistantCard | null)[]): number {
  return slots.findIndex((c) => c == null)
}

function findCard(
  state: AssistantState,
  instanceId: string,
): { card: AssistantCard; zone: AssistantZone; index: number } | null {
  if (state.staging?.instanceId === instanceId) {
    return { card: state.staging, zone: 'staging', index: 0 }
  }
  for (let i = 0; i < state.battlefield.length; i += 1) {
    const card = state.battlefield[i]
    if (card?.instanceId === instanceId) {
      return { card, zone: 'battlefield', index: i }
    }
  }
  for (const zone of ['graveyard', 'exile', 'library'] as const) {
    const list = state[zone]
    const index = list.findIndex((c) => c.instanceId === instanceId)
    if (index >= 0) return { card: list[index], zone, index }
  }
  return null
}

function removeFromZone(
  state: AssistantState,
  zone: AssistantZone,
  instanceId: string,
): { state: AssistantState; card: AssistantCard | null } {
  if (zone === 'staging') {
    if (state.staging?.instanceId !== instanceId) return { state, card: null }
    return { state: { ...state, staging: null }, card: state.staging }
  }
  if (zone === 'battlefield') {
    const index = state.battlefield.findIndex((c) => c?.instanceId === instanceId)
    if (index < 0) return { state, card: null }
    const card = state.battlefield[index]
    const battlefield = [...state.battlefield]
    battlefield[index] = null
    return { state: { ...state, battlefield }, card }
  }
  const list = state[zone]
  const index = list.findIndex((c) => c.instanceId === instanceId)
  if (index < 0) return { state, card: null }
  const next = [...list]
  const [card] = next.splice(index, 1)
  return { state: { ...state, [zone]: next }, card }
}

function insertIntoZone(
  state: AssistantState,
  zone: AssistantZone,
  card: AssistantCard,
  opts?: { libraryPlacement?: LibraryPlacement; index?: number },
): AssistantState {
  if (zone === 'staging') {
    if (state.staging) return state
    return { ...state, staging: card }
  }
  if (zone === 'battlefield') {
    const slots = [...state.battlefield]
    const last = Math.max(0, slots.length - 1)
    let target =
      opts?.index != null
        ? Math.max(0, Math.min(opts.index, last))
        : firstEmptySlot(slots)
    if (target < 0) return state
    if (slots[target] != null) {
      const empty = firstEmptySlot(slots)
      if (empty < 0) return state
      slots[empty] = slots[target]
      slots[target] = null
    }
    slots[target] = card
    return { ...state, battlefield: slots }
  }
  if (zone === 'library') {
    const lib = [...state.library]
    if (opts?.libraryPlacement === 'top') lib.unshift(card)
    else if (opts?.index != null) {
      const i = Math.max(0, Math.min(opts.index, lib.length))
      lib.splice(i, 0, card)
    } else lib.push(card)
    return { ...state, library: lib }
  }
  const list = state[zone]
  const i =
    opts?.index != null
      ? Math.max(0, Math.min(opts.index, list.length))
      : list.length
  const next = [...list]
  next.splice(i, 0, card)
  return { ...state, [zone]: next }
}

function mapBattlefieldCard(
  state: AssistantState,
  instanceId: string,
  fn: (card: AssistantCard) => AssistantCard,
): AssistantState {
  return {
    ...state,
    battlefield: state.battlefield.map((c) =>
      c?.instanceId === instanceId ? fn(c) : c,
    ),
  }
}

function updateNamedList(
  list: NamedValue[],
  id: string,
  patch: { label?: string; value?: number },
): NamedValue[] {
  return list.map((v) =>
    v.id === id
      ? {
          ...v,
          label: patch.label ?? v.label,
          value: patch.value ?? v.value,
        }
      : v,
  )
}

export function createAssistantReducer(ctx: AssistantReducerContext) {
  return function assistantReducer(
    state: AssistantState,
    action: AssistantAction,
  ): AssistantState {
    switch (action.type) {
      case 'SET_SETUP_KIND':
        return { ...state, setupKind: action.kind }
      case 'SET_STARTING_HEADS':
        return {
          ...state,
          startingHeads: Math.min(4, Math.max(1, action.n)),
        }
      case 'START':
        return buildAssistantStart(
          ctx.defs,
          state.code,
          state.theme,
          state.setupKind,
          state.startingHeads,
          ctx.lifeLabel,
        )
      case 'RESET':
        return createInitialSetup(state.code, state.theme, ctx.lifeLabel)
      case 'HYDRATE': {
        if (action.state.code !== state.code || action.state.status !== 'playing') {
          return state
        }
        syncSeqsFromAssistantState(action.state)
        return action.state
      }
      case 'SHUFFLE_LIBRARY':
        return { ...state, library: shuffle(state.library) }
      case 'DRAW': {
        if (state.staging || state.library.length === 0) return state
        const [top, ...rest] = state.library
        return { ...state, library: rest, staging: top }
      }
      case 'MOVE_CARD': {
        const found = findCard(state, action.instanceId)
        if (!found) return state

        // Same-board slot move / swap
        if (found.zone === 'battlefield' && action.to === 'battlefield') {
          const last = Math.max(0, state.battlefield.length - 1)
          const toSlot =
            action.index != null
              ? Math.max(0, Math.min(action.index, last))
              : firstEmptySlot(state.battlefield)
          if (toSlot < 0 || toSlot === found.index) return state
          const slots = [...state.battlefield]
          const moving = slots[found.index]
          if (!moving) return state
          slots[found.index] = slots[toSlot]
          slots[toSlot] = moving
          return { ...state, battlefield: slots }
        }

        if (action.to === 'staging' && state.staging) return state
        if (
          action.to === 'battlefield' &&
          action.index == null &&
          firstEmptySlot(state.battlefield) < 0
        ) {
          // Spill seat so paper swarms aren't stuck on a full rules grid.
          if (state.battlefield.length >= MAX_BOARD_CELLS) return state
          const spillRow =
            Math.max(0, ...state.boardCells.map((c) => c.row)) + 1
          const grown: AssistantState = {
            ...state,
            boardCells: [
              ...state.boardCells,
              { id: nextBoardCellId(), row: spillRow, col: 0 },
            ],
            battlefield: [...state.battlefield, null],
          }
          let next = grown
          const removed = removeFromZone(next, found.zone, action.instanceId)
          if (!removed.card) return state
          next = removed.state
          next = insertIntoZone(next, action.to, removed.card, {
            libraryPlacement: action.libraryPlacement,
            index: action.index,
          })
          return next
        }

        let next = state
        const removed = removeFromZone(next, found.zone, action.instanceId)
        if (!removed.card) return state
        next = removed.state
        next = insertIntoZone(next, action.to, removed.card, {
          libraryPlacement: action.libraryPlacement,
          index: action.index,
        })
        return next
      }
      case 'REORDER_LIBRARY': {
        const { fromIndex, toIndex } = action
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= state.library.length ||
          toIndex >= state.library.length ||
          fromIndex === toIndex
        ) {
          return state
        }
        const lib = [...state.library]
        const [card] = lib.splice(fromIndex, 1)
        lib.splice(toIndex, 0, card)
        return { ...state, library: lib }
      }
      case 'TOGGLE_TAP':
        return mapBattlefieldCard(state, action.instanceId, (c) => ({
          ...c,
          tapped: !c.tapped,
        }))
      case 'ADD_PLAYER_VALUE':
        return {
          ...state,
          playerValues: [
            ...state.playerValues,
            {
              id: nextValueId('pv'),
              label: action.label?.trim() || ctx.lifeLabel,
              value: 0,
            },
          ],
        }
      case 'UPDATE_PLAYER_VALUE':
        return {
          ...state,
          playerValues: updateNamedList(state.playerValues, action.id, action),
        }
      case 'REMOVE_PLAYER_VALUE':
        return {
          ...state,
          playerValues: state.playerValues.filter((v) => v.id !== action.id),
        }
      case 'SET_CARD_NOTE':
        return mapBattlefieldCard(state, action.instanceId, (c) => ({
          ...c,
          note: action.note,
        }))
      case 'ADJUST_MARKED_DAMAGE':
        return mapBattlefieldCard(state, action.instanceId, (c) => ({
          ...c,
          markedDamage: Math.max(0, (c.markedDamage ?? 0) + action.delta),
        }))
      case 'ADJUST_POWER_TOUGHNESS':
        return mapBattlefieldCard(state, action.instanceId, (c) => ({
          ...c,
          power:
            c.power == null
              ? c.power
              : Math.max(0, c.power + (action.powerDelta ?? 0)),
          toughness:
            c.toughness == null
              ? c.toughness
              : Math.max(0, c.toughness + (action.toughnessDelta ?? 0)),
        }))
      case 'ADD_BOARD_SLOT':
        return addBoardSlot(state, action.fromIndex, action.direction)
      case 'REMOVE_BOARD_SLOT':
        return removeBoardSlot(state, action.index)
      default:
        return state
    }
  }
}
