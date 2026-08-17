import { buryPlayerCreatures } from './helpers'
import { pushLog } from './log'
import { effectivePower } from './playerAbilities'
import { findCardDef } from './playerDecks'
import type {
  CardInstance,
  GameState,
  PlayerCreature,
  StackObject,
} from './types'

function wanderers(state: GameState): PlayerCreature[] {
  return state.player.creatures.filter((c) => {
    const def = findCardDef(c.defId, state.playerDeckId)
    return def?.name === 'Mausoleum Wanderer' || c.name === 'Mausoleum Wanderer'
  })
}

function fogInHand(state: GameState) {
  return state.player.hand.find(
    (c) => c.effect.type === 'fog' || /^Fog$/i.test(c.name),
  )
}

function canOfferFog(state: GameState): NonNullable<ReturnType<typeof fogInHand>> | null {
  if (state.flags.preventCombatDamageThisTurn) return null
  if (state.flags.cannotCastSpells) return null
  return fogInHand(state) ?? null
}

function canOfferWandererCounter(state: GameState): PlayerCreature | null {
  const ws = wanderers(state)
  if (ws.length === 0) return null
  // Challenge cards are typically mana value 0 — Wanderer power ≥ 0 counters.
  const eligible = ws.find((w) => effectivePower(state, w) >= 0)
  return eligible ?? null
}

function stackPriorityMessageKey(hasCounter: boolean, hasFog: boolean): string {
  if (hasCounter && hasFog) return 'stackPriorityMsgBoth'
  if (hasCounter) return 'stackPriorityMsgCounter'
  if (hasFog) return 'stackPriorityMsgFog'
  return 'stackPriorityMsg'
}

/** Open priority before a challenge spell on the stack resolves. */
export function offerStackPriority(
  state: GameState,
  card: CardInstance,
  resolveChallengeSpell?: (s: GameState, card: CardInstance) => GameState,
): GameState {
  const stackItem: StackObject = {
    id: `stack-${card.instanceId}-${Date.now()}`,
    source: 'challenge',
    name: card.name,
    challengeCard: card,
  }
  const options: NonNullable<GameState['prompt']>['options'] = [
    { id: 'pass', labelKey: 'stackPass' },
  ]

  const wanderer = canOfferWandererCounter(state)
  if (wanderer) {
    options.push({
      id: `counter:${wanderer.instanceId}`,
      labelKey: 'stackCounterWanderer',
      name: wanderer.name,
    })
  }

  const fog = canOfferFog(state)
  if (fog) {
    options.push({
      id: `fog:${fog.instanceId}`,
      labelKey: 'stackCastFog',
      name: fog.name,
    })
  }

  const withStack: GameState = {
    ...state,
    stack: [...(state.stack ?? []), stackItem],
    awaitingAdvance: false,
    challengePhase: 'resolve',
    revealed: [card],
    prompt: {
      id: `prio-${stackItem.id}`,
      kind: 'choose_stack_priority',
      titleKey: 'stackPriorityTitle',
      messageKey: stackPriorityMessageKey(Boolean(wanderer), Boolean(fog)),
      messageParams: { name: card.name },
      resume: stackItem.id,
      options,
    },
  }

  // Only "Pass" — no meaningful choice; resolve immediately.
  if (
    options.length === 1 &&
    options[0].id === 'pass' &&
    resolveChallengeSpell
  ) {
    return resolveStackPriorityAnswer(withStack, 'pass', resolveChallengeSpell)
  }

  return withStack
}

export function resolveStackPriorityAnswer(
  state: GameState,
  optionId: string,
  resolveChallengeSpell: (s: GameState, card: CardInstance) => GameState,
): GameState {
  const top = (state.stack ?? [])[state.stack!.length - 1]
  if (!top?.challengeCard) {
    return { ...state, prompt: null, stack: [] }
  }
  const card = top.challengeCard

  if (optionId.startsWith('counter:')) {
    const wid = optionId.slice('counter:'.length)
    let next = buryPlayerCreatures(state, [wid])
    next = {
      ...next,
      prompt: null,
      stack: (next.stack ?? []).slice(0, -1),
      revealed: [],
      challenge: {
        ...next.challenge,
        graveyard: [card, ...next.challenge.graveyard],
      },
    }
    next = pushLog(next, 'stackCountered', 'good', { name: card.name })
    return next
  }

  if (optionId.startsWith('fog:')) {
    const hid = optionId.slice('fog:'.length)
    const fog = state.player.hand.find((c) => c.instanceId === hid)
    if (!fog) return { ...state, prompt: null }
    let next: GameState = {
      ...state,
      prompt: null,
      player: {
        ...state.player,
        hand: state.player.hand.filter((c) => c.instanceId !== hid),
        graveyard: [fog, ...state.player.graveyard],
      },
      flags: { ...state.flags, preventCombatDamageThisTurn: true },
    }
    next = pushLog(next, 'fogResolve', 'good')
    // Spell remains on stack; re-offer priority (fog already spent).
    return offerStackPriority(
      {
        ...next,
        stack: (next.stack ?? []).slice(0, -1),
        revealed: [card],
      },
      card,
      resolveChallengeSpell,
    )
  }

  // Pass — resolve spell
  let next: GameState = {
    ...state,
    prompt: null,
    stack: (state.stack ?? []).slice(0, -1),
    awaitingAdvance: false,
    challengePhase: 'resolve',
  }
  next = resolveChallengeSpell(next, card)
  return next
}
