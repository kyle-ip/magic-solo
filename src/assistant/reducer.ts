import { shuffle } from '../game/shuffle'
import type { CardDef } from '../game/types'
import { buildAssistantStart, createInitialSetup, nextValueId } from './setup'
import {
  type AssistantAction,
  type AssistantCard,
  type AssistantState,
  type AssistantZone,
  type LibraryPlacement,
  type NamedValue,
} from './types'

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
          return state
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
      default:
        return state
    }
  }
}
