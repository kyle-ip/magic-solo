import { findCardDef, type PlayerEffect } from './playerDecks'
import { heroBoost } from './heroes'
import { pushLog } from './log'
import type { GameState, PlayerCreature } from './types'

export function hasKeyword(creature: PlayerCreature, re: RegExp): boolean {
  return creature.keywords.some((k) => re.test(k))
}

export function hasFirstStrike(creature: PlayerCreature): boolean {
  return creatureKeywords(creature).some((k) => /first strike/i.test(k))
}

export function hasDoubleStrike(creature: PlayerCreature): boolean {
  return creatureKeywords(creature).some((k) => /double strike/i.test(k))
}

/** Creature subtypes from a type line (after the em dash / hyphen). */
export function creatureTypesFromTypeLine(typeLine: string): string[] {
  const m = typeLine.match(/[—–-]\s*(.+)$/)
  if (!m) return []
  return m[1]
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function creatureHasType(
  creature: PlayerCreature,
  creatureType: string,
  deckId?: string | null,
): boolean {
  const def = findCardDef(creature.defId, deckId)
  if (!def) return false
  const types = creatureTypesFromTypeLine(def.typeLine)
  const want = creatureType.toLowerCase()
  return types.some((t) => t.toLowerCase() === want)
}

export function flyerAnthemBonus(
  state: GameState,
  creature: PlayerCreature,
): { power: number; toughness: number } {
  if (!hasKeyword(creature, /flying/i)) return { power: 0, toughness: 0 }
  let power = 0
  let toughness = 0
  for (const other of state.player.creatures) {
    if (other.instanceId === creature.instanceId) continue
    const def = findCardDef(other.defId, state.playerDeckId)
    const eff = def?.effect
    if (eff?.type === 'anthem_other_flyers') {
      power += eff.power
      toughness += eff.toughness
    }
  }
  return { power, toughness }
}

/** Lord-style +P/+T for other creatures sharing a subtype. */
export function typeAnthemBonus(
  state: GameState,
  creature: PlayerCreature,
): { power: number; toughness: number } {
  let power = 0
  let toughness = 0
  for (const other of state.player.creatures) {
    if (other.instanceId === creature.instanceId) continue
    const def = findCardDef(other.defId, state.playerDeckId)
    const eff = def?.effect
    if (eff?.type === 'anthem_creature_type') {
      if (!creatureHasType(creature, eff.creatureType, state.playerDeckId)) continue
      power += eff.power
      toughness += eff.toughness
    }
    if (eff?.type === 'human_lieutenant') {
      if (!creatureHasType(creature, 'Human', state.playerDeckId)) continue
      power += eff.power
      toughness += eff.toughness
    }
  }
  return { power, toughness }
}

export function anthemBonus(
  state: GameState,
  creature: PlayerCreature,
): { power: number; toughness: number } {
  const fly = flyerAnthemBonus(state, creature)
  const typed = typeAnthemBonus(state, creature)
  let power = fly.power + typed.power
  let toughness = fly.toughness + typed.toughness
  for (const other of state.player.creatures) {
    if (other.instanceId === creature.instanceId) continue
    const def = findCardDef(other.defId, state.playerDeckId)
    const eff = def?.effect
    if (eff?.type === 'anthem_other_creatures') {
      power += eff.power
      toughness += eff.toughness
    }
  }
  const bestowed = creature.bestowed
  if (bestowed) {
    power += bestowed.power
    toughness += bestowed.toughness
  }
  return { power, toughness }
}

export function creatureKeywords(creature: PlayerCreature): string[] {
  if (!creature.bestowed?.keywords?.length) return creature.keywords
  return [...new Set([...creature.keywords, ...creature.bestowed.keywords])]
}

export function effectivePower(state: GameState, creature: PlayerCreature): number {
  return creature.power + anthemBonus(state, creature).power
}

export function effectiveToughness(
  state: GameState,
  creature: PlayerCreature,
): number {
  return creature.toughness + anthemBonus(state, creature).toughness
}

export function applyProwessPumps(state: GameState): GameState {
  const pumps = state.player.creatures.filter((c) => hasKeyword(c, /prowess/i))
  if (pumps.length === 0) return state
  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      creatures: state.player.creatures.map((c) =>
        hasKeyword(c, /prowess/i)
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
  return pushLog(next, 'prowessTrigger', 'good', { n: pumps.length })
}

/** Goblin Guide–style attack trigger vs challenge library + attack pumps. */
export function applyAttackTriggers(
  state: GameState,
  attackers: PlayerCreature[],
): GameState {
  let next = state
  const attackerCount = attackers.length
  for (const a of attackers) {
    const def = findCardDef(a.defId, state.playerDeckId)
    const eff = def?.effect
    if (eff?.type === 'attack_pump_per_attacker') {
      const pump = attackerCount * eff.powerPer
      if (pump > 0) {
        next = {
          ...next,
          player: {
            ...next.player,
            creatures: next.player.creatures.map((c) =>
              c.instanceId === a.instanceId
                ? {
                    ...c,
                    power: c.power + pump,
                    tempPower: (c.tempPower ?? 0) + pump,
                  }
                : c,
            ),
          },
        }
        next = pushLog(next, 'attackPumpPerAttacker', 'good', {
          name: a.name,
          n: pump,
        })
      }
      continue
    }
    if (eff?.type === 'attack_battalion') {
      const need = eff.minAttackers ?? 3
      if (attackerCount >= need) {
        next = {
          ...next,
          player: {
            ...next.player,
            creatures: next.player.creatures.map((c) =>
              c.instanceId === a.instanceId
                ? {
                    ...c,
                    power: c.power + eff.power,
                    toughness: c.toughness + eff.toughness,
                    tempPower: (c.tempPower ?? 0) + eff.power,
                    tempToughness: (c.tempToughness ?? 0) + eff.toughness,
                  }
                : c,
            ),
          },
        }
        next = pushLog(next, 'attackBattalion', 'good', {
          name: a.name,
          pt: `+${eff.power}/+${eff.toughness}`,
        })
      }
      continue
    }
    if (eff?.type !== 'attack_guide') continue
    const top = next.challenge.library[0]
    if (!top) {
      next = pushLog(next, 'guideEmpty', 'info', { name: a.name })
      continue
    }
    const typeLine = top.typeLine ?? ''
    next = pushLog(next, 'guideReveal', 'info', { name: a.name, card: top.name })
    if (/Land/i.test(typeLine)) {
      // Challenge has no hand: put the land on the bottom (keeps library size).
      const [land, ...rest] = next.challenge.library
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          library: [...rest, land],
        },
      }
      next = pushLog(next, 'guideLandBottom', 'info', { card: land.name })
    }
  }
  return next
}

