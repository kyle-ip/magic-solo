import { getDeck } from '../data/deckRegistry'
import { resolvePlayerCombat } from './combat'
import {
  advanceChallenge,
  beginChallengeTurn,
  continueAfterPrompt,
  resolveGodCombat,
  resolveHordeCombat,
} from './challengeTurn'
import { DEFAULT_PLAYER_DECK } from './playerDecks'
import { defsFromDeck, type ChallengeCode, type GameState, type SetupConfig } from './types'
import {
  applyHeadDamageChoice,
  resolveHydraPrompt,
  startHydra,
} from './hydra'
import { startHorde } from './horde'
import { startGod } from './god'
import {
  beginPlayerTurn,
  checkHydraWin,
  dealDamageToChallengeCreature,
  summonPlayerCreature,
} from './helpers'
import { pushLog } from './log'

export type GameAction =
  | { type: 'START'; config: SetupConfig }
  | { type: 'SUMMON'; templateId: string }
  | { type: 'TOGGLE_ATTACKER'; id: string }
  | { type: 'ASSIGN_TARGET'; attackerId: string; targetId: string }
  | { type: 'SET_PHASE'; phase: 'main' | 'combat' | 'end' }
  | { type: 'RESOLVE_ATTACKS' }
  | { type: 'END_TURN' }
  | { type: 'ADVANCE' }
  | { type: 'ANSWER_PROMPT'; optionId: string }
  | { type: 'ASSIGN_BLOCKER'; blockerId: string; attackerId: string | null }
  | { type: 'DEAL_DIRECT_HEAD'; headId: string; amount: number }
  | { type: 'CLEAR_FX' }
  | { type: 'RESET' }

const baseFlags = {
  playerTurnsRemaining: 3,
  cannotCastSpells: false,
  headsIndestructible: false,
  swallowExileActive: false,
  extraChallengeTurn: false,
  consumingRage: false,
  descendPrey: false,
  touchHorned: false,
  unquenchable: false,
  interventionDamage: false,
  impulsiveCharge: false,
  impulsiveReturnDamage: false,
  ripToPieces: false,
  xenagosMustAttack: false,
  danceOfFlame: false,
  danceOfPanic: false,
  hydraTriggersDone: false,
}

