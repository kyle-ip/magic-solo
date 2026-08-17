import { findCardDef, type PlayerEffect } from './playerDecks'
import {
  creatureHasFlying,
  creatureHasType,
  creatureKeywords,
} from './playerAbilities'
import { pushLog } from './log'
import { destroyChallengePermanent } from './helpers'
import type { GameState, PlayerCardInstance } from './types'

/** Bounce: put challenge permanent on top of its library. */
export function bounceChallengeCreature(
  state: GameState,
  targetId: string,
): GameState {
  const card = state.challenge.battlefield.find((c) => c.instanceId === targetId)
  if (!card || card.isGod) return pushLog(state, 'invalidTarget', 'info')
  const next: GameState = {
    ...state,
    challenge: {
      ...state.challenge,
      battlefield: state.challenge.battlefield.filter((c) => c.instanceId !== targetId),
      library: [
        { ...card, markedDamage: 0, tapped: false },
        ...state.challenge.library,
      ],
    },
  }
  return pushLog(next, 'bounceCreature', 'good', { name: card.name })
}

export function applyHeroicTriggers(
  state: GameState,
  targetPlayerCreatureId: string,
): GameState {
  const target = state.player.creatures.find((c) => c.instanceId === targetPlayerCreatureId)
  if (!target) return state
  const def = findCardDef(target.defId, state.playerDeckId)
  const eff = def?.effect
  let next = state
  if (eff?.type === 'heroic_self') {
    next = {
      ...next,
      player: {
        ...next.player,
        creatures: next.player.creatures.map((c) =>
          c.instanceId === target.instanceId
            ? { ...c, power: c.power + 1, toughness: c.toughness + 1 }
            : c,
        ),
      },
    }
    next = pushLog(next, 'heroicSelf', 'good', { name: target.name })
  }
  if (eff?.type === 'heroic_team') {
    next = {
      ...next,
      player: {
        ...next.player,
        creatures: next.player.creatures.map((c) => ({
          ...c,
          power: c.power + eff.power,
          toughness: c.toughness + eff.toughness,
          tempPower: (c.tempPower ?? 0) + eff.power,
          tempToughness: (c.tempToughness ?? 0) + eff.toughness,
          keywords:
            eff.grantTrample && !creatureKeywords(c).some((k) => /trample/i.test(k))
              ? [...c.keywords, 'trample']
              : c.keywords,
        })),
      },
    }
    next = pushLog(next, 'heroicTeam', 'good', {
      pt: `+${eff.power}/+${eff.toughness}`,
    })
  }
  return next
}

/** Attach bestow aura; caller must already pay bestow mana and remove card from hand. */
export function attachBestowPaid(
  state: GameState,
  card: PlayerCardInstance,
  hostId: string,
  bestow: Extract<PlayerEffect, { type: 'bestow' }>,
): GameState {
  const host = state.player.creatures.find((c) => c.instanceId === hostId)
  if (!host) return pushLog(state, 'invalidTarget', 'info')
  const next: GameState = {
    ...state,
    pendingCast: null,
    player: {
      ...state.player,
      creatures: state.player.creatures.map((c) =>
        c.instanceId === hostId
          ? {
              ...c,
              bestowed: {
                instanceId: card.instanceId,
                defId: card.defId,
                name: card.name,
                nameZh: card.nameZh,
                power: bestow.power,
                toughness: bestow.toughness,
                keywords: bestow.keywords ?? [],
                image: card.image,
                oracleText: card.oracleText,
                oracleTextZh: card.oracleTextZh,
                manaCost: card.manaCost,
                cmc: card.cmc,
                typeLine: card.typeLine,
                typeLineZh: card.typeLineZh,
                effect: card.effect,
              },
              keywords: [...new Set([...c.keywords, ...(bestow.keywords ?? [])])],
            }
          : c,
      ),
    },
  }
  return pushLog(next, 'bestowAttach', 'good', {
    aura: card.name,
    name: host.name,
  })
}

export function applySpiritEtbPumps(
  state: GameState,
  enteringId: string,
): GameState {
  const entering = state.player.creatures.find((c) => c.instanceId === enteringId)
  if (!entering || !creatureHasType(entering, 'Spirit', state.playerDeckId)) {
    return state
  }
  let next = state
  const pumps = next.player.creatures.filter((c) => {
    if (c.instanceId === enteringId) return false
    return findCardDef(c.defId, next.playerDeckId)?.effect.type === 'spirit_etb_pump'
  })
  if (!pumps.length) return next
  const ids = new Set(pumps.map((c) => c.instanceId))
  next = {
    ...next,
    player: {
      ...next.player,
      creatures: next.player.creatures.map((c) =>
        ids.has(c.instanceId)
          ? {
              ...c,
              power: c.power + 1,
              toughness: c.toughness + 1,
              tempPower: (c.tempPower ?? 0) + 1,
              tempToughness: (c.tempToughness ?? 0) + 1,
            }
          : c,
      ),
    },
  }
  return pushLog(next, 'spiritEtbPump', 'good', { n: pumps.length })
}

export function refreshSpiritsHaveFlash(state: GameState): GameState {
  const on = state.player.creatures.some(
    (c) => findCardDef(c.defId, state.playerDeckId)?.effect.type === 'spirits_have_flash',
  )
  if (state.flags.spiritsHaveFlash === on) return state
  return { ...state, flags: { ...state.flags, spiritsHaveFlash: on } }
}

export function destroyFlyingChallenge(
  state: GameState,
  targetId: string,
): GameState {
  const card = state.challenge.battlefield.find((c) => c.instanceId === targetId)
  if (!card || !creatureHasFlying(card)) {
    return pushLog(state, 'invalidTarget', 'info')
  }
  return destroyChallengePermanent(state, targetId)
}
