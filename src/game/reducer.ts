import { getDeck } from '../data/deckStore'
import { resolvePlayerCombat } from './combat'
import {
  advanceChallenge,
  continueAfterPrompt,
  continueAfterStackResolve,
  endPlayerTurn,
  resolveGodCombat,
  resolveHordeCombat,
} from './challengeTurn'
import { resolveStackPriorityAnswer } from './stack'
import { addFxPop } from './fx'
import { DEFAULT_PLAYER_DECK } from './playerDecks'
import {
  castFromHand,
  activateCreature,
  activatePlaneswalker,
  castFlashback,
  resolveScryPrompt,
  resolveBrainstormPrompt,
  resolveEdictPrompt,
  resolveCrawlPrompt,
  resolveMonstrousFight,
  grantTempKeyword,
} from './playerCast'
import { destroyFlyingChallenge } from './playerExtras'
import { emptyManaPool } from './mana'
import { defsFromDeck, type ChallengeCode, type GameState, type SetupConfig } from './types'
import {
  applyHeadDamageChoice,
  castHydraCard,
  resolveHydraPrompt,
  startHydra,
} from './hydra'
import { castHordeCard, startHorde } from './horde'
import { castGodCard, startGod } from './god'
import {
  damagePlayer,
  dealDamageToChallengeCreature,
  emptyFlags,
  leavePlayerEnchantments,
  resolveDiscardHandPrompt,
  resolveMulliganPrompt,
  returnCreatureFromGraveyard,
  sacrificePlayerArtifact,
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
  for (const c of state.player.planeswalkers ?? []) push(c.instanceId)
  for (const c of state.player.enchantments) push(c.instanceId)
  for (const c of state.player.artifacts) push(c.instanceId)
  for (const c of state.player.graveyard) push(c.instanceId)
  for (const c of state.player.exile) push(c.instanceId)
  for (const c of state.player.heroes) push(c.instanceId)
  for (const c of state.challenge.library) push(c.instanceId)
  for (const c of state.challenge.battlefield) push(c.instanceId)
  for (const c of state.challenge.graveyard) push(c.instanceId)
  for (const c of state.challenge.exile ?? []) push(c.instanceId)
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
      planeswalkers: [],
      enchantments: [],
      artifacts: [],
      graveyard: [],
      exile: [],
      heroes: [],
      landsPlayedThisTurn: 0,
      manaPool: emptyManaPool(),
    },
    challenge: { library: [], battlefield: [], graveyard: [], exile: [] },
    flags: { ...emptyFlags(), playerTurnsRemaining: 3 },
    log: [],
    prompt: null,
    mulliganCount: 0,
    stack: [],
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
      if (
        state.player.planeswalkers.some(
          (p) => p.instanceId === action.creatureId,
        )
      ) {
        return activatePlaneswalker(state, action.creatureId, {
          targetId: action.targetId,
        })
      }
      return activateCreature(state, action.creatureId, {
        targetId: action.targetId,
      })
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
        if ('activatePlaneswalkerId' in p && p.activatePlaneswalkerId) {
          return activatePlaneswalker(state, p.activatePlaneswalkerId, {
            targetId: action.targetId,
            abilityIndex: p.loyaltyAbilityIndex,
          })
        }
        if ('activateCreatureId' in p && p.activateCreatureId) {
          return activateCreature(state, p.activateCreatureId, {
            targetId: action.targetId,
          })
        }
        const cast = 'fromGraveyard' in p && p.fromGraveyard ? castFlashback : castFromHand
        if (p.mode === 'damage' || p.mode === 'pump' || p.mode === 'destroy' || p.mode === 'fangs' || p.mode === 'bounce') {
          return cast(state, p.handInstanceId, { targetId: action.targetId })
        }
        if (p.mode === 'etb_tap') {
          const enemy = state.challenge.battlefield.find((c) => c.instanceId === action.targetId)
          if (!enemy) return pushLog(state, 'invalidTarget', 'info')
          let next: typeof state = {
            ...state,
            pendingCast: null,
            challenge: {
              ...state.challenge,
              battlefield: state.challenge.battlefield.map((c) =>
                c.instanceId === action.targetId
                  ? { ...c, tapped: true, keywords: c.keywords.filter((k) => !/hexproof/i.test(k)) }
                  : c,
              ),
            },
          }
          next = addFxPop(
            next,
            { targetId: action.targetId, kind: 'debuff', label: '⟳' },
            'debuff',
          )
          return pushLog(next, 'etbTapOpp', 'good', { name: enemy.name })
        }
        if (p.mode === 'bestow' || p.mode === 'bloodrush') {
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
      return endPlayerTurn(state)
    }

    case 'ADVANCE':
      return advanceChallenge(state)

    case 'ANSWER_PROMPT': {
      if (!state.prompt) return state
      const resume = state.prompt.resume
      const kind = state.prompt.kind

      if (kind === 'choose_mulligan') {
        return resolveMulliganPrompt(state, action.optionId)
      }

      if (kind === 'choose_discard_hand') {
        let next = resolveDiscardHandPrompt(state, action.optionId)
        if (
          resume === 'end_turn' &&
          !next.prompt &&
          next.status === 'playing' &&
          next.activeSide === 'player'
        ) {
          next = endPlayerTurn(next)
        }
        return next
      }

      if (kind === 'choose_stack_priority') {
        const castSpell = (s: GameState, card: import('./types').CardInstance) => {
          let n = s
          if (n.code === 'tfth') n = castHydraCard(n, card)
          else if (n.code === 'tbth') n = castHordeCard(n, card)
          else n = castGodCard(n, card)
          return n
        }
        let next = resolveStackPriorityAnswer(state, action.optionId, castSpell)
        if (next.prompt) return next
        if (next.status !== 'playing') return next
        return continueAfterStackResolve(next)
      }

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

      if (kind === 'choose_loyalty' && resume) {
        const idx = Number(action.optionId)
        return activatePlaneswalker(
          { ...state, prompt: null },
          resume,
          { abilityIndex: Number.isFinite(idx) ? idx : 0 },
        )
      }

      if (kind === 'bestow_mode' && resume) {
        if (action.optionId === 'creature') {
          return castFromHand({ ...state, prompt: null }, resume, { asCreature: true })
        }
        if (action.optionId.startsWith('bestow:')) {
          const hostId = action.optionId.slice('bestow:'.length)
          return castFromHand({ ...state, prompt: null }, resume, {
            targetId: hostId,
          })
        }
      }

      if (kind === 'bloodrush_mode' && resume) {
        if (action.optionId === 'cast') {
          return castFromHand({ ...state, prompt: null }, resume, { asCreature: true })
        }
        if (action.optionId.startsWith('rush:')) {
          const tid = action.optionId.slice('rush:'.length)
          return castFromHand({ ...state, prompt: null }, resume, {
            targetId: tid,
          })
        }
      }

      if (kind === 'choose_monstrous_flyer') {
        return destroyFlyingChallenge({ ...state, prompt: null }, action.optionId)
      }

      if (kind === 'choose_monstrous_fight' && resume) {
        const [fighterId, remStr] = resume.split(':')
        const remaining = remStr ? Number(remStr) : 1
        return resolveMonstrousFight(
          { ...state, prompt: null },
          fighterId,
          action.optionId,
          remaining,
        )
      }

      if (kind === 'choose_rattlechains_hexproof') {
        return grantTempKeyword(
          { ...state, prompt: null },
          action.optionId,
          'hexproof',
        )
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

      if (kind === 'impulsive_destruction') {
        let next: GameState = { ...state, prompt: null }
        if (action.optionId === 'damage') {
          next = damagePlayer(next, 3)
        } else if (action.optionId.startsWith('ench:')) {
          next = leavePlayerEnchantments(next, [action.optionId.slice(5)])
        } else if (action.optionId.startsWith('art:')) {
          next = sacrificePlayerArtifact(next, action.optionId.slice(4))
          next = pushLog(next, 'sacArtifactEnchantment', 'info', {
            name:
              state.player.artifacts.find((a) => a.instanceId === action.optionId.slice(4))
                ?.name ?? 'Artifact',
          })
        }
        if (next.activeSide === 'challenge' && !next.prompt && next.status === 'playing') {
          next = continueAfterPrompt(next)
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
      const hydrated = action.state
      const next = {
        ...hydrated,
        player: {
          ...hydrated.player,
          planeswalkers: hydrated.player.planeswalkers ?? [],
          enchantments: hydrated.player.enchantments ?? [],
          artifacts: hydrated.player.artifacts ?? [],
        },
        challenge: {
          ...hydrated.challenge,
          exile: hydrated.challenge.exile ?? [],
        },
        fx: null,
        mulliganCount: hydrated.mulliganCount ?? 0,
        stack: hydrated.stack ?? [],
      }
      syncSeqsFromGameState(next)
      return next
    }

    default:
      return state
  }
}