export function createInitialSetup(code: ChallengeCode): GameState {
  return {
    code,
    theme: code === 'tfth' ? 'hydra' : code === 'tbth' ? 'horde' : 'god',
    status: 'setup',
    turnNumber: 0,
    activeSide: 'player',
    phase: 'setup',
    playerPhase: 'main',
    challengePhase: 'idle',
    playerDeckId: DEFAULT_PLAYER_DECK,
    castQueue: [],
    awaitingAdvance: false,
    player: { life: 20, muster: 0, creatures: [], graveyard: [], exile: [] },
    challenge: { library: [], battlefield: [], graveyard: [] },
    flags: { ...baseFlags },
    log: [],
    prompt: null,
    selectedAttackers: [],
    attackAssignments: {},
    blockAssignments: {},
    revealed: [],
    fx: null,
    resultKey: null,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START': {
      const deck = getDeck(action.config.code)
      if (!deck) return state
      const defs = defsFromDeck(deck.cards)
      const theme = deck.theme
      if (action.config.code === 'tfth') return startHydra(defs, theme, action.config)
      if (action.config.code === 'tbth') return startHorde(defs, theme, action.config)
      return startGod(defs, theme, action.config)
    }

    case 'SUMMON': {
      if (state.status !== 'playing' || state.activeSide !== 'player') return state
      if (state.playerPhase !== 'main') {
        return pushLog(state, 'musterMainOnly', 'info')
      }
      return summonPlayerCreature(state, action.templateId)
    }

    case 'SET_PHASE': {
      if (state.activeSide !== 'player' || state.status !== 'playing') return state
      return { ...state, playerPhase: action.phase, phase: action.phase }
    }

    case 'TOGGLE_ATTACKER': {
      if (state.activeSide !== 'player' || state.status !== 'playing') return state
      // Clicking a creature on main jumps into combat — no dragging required.
      let next = state
      if (next.playerPhase === 'main') {
        next = { ...next, playerPhase: 'combat', phase: 'combat' }
      }
      if (next.playerPhase !== 'combat') {
        return pushLog(next, 'moveToCombat', 'info')
      }
      const creature = next.player.creatures.find((c) => c.instanceId === action.id)
      if (!creature || creature.tapped || creature.summoningSickness) return next
      const wasSelected = next.selectedAttackers.includes(action.id)
      const selected = wasSelected
        ? next.selectedAttackers.filter((id) => id !== action.id)
        : [...next.selectedAttackers, action.id]
      const attackAssignments = { ...next.attackAssignments }
      if (wasSelected) delete attackAssignments[action.id]
      return {
        ...next,
        selectedAttackers: selected,
        attackAssignments,
      }
    }

    case 'ASSIGN_TARGET': {
      if (!state.selectedAttackers.includes(action.attackerId)) return state
      return {
        ...state,
        attackAssignments: {
          ...state.attackAssignments,
          [action.attackerId]: action.targetId,
        },
      }
    }

    case 'RESOLVE_ATTACKS': {
      if (state.activeSide !== 'player' || state.playerPhase !== 'combat') return state
      let next = resolvePlayerCombat(state)
      next = { ...next, playerPhase: 'main', phase: 'main' }
      return next
    }

    case 'END_TURN': {
      if (state.status !== 'playing' || state.activeSide !== 'player') return state

      if (state.code === 'tfth') {
        const checked = checkHydraWin(state)
        if (checked.status !== 'playing') return checked
        return beginChallengeTurn(checked)
      }

      if (state.code === 'tbth') {
        if (state.flags.playerTurnsRemaining > 0) {
          const next = pushLog(state, 'hordeNotAwake', 'info')
          return beginPlayerTurn(next)
        }
        return beginChallengeTurn(state)
      }

      return beginChallengeTurn(state)
    }

    case 'ADVANCE':
      return advanceChallenge(state)

    case 'ANSWER_PROMPT': {
      if (!state.prompt) return state
      const resume = state.prompt.resume

      if (state.code === 'tfth') {
        if (state.prompt.kind === 'choose_head_damage') {
          return applyHeadDamageChoice(
            state,
            action.optionId,
            state.prompt.amount ?? 1,
          )
        }
        let next = resolveHydraPrompt(state, action.optionId)
        if (next.activeSide === 'challenge' && !next.prompt && next.status === 'playing') {
          next = continueAfterPrompt(next)
        }
        return next
      }

      if (state.code === 'tbth' && resume === 'horde_combat') {
        const cleared =
          action.optionId === 'no_blocks'
            ? { ...state, blockAssignments: {} }
            : state
        let next = resolveHordeCombat(cleared)
        next = {
          ...next,
          challengePhase: 'done',
          revealed: [],
          flags: {
            ...next.flags,
            consumingRage: false,
            descendPrey: false,
            touchHorned: false,
            unquenchable: false,
          },
        }
        return next
      }

      if (state.code === 'tdag' && resume === 'god_combat') {
        const cleared =
          action.optionId === 'no_blocks'
            ? { ...state, blockAssignments: {} }
            : state
        let next = resolveGodCombat(cleared)
        next = {
          ...next,
          challengePhase: 'done',
          revealed: [],
          flags: {
            ...next.flags,
            impulsiveCharge: false,
            xenagosMustAttack: false,
          },
        }
        return next
      }

      return { ...state, prompt: null }
    }

    case 'ASSIGN_BLOCKER': {
      const blockAssignments = { ...state.blockAssignments }
      if (action.attackerId == null) delete blockAssignments[action.blockerId]
      else blockAssignments[action.blockerId] = action.attackerId
      return { ...state, blockAssignments }
    }

    case 'DEAL_DIRECT_HEAD':
      return dealDamageToChallengeCreature(state, action.headId, action.amount)

    case 'CLEAR_FX':
      return { ...state, fx: null }

    case 'RESET':
      return createInitialSetup(state.code)

    default:
      return state
  }
}