export function creatureHasWard(creature: PlayerCreature): boolean {
  return hasKeyword(creature, /ward/i)
}

export function isActivatableEffect(effect: PlayerEffect): boolean {
  return (
    effect.type === 'activate_sac_damage' ||
    effect.type === 'activate_draw' ||
    effect.type === 'activate_monstrosity' ||
    effect.type === 'activate_sac_exile_gy' ||
    effect.type === 'scavenge_ooze'
  )
}

export function getCreatureEffect(
  state: GameState,
  creature: PlayerCreature,
): PlayerEffect | undefined {
  return findCardDef(creature.defId, state.playerDeckId)?.effect
}

export function canActivateCreature(
  state: GameState,
  creatureId: string,
): boolean {
  if (state.status !== 'playing' || state.activeSide !== 'player') return false
  if (state.pendingCast || state.prompt) return false
  if (state.playerPhase !== 'main' && state.playerPhase !== 'combat') return false
  const c = state.player.creatures.find((x) => x.instanceId === creatureId)
  if (!c || c.tapped || c.summoningSickness) return false
  const effect = getCreatureEffect(state, c)
  if (!effect || !isActivatableEffect(effect)) return false
  if (effect.type === 'activate_monstrosity' && c.monstrous) return false
  if (effect.type === 'scavenge_ooze') {
    return (
      state.challenge.graveyard.length > 0 || state.player.graveyard.length > 0
    )
  }
  if (effect.type === 'activate_draw') {
    // Affordability checked at activation time via autoTap
    return true
  }
  return true
}

function textHasKeyword(
  keywords: string[],
  oracleText: string | undefined,
  re: RegExp,
): boolean {
  if (keywords.some((k) => re.test(k))) return true
  return oracleText ? re.test(oracleText) : false
}

export function creatureHasFlying(creature: {
  keywords: string[]
  oracleText?: string
}): boolean {
  return textHasKeyword(creature.keywords, creature.oracleText, /flying/i)
}

export function creatureHasReach(creature: {
  keywords: string[]
  oracleText?: string
}): boolean {
  return textHasKeyword(creature.keywords, creature.oracleText, /reach/i)
}

export function creatureHasDeathtouch(creature: {
  keywords: string[]
  oracleText?: string
}): boolean {
  return textHasKeyword(creature.keywords, creature.oracleText, /deathtouch/i)
}

/** Delta vs printed P/T (+ hero ETB boost). Anthem / temp / counters / monstrosity. */
export function creatureEnhancement(
  state: GameState,
  creature: PlayerCreature,
): { power: number; toughness: number; monstrous: boolean } | null {
  const def = findCardDef(creature.defId, state.playerDeckId)
  if (!def || def.power == null || def.toughness == null) {
    if (creature.monstrous) return { power: 0, toughness: 0, monstrous: true }
    return null
  }
  const boost = heroBoost(state.player.heroes)
  const baseP = def.power + boost.power
  const baseT = def.toughness + boost.toughness
  const curP = effectivePower(state, creature)
  const curT = effectiveToughness(state, creature)
  const power = curP - baseP
  const toughness = curT - baseT
  if (!creature.monstrous && power === 0 && toughness === 0) return null
  return { power, toughness, monstrous: Boolean(creature.monstrous) }
}

export function formatEnhancementLabel(
  enh: { power: number; toughness: number; monstrous: boolean },
): string {
  const parts: string[] = []
  if (enh.monstrous) parts.push('M')
  if (enh.power !== 0 || enh.toughness !== 0) {
    const p = enh.power > 0 ? `+${enh.power}` : String(enh.power)
    const t = enh.toughness > 0 ? `+${enh.toughness}` : String(enh.toughness)
    parts.push(`${p}/${t}`)
  }
  return parts.join(' ')
}

/** True when blocker can legally block this attacker (flying/reach). */
export function canBlockAttacker(
  blocker: { keywords: string[]; oracleText?: string },
  attacker: { keywords: string[]; oracleText?: string },
): boolean {
  if (!creatureHasFlying(attacker)) return true
  return creatureHasFlying(blocker) || creatureHasReach(blocker)
}
