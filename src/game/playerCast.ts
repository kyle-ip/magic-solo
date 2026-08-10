import { findCardDef, type PlayerEffect } from './playerDecks'
import {
  emptyManaPool,
  parseManaCost,
  tryPayFromPool,
  type ManaColor,
  type ManaPool,
} from './mana'
import { makePlayerCardInstance } from './playerDraw'
import type {
  GameState,
  PlayerCardInstance,
  PlayerCreature,
  PlayerLand,
} from './types'
import { pushLog } from './log'
import {
  applyHeroCreatureMods,
  dealDamageToChallengeCreature,
  damagePlayer,
  millHorde,
  checkHordeWin,
  checkWinLoss,
} from './helpers'
import { addFxPop, FX_HORDE, FX_PLAYER_LIFE } from './fx'

function cardToGy(card: PlayerCardInstance | PlayerCreature | PlayerLand): PlayerCardInstance {
  if ('kind' in card && card.kind) {
    return { ...(card as PlayerCardInstance) }
  }
  const c = card as PlayerCreature | PlayerLand
  const def = findCardDef(c.defId)
  if (def) {
    const inst = makePlayerCardInstance(def)
    return { ...inst, instanceId: c.instanceId }
  }
  return {
    instanceId: c.instanceId,
    defId: c.defId,
    name: c.name,
    nameZh: c.name,
    typeLine: 'typeLine' in c ? c.typeLine : 'Creature',
    typeLineZh: '',
    oracleText: '',
    oracleTextZh: '',
    manaCost: '',
    cmc: 0,
    power: 'power' in c ? c.power : null,
    toughness: 'toughness' in c ? c.toughness : null,
    keywords: 'keywords' in c ? [...c.keywords] : [],
    kind: 'isLand' in c && c.isLand ? 'land' : 'creature',
    image: c.image,
    effect: { type: 'none' },
  }
}

export function autoTapForCost(state: GameState, manaCost: string): GameState | null {
  const need = parseManaCost(manaCost)
  let pool: ManaPool = { ...state.player.manaPool }
  let lands = state.player.lands.map((l) => ({ ...l }))
  let creatures = state.player.creatures.map((c) => ({ ...c }))

  const tapColor = (color: ManaColor): boolean => {
    const landIdx = lands.findIndex((l) => !l.tapped && l.produces.includes(color))
    if (landIdx >= 0) {
      lands[landIdx] = { ...lands[landIdx], tapped: true }
      pool = { ...pool, [color]: pool[color] + 1 }
      return true
    }
    const dorkIdx = creatures.findIndex(
      (c) =>
        !c.tapped && !c.summoningSickness && (c.produces?.includes(color) ?? false),
    )
    if (dorkIdx >= 0) {
      creatures[dorkIdx] = { ...creatures[dorkIdx], tapped: true }
      pool = { ...pool, [color]: pool[color] + 1 }
      return true
    }
    return false
  }

  const tapAny = (): boolean => {
    for (const color of ['R', 'G', 'W', 'U', 'B'] as ManaColor[]) {
      if (tapColor(color)) return true
    }
    return false
  }

  for (const c of ['W', 'U', 'B', 'R', 'G'] as ManaColor[]) {
    for (let i = 0; i < need[c]; i += 1) {
      if (!tapColor(c)) return null
    }
  }
  for (let i = 0; i < need.generic + need.C; i += 1) {
    if (!tapAny()) return null
  }

  const paid = tryPayFromPool(pool, need)
  if (!paid) return null

  return {
    ...state,
    player: {
      ...state.player,
      lands,
      creatures,
      manaPool: paid,
    },
  }
}

export function canAfford(state: GameState, manaCost: string): boolean {
  return autoTapForCost(state, manaCost) != null
}

export function playLand(state: GameState, handId: string): GameState {
  if (state.activeSide !== 'player' || state.playerPhase !== 'main') {
    return pushLog(state, 'playLandMainOnly', 'info')
  }
  if (state.player.landsPlayedThisTurn >= 1) {
    return pushLog(state, 'landDropUsed', 'info')
  }
  const card = state.player.hand.find((c) => c.instanceId === handId)
  if (!card || card.kind !== 'land') return state

  const land: PlayerLand = {
    instanceId: card.instanceId,
    defId: card.defId,
    name: card.name,
    typeLine: card.typeLine,
    tapped: false,
    produces: (card.produces ?? []) as PlayerLand['produces'],
    image: card.image,
    isLand: true,
  }

  const next: GameState = {
    ...state,
    player: {
      ...state.player,
      hand: state.player.hand.filter((c) => c.instanceId !== handId),
      lands: [...state.player.lands, land],
      landsPlayedThisTurn: state.player.landsPlayedThisTurn + 1,
    },
    pendingCast: null,
  }
  return pushLog(next, 'playLand', 'good', { name: card.name })
}

