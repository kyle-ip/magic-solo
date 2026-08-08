import type { CardInstance, ChallengeCode } from '../game/types'
import type { DeckTheme } from '../types'

export type NamedValue = {
  id: string
  label: string
  value: number
}

export type AssistantZone = 'library' | 'staging' | 'battlefield' | 'graveyard' | 'exile'

/** Library drop placement: top = index 0, bottom = end of array. */
export type LibraryPlacement = 'top' | 'bottom'

export type AssistantSetupKind = 'blank' | 'rules'

/** Fixed battlefield slots (Arena-style half board). */
export const BATTLEFIELD_SLOT_COUNT = 12
/** Two equal centered rows. */
export const BATTLEFIELD_FRONT_SLOTS = 6

export interface AssistantCard extends CardInstance {
  /** Free-form note shown on the card face. */
  note: string
}

export interface AssistantState {
  code: ChallengeCode
  theme: DeckTheme
  status: 'setup' | 'playing'
  setupKind: AssistantSetupKind
  startingHeads: number
  library: AssistantCard[]
  staging: AssistantCard | null
  /** Fixed board slots; null = empty seat. */
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

export function emptyBattlefield(): (AssistantCard | null)[] {
  return Array.from({ length: BATTLEFIELD_SLOT_COUNT }, () => null)
}

export function placeOnBattlefield(cards: AssistantCard[]): (AssistantCard | null)[] {
  const next = emptyBattlefield()
  let i = 0
  for (const card of cards) {
    while (i < next.length && next[i] != null) i += 1
    if (i >= next.length) break
    next[i] = card
    i += 1
  }
  return next
}
