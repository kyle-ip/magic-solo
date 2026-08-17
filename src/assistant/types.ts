import type { CardInstance, ChallengeCode } from '../game/types'
import type { DeckTheme } from '../types'
import {
  creatureRowFromRows,
  initialBoardCells,
  initialBoardRows,
  supportRowFromRows,
  type BoardCell,
} from './layouts'

export type NamedValue = {
  id: string
  label: string
  value: number
}

export type AssistantZone = 'library' | 'staging' | 'battlefield' | 'graveyard' | 'exile'

/** Library drop placement: top = index 0, bottom = end of array. */
export type LibraryPlacement = 'top' | 'bottom'

export type AssistantSetupKind = 'blank' | 'rules'

export interface AssistantCard extends CardInstance {
  /** Free-form note shown on the card face. */
  note: string
}

export type { BoardCell }

export interface AssistantState {
  code: ChallengeCode
  theme: DeckTheme
  status: 'setup' | 'playing'
  setupKind: AssistantSetupKind
  startingHeads: number
  library: AssistantCard[]
  staging: AssistantCard | null
  /**
   * Sparse seat positions. Blank boards grow cell-by-cell;
   * rules setups use a fixed rectangular layout.
   * Parallel to `battlefield`.
   */
  boardCells: BoardCell[]
  /** Fixed board slots; null = empty seat. Length matches boardCells. */
  battlefield: (AssistantCard | null)[]
  graveyard: AssistantCard[]
  exile: AssistantCard[]
  playerValues: NamedValue[]
}

export type AssistantAction =
  | { type: 'SET_SETUP_KIND'; kind: AssistantSetupKind }
  | { type: 'SET_STARTING_HEADS'; n: number }
  | { type: 'START' }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; state: AssistantState }
  | { type: 'SHUFFLE_LIBRARY' }
  | { type: 'DRAW' }
  | {
      type: 'MOVE_CARD'
      instanceId: string
      to: AssistantZone
      /** When to === 'library' */
      libraryPlacement?: LibraryPlacement
      /** Slot index when to === 'battlefield'; library insert / search reorder */
      index?: number
    }
  | { type: 'REORDER_LIBRARY'; fromIndex: number; toIndex: number }
  | { type: 'TOGGLE_TAP'; instanceId: string }
  | { type: 'ADD_PLAYER_VALUE'; label?: string }
  | { type: 'UPDATE_PLAYER_VALUE'; id: string; label?: string; value?: number }
  | { type: 'REMOVE_PLAYER_VALUE'; id: string }
  | { type: 'SET_CARD_NOTE'; instanceId: string; note: string }
  | { type: 'ADJUST_MARKED_DAMAGE'; instanceId: string; delta: number }
  | {
      type: 'ADJUST_POWER_TOUGHNESS'
      instanceId: string
      powerDelta?: number
      toughnessDelta?: number
    }
  | {
      type: 'ADD_BOARD_SLOT'
      fromIndex: number
      direction: 'up' | 'down' | 'left' | 'right'
    }
  | { type: 'REMOVE_BOARD_SLOT'; index: number }

export function emptyBattlefield(
  code: ChallengeCode,
  setupKind: AssistantSetupKind = 'rules',
  boardCells?: BoardCell[],
): { boardCells: BoardCell[]; battlefield: (AssistantCard | null)[] } {
  const cells = boardCells ?? initialBoardCells(code, setupKind)
  return {
    boardCells: cells,
    battlefield: Array.from({ length: cells.length }, () => null),
  }
}

function placeInRange(
  slots: (AssistantCard | null)[],
  cards: AssistantCard[],
  start: number,
  count: number,
): void {
  let cursor = 0
  for (const card of cards) {
    while (cursor < count && slots[start + cursor] != null) cursor += 1
    if (cursor >= count) break
    slots[start + cursor] = card
    cursor += 1
  }
}

/** Fill the creature-facing (lower) row first; leftover spills into remaining seats. */
export function placeOnBattlefield(
  code: ChallengeCode,
  cards: AssistantCard[],
  setupKind: AssistantSetupKind = 'rules',
): { boardCells: BoardCell[]; battlefield: (AssistantCard | null)[] } {
  const rows = initialBoardRows(code, setupKind)
  const { boardCells, battlefield: next } = emptyBattlefield(code, setupKind)
  const row = creatureRowFromRows(rows)
  placeInRange(next, cards, row.start, row.count)
  const placed = next.filter(Boolean).length
  if (placed < cards.length) {
    placeInRange(next, cards.slice(placed), 0, next.length)
  }
  return { boardCells, battlefield: next }
}

/** Place a featured card in the support row center, others on the creature row. */
export function placeFeaturedOnBattlefield(
  code: ChallengeCode,
  featured: AssistantCard,
  others: AssistantCard[],
  setupKind: AssistantSetupKind = 'rules',
): { boardCells: BoardCell[]; battlefield: (AssistantCard | null)[] } {
  const rows = initialBoardRows(code, setupKind)
  const { boardCells, battlefield: next } = emptyBattlefield(code, setupKind)
  const support = supportRowFromRows(rows)
  if (support) {
    const center = support.start + Math.floor(support.count / 2)
    next[center] = featured
  } else {
    next[0] = featured
  }
  const creatures = creatureRowFromRows(rows)
  placeInRange(next, others, creatures.start, creatures.count)
  return { boardCells, battlefield: next }
}