function revelersPresent(state: GameState): boolean {
  return state.challenge.battlefield.some((c) => c.isReveler)
}

function applyDamageAny(
  state: GameState,
  amount: number,
  targetId: string,
): GameState {
  let next = state
  if (targetId === FX_PLAYER_LIFE || targetId === 'player') {
    return damagePlayer(next, amount)
  }
  if (targetId === FX_HORDE || targetId === 'horde') {
    if (next.code !== 'tbth') return pushLog(next, 'invalidTarget', 'info')
    next = millHorde(next, amount)
    return checkHordeWin(next)
  }
  const ch = next.challenge.battlefield.find((c) => c.instanceId === targetId)
  if (ch) {
    if (ch.isGod && revelersPresent(next)) {
      const updated = { ...ch, markedDamage: ch.markedDamage + amount }
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          battlefield: next.challenge.battlefield.map((c) =>
            c.instanceId === targetId ? updated : c,
          ),
        },
      }
      next = pushLog(next, 'xenagosDamagedStuck', 'info', { n: amount })
      return addFxPop(next, { targetId, kind: 'damage', amount }, 'damage')
    }
    return dealDamageToChallengeCreature(next, targetId, amount)
  }
  const pl = next.player.creatures.find((c) => c.instanceId === targetId)
  if (pl) {
    next = addFxPop(next, { targetId, kind: 'damage', amount }, 'damage')
    const dmg = pl.markedDamage + amount
    if (pl.toughness - dmg <= 0) {
      return {
        ...next,
        player: {
          ...next.player,
          creatures: next.player.creatures.filter((c) => c.instanceId !== targetId),
          graveyard: [cardToGy(pl), ...next.player.graveyard],
        },
      }
    }
    return {
      ...next,
      player: {
        ...next.player,
        creatures: next.player.creatures.map((c) =>
          c.instanceId === targetId ? { ...c, markedDamage: dmg } : c,
        ),
      },
    }
  }
  return pushLog(next, 'invalidTarget', 'info')
}

function resolveEffect(
  state: GameState,
  effect: PlayerEffect,
  opts: { targetId?: string; fighterId?: string; selfId?: string },
): GameState {
  let next = state
  switch (effect.type) {
    case 'none':
    case 'mana_dork':
      return next
    case 'etb_self_pump': {
      if (!opts.selfId) return next
      next = {
        ...next,
        player: {
          ...next.player,
          creatures: next.player.creatures.map((c) =>
            c.instanceId === opts.selfId
              ? {
                  ...c,
                  power: c.power + effect.power,
                  toughness: c.toughness + effect.toughness,
                  tempPower: (c.tempPower ?? 0) + effect.power,
                  tempToughness: (c.tempToughness ?? 0) + effect.toughness,
                }
              : c,
          ),
        },
      }
      return pushLog(next, 'etbPump', 'good', {
        n: effect.power,
        name:
          next.player.creatures.find((c) => c.instanceId === opts.selfId)?.name ?? '',
      })
    }
    case 'damage_any': {
      if (!opts.targetId) return pushLog(next, 'needTarget', 'info')
      next = applyDamageAny(next, effect.amount, opts.targetId)
      return pushLog(next, 'spellDamage', 'good', { n: effect.amount })
    }
    case 'fog': {
      next = {
        ...next,
        flags: { ...next.flags, preventCombatDamageThisTurn: true },
      }
      return pushLog(next, 'castFog', 'good')
    }
    case 'pump_target': {
      if (!opts.targetId) return pushLog(next, 'needTarget', 'info')
      const mine = next.player.creatures.find((c) => c.instanceId === opts.targetId)
      if (!mine) return pushLog(next, 'invalidTarget', 'info')
      next = {
        ...next,
        player: {
          ...next.player,
          creatures: next.player.creatures.map((c) =>
            c.instanceId === opts.targetId
              ? {
                  ...c,
                  power: c.power + effect.power,
                  toughness: c.toughness + effect.toughness,
                  tempPower: (c.tempPower ?? 0) + effect.power,
                  tempToughness: (c.tempToughness ?? 0) + effect.toughness,
                }
              : c,
          ),
        },
      }
      return pushLog(next, 'pumpCreature', 'good', {
        name: mine.name,
        pt: `+${effect.power}/+${effect.toughness}`,
      })
    }
    case 'fight': {
      if (!opts.fighterId || !opts.targetId) return pushLog(next, 'needTarget', 'info')
      const fighter = next.player.creatures.find((c) => c.instanceId === opts.fighterId)
      const enemy = next.challenge.battlefield.find((c) => c.instanceId === opts.targetId)
      if (!fighter || !enemy) return pushLog(next, 'invalidTarget', 'info')
      next = pushLog(next, 'fight', 'info', { a: fighter.name, b: enemy.name })
      next = applyDamageAny(next, fighter.power, enemy.instanceId)
      const enemyPower = enemy.power ?? 0
      if (enemyPower > 0) {
        next = applyDamageAny(next, enemyPower, fighter.instanceId)
      }
      return next
    }
    default:
      return next
  }
}

