import { getDeck } from '../data/deckStore'
import { resolvePlayerCombat } from './combat'
import {
  advanceChallenge,
  beginChallengeTurn,
  continueAfterPrompt,
  resolveGodCombat,
  resolveHordeCombat,
} from './challengeTurn'
import { DEFAULT_PLAYER_DECK } from './playerDecks'
import {
  castFromHand,
  activateCreature,
  castFlashback,
  resolveScryPrompt,
  resolveBrainstormPrompt,
  resolveEdictPrompt,
  resolveCrawlPrompt,
} from './playerCast'
import { emptyManaPool } from './mana'
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
  emptyFlags,
  returnCreatureFromGraveyard,
} from './helpers'
import { ensureLogSeqAtLeast, maxLogSeqFromIds, pushLog } from './log'
import { canBlockAttacker } from './playerAbilities'
import { ensureIdSeqAtLeast, maxSeqFromIds } from './buildDeck'

export type GameAction =
  | { type: 'START'; config: SetupConfig }
  | { type: 'PLAY_LAND'; handId: string }
  | { type: 'CAST'; handId: string; targetId?: string; fighterId?: string }
  | { type: 'CAST_FLASHBACK'; gyId: string; targetId?: string; fighterId?: string }
  | { type: 'ACTIVATE'; creatureId: string; targetId?: string }
  | { type: 'CANCEL_PENDING' }
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
  | { type: 'HYDRATE'; state: GameState }

function collectGameInstanceIds(state: GameState): string[] {
  const ids: string[] = []
  const push = (id: string | undefined) => {
    if (id) ids.push(id)
  }
  for (const c of state.player.library) push(c.instanceId)
  for (const c of state.player.hand) push(c.instanceId)
  for (const c of state.player.lands) push(c.instanceId)
  for (const c of state.player.creatures) push(c.instanceId)
  for (const c of state.player.graveyard) push(c.instanceId)
  for (const c of state.player.exile) push(c.instanceId)
  for (const c of state.player.heroes) push(c.instanceId)
  for (const c of state.challenge.library) push(c.instanceId)
  for (const c of state.challenge.battlefield) push(c.instanceId)
  for (const c of state.challenge.graveyard) push(c.instanceId)
  for (const c of state.castQueue) push(c.instanceId)
  for (const c of state.revealed) push(c.instanceId)
  return ids
}

function syncSeqsFromGameState(state: GameState): void {
  ensureIdSeqAtLeast(maxSeqFromIds(collectGameInstanceIds(state)))
  ensureLogSeqAtLeast(maxLogSeqFromIds(state.log.map((e) => e.id)))
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
    pendingCast: null,
    player: {
      life: 20,
      library: [],
      hand: [],
      lands: [],
      creatures: [],
      graveyard: [],
      exile: [],
      heroes: [],
      landsPlayedThisTurn: 0,
      manaPool: emptyManaPool(),
    },
    challenge: { library: [], battlefield: [], graveyard: [] },
    flags: { ...emptyFlags(), playerTurnsRemaining: 3 },
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

    case 'PLAY_LAND': {
      if (state.status !== 'playing' || state.activeSide !== 'player') return state
      return castFromHand(state, action.handId)
    }

    case 'CAST': {
      if (state.status !== 'playing' || state.activeSide !== 'player') return state
      return castFromHand(state, action.handId, {
        targetId: action.targetId,
        fighterId: action.fighterId,
      })
    }

    case 'CAST_FLASHBACK': {
      if (state.status !== 'playing' || state.activeSide !== 'player') return state
      return castFlashback(state, action.gyId, {
        targetId: action.targetId,
        fighterId: action.fighterId,
      })
    }

    case 'ACTIVATE': {
      if (state.status !== 'playing' || state.activeSide !== 'player') return state
      return activateCreature(state, action.creatureId, { targetId: action.targetId })
    }

    case 'CANCEL_PENDING':
      return { ...state, pendingCast: null }

    case 'SET_PHASE': {
      if (state.activeSide !== 'player' || state.status !== 'playing') return state
      const leavingCombat =
        state.playerPhase === 'combat' && action.phase !== 'combat'
      return {
        ...state,
        playerPhase: action.phase,
        phase: action.phase,
        pendingCast: null,
        ...(leavingCombat
          ? { selectedAttackers: [], attackAssignments: {} }
          : {}),
      }
    }

    case 'TOGGLE_ATTACKER': {
      if (state.activeSide !== 'player' || state.status !== 'playing') return state
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
      if (state.pendingCast) {
        const p = state.pendingCast
        if ('activateCreatureId' in p && p.activateCreatureId) {
          return activateCreature(state, p.activateCreatureId, {
            targetId: action.targetId,
          })
        }
        const cast = 'fromGraveyard' in p && p.fromGraveyard ? castFlashback : castFromHand
        if (p.mode === 'damage' || p.mode === 'pump' || p.mode === 'destroy' || p.mode === 'fangs') {
          return cast(state, p.handInstanceId, { targetId: action.targetId })
        }
        if (p.mode === 'fight_mine') {
          return cast(state, p.handInstanceId, { fighterId: action.targetId })
        }
        if (p.mode === 'fight_theirs') {
          return cast(state, p.handInstanceId, {
            fighterId: p.fighterId,
            targetId: action.targetId,
          })
        }
      }
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
      const kind = state.prompt.kind

      if (kind === 'scry') {
        return resolveScryPrompt(state, action.optionId)
      }

      if (kind === 'brainstorm') {
        return resolveBrainstormPrompt(state, action.optionId)
      }

      if (kind === 'choose_edict') {
        return resolveEdictPrompt(state, action.optionId)
      }

      if (kind === 'choose_crawl' || kind === 'choose_crawl_zombie') {
        return resolveCrawlPrompt(state, action.optionId)
      }

      if (kind === 'vitality_return') {
        let next = returnCreatureFromGraveyard(state, action.optionId)
        if (next.activeSide === 'challenge' && !next.prompt && next.status === 'playing') {
          next = continueAfterPrompt(next)
        }
        return next
      }

      if (state.code === 'tfth') {
        if (kind === 'choose_head_damage') {
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
          action.optionId === 'no_blocks' && !state.flags.descendPrey
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
            xenagosTrample: false,
          },
        }
        return next
      }

      return { ...state, prompt: null }
    }

    case 'ASSIGN_BLOCKER': {
      const blockAssignments = { ...state.blockAssignments }
      if (action.attackerId == null) {
        delete blockAssignments[action.blockerId]
      } else {
        const blocker = state.player.creatures.find(
          (c) => c.instanceId === action.blockerId,
        )
        const attacker = state.revealed.find((c) => c.instanceId === action.attackerId)
        if (
          blocker &&
          attacker &&
          !canBlockAttacker(blocker, attacker)
        ) {
          return pushLog(state, 'cannotBlockFlying', 'info', { name: attacker.name })
        }
        blockAssignments[action.blockerId] = action.attackerId
      }
      return { ...state, blockAssignments }
    }

    case 'DEAL_DIRECT_HEAD':
      return dealDamageToChallengeCreature(state, action.headId, action.amount)

    case 'CLEAR_FX':
      return { ...state, fx: null }

    case 'RESET':
      return createInitialSetup(state.code)

    case 'HYDRATE': {
      if (action.state.code !== state.code || action.state.status !== 'playing') {
        return state
      }
      const next = { ...action.state, fx: null }
      syncSeqsFromGameState(next)
      return next
    }

    default:
      return state
  }
}