export function castFromHand(
  state: GameState,
  handId: string,
  opts: { targetId?: string; fighterId?: string } = {},
): GameState {
  if (state.status !== 'playing' || state.activeSide !== 'player') return state
  if (state.flags.cannotCastSpells && state.code === 'tfth') {
    return pushLog(state, 'cannotCastUntilHydra', 'bad')
  }

  const card = state.player.hand.find((c) => c.instanceId === handId)
  if (!card) return state

  if (card.kind === 'land') {
    return playLand(state, handId)
  }

  if (card.kind === 'sorcery' && state.playerPhase !== 'main') {
    return pushLog(state, 'sorceryMainOnly', 'info')
  }
  if (
    (card.kind === 'instant' || card.kind === 'creature') &&
    state.playerPhase !== 'main' &&
    state.playerPhase !== 'combat'
  ) {
    return pushLog(state, 'castMainOrCombat', 'info')
  }

  const effect = card.effect
  if (effect.type === 'damage_any' && !opts.targetId) {
    return { ...state, pendingCast: { handInstanceId: handId, mode: 'damage' } }
  }
  if (effect.type === 'pump_target' && !opts.targetId) {
    return { ...state, pendingCast: { handInstanceId: handId, mode: 'pump' } }
  }
  if (effect.type === 'fight') {
    if (!opts.fighterId) {
      return { ...state, pendingCast: { handInstanceId: handId, mode: 'fight_mine' } }
    }
    if (!opts.targetId) {
      return {
        ...state,
        pendingCast: {
          handInstanceId: handId,
          mode: 'fight_theirs',
          fighterId: opts.fighterId,
        },
      }
    }
  }

  const paid = autoTapForCost(state, card.manaCost)
  if (!paid) {
    return pushLog(state, 'notEnoughMana', 'info')
  }

  let next: GameState = {
    ...paid,
    pendingCast: null,
    player: {
      ...paid.player,
      hand: paid.player.hand.filter((c) => c.instanceId !== handId),
    },
  }

  if (card.kind === 'creature') {
    const hasHaste = card.keywords.some((k) => /haste/i.test(k))
    const creature = applyHeroCreatureMods(next, {
      instanceId: nextIdKeep(card.instanceId),
      defId: card.defId,
      templateId: card.defId,
      name: card.name,
      power: card.power ?? 0,
      toughness: card.toughness ?? 0,
      markedDamage: 0,
      tapped: false,
      summoningSickness: !hasHaste,
      keywords: [...card.keywords],
      image: card.image,
      produces: card.produces ? [...card.produces] : undefined,
      tempPower: 0,
      tempToughness: 0,
    })
    next = {
      ...next,
      player: {
        ...next.player,
        creatures: [...next.player.creatures, creature],
      },
    }
    next = pushLog(next, 'castCreature', 'good', {
      name: card.name,
      pt: `${creature.power}/${creature.toughness}`,
    })
    if (effect.type === 'etb_self_pump') {
      next = resolveEffect(next, effect, { selfId: creature.instanceId })
    }
    return next
  }

  next = resolveEffect(next, effect, opts)
  next = {
    ...next,
    player: {
      ...next.player,
      graveyard: [card, ...next.player.graveyard],
    },
  }
  next = pushLog(next, 'castSpell', 'good', { name: card.name })
  return checkWinLoss(next)
}

function nextIdKeep(id: string): string {
  return id
}

export function clearTempPumps(state: GameState): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      creatures: state.player.creatures.map((c) => ({
        ...c,
        power: c.power - (c.tempPower ?? 0),
        toughness: Math.max(0, c.toughness - (c.tempToughness ?? 0)),
        tempPower: 0,
        tempToughness: 0,
      })),
      manaPool: emptyManaPool(),
    },
    flags: {
      ...state.flags,
      preventCombatDamageThisTurn: false,
    },
  }
}

export { emptyManaPool, cardToGy }
