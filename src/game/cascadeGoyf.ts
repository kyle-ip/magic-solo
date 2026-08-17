import { shuffle } from './shuffle'
import { pushLog } from './log'
import type { GameState, PlayerCardInstance } from './types'
import { findCardDef } from './playerDecks'

const CARD_TYPES = [
  'creature',
  'instant',
  'sorcery',
  'artifact',
  'enchantment',
  'planeswalker',
  'land',
  'tribal',
  'battle',
] as const

function typesInCard(typeLine: string): Set<string> {
  const lower = typeLine.toLowerCase()
  const found = new Set<string>()
  for (const t of CARD_TYPES) {
    if (lower.includes(t)) found.add(t)
  }
  return found
}

/** Distinct card types among player + challenge graveyards. */
export function graveyardTypeCount(state: GameState): number {
  const types = new Set<string>()
  for (const c of state.player.graveyard) {
    for (const t of typesInCard(c.typeLine)) types.add(t)
  }
  for (const c of state.challenge.graveyard) {
    for (const t of typesInCard(c.typeLine)) types.add(t)
  }
  return types.size
}

export function refreshGoyfStats(state: GameState): GameState {
  const n = graveyardTypeCount(state)
  const power = n
  const toughness = n + 1
  let changed = false
  const creatures = state.player.creatures.map((c) => {
    const def = findCardDef(c.defId, state.playerDeckId)
    if (def?.effect.type !== 'goyf_cda' && c.name !== 'Tarmogoyf') return c
    if (c.power === power && c.toughness === toughness) return c
    changed = true
    return { ...c, power, toughness }
  })
  if (!changed) return state
  return {
    ...state,
    player: { ...state.player, creatures },
  }
}

/**
 * Cascade: exile from library until a nonland with CMC < hostCmc;
 * optionally cast it for free; rest to bottom in random order.
 */
export function resolveCascade(
  state: GameState,
  hostCmc: number,
  castFree: (
    s: GameState,
    card: PlayerCardInstance,
  ) => GameState,
): GameState {
  let next = state
  const exiled: PlayerCardInstance[] = []
  let castable: PlayerCardInstance | null = null

  while (next.player.library.length > 0) {
    const top = next.player.library[0]
    next = {
      ...next,
      player: {
        ...next.player,
        library: next.player.library.slice(1),
      },
    }
    const isLand = top.kind === 'land' || /land/i.test(top.typeLine)
    if (!isLand && top.cmc < hostCmc) {
      castable = top
      break
    }
    exiled.push(top)
  }

  if (castable) {
    next = pushLog(next, 'cascadeHit', 'good', {
      name: castable.name,
      n: castable.cmc,
    })
    // Cast for free — put into exile staging then castFree handles zones
    next = castFree(next, castable)
  } else {
    next = pushLog(next, 'cascadeMiss', 'info')
  }

  if (exiled.length) {
    const bottom = shuffle(exiled)
    next = {
      ...next,
      player: {
        ...next.player,
        library: [...next.player.library, ...bottom],
      },
    }
    next = pushLog(next, 'cascadeBottom', 'info', { n: bottom.length })
  }

  return refreshGoyfStats(next)
}

/** Legendary rule: keep the newest same-name legendary, bury the rest. */
export function checkLegendarySba(state: GameState): GameState {
  let next = state
  const byName = new Map<string, string[]>()

  const consider = (
    id: string,
    name: string,
    typeLine: string,
  ) => {
    if (!/legendary/i.test(typeLine)) return
    const list = byName.get(name) ?? []
    list.push(id)
    byName.set(name, list)
  }

  for (const c of next.player.creatures) {
    const def = findCardDef(c.defId, next.playerDeckId)
    consider(c.instanceId, c.name, def?.typeLine ?? '')
  }
  for (const p of next.player.planeswalkers ?? []) {
    const def = findCardDef(p.defId, next.playerDeckId)
    consider(p.instanceId, p.name, def?.typeLine ?? 'Legendary Planeswalker')
  }

  const buryCreatureIds: string[] = []
  const buryPwIds: string[] = []
  for (const [, ids] of byName) {
    if (ids.length < 2) continue
    // Keep last (newest), bury earlier
    const keep = ids[ids.length - 1]
    for (const id of ids) {
      if (id === keep) continue
      if (next.player.creatures.some((c) => c.instanceId === id)) {
        buryCreatureIds.push(id)
      } else {
        buryPwIds.push(id)
      }
    }
  }

  if (buryCreatureIds.length) {
    const dead = next.player.creatures.filter((c) =>
      buryCreatureIds.includes(c.instanceId),
    )
    next = {
      ...next,
      player: {
        ...next.player,
        creatures: next.player.creatures.filter(
          (c) => !buryCreatureIds.includes(c.instanceId),
        ),
        graveyard: [
          ...dead.map((c) => ({
            instanceId: c.instanceId,
            defId: c.defId,
            name: c.name,
            nameZh: '',
            typeLine: 'Creature',
            typeLineZh: '',
            oracleText: '',
            oracleTextZh: '',
            manaCost: '',
            cmc: 0,
            power: c.power,
            toughness: c.toughness,
            keywords: c.keywords,
            kind: 'creature' as const,
            effect: { type: 'none' as const },
            image: c.image,
          })),
          ...next.player.graveyard,
        ],
      },
    }
    next = pushLog(next, 'legendaryRule', 'info', { n: buryCreatureIds.length })
  }
  if (buryPwIds.length) {
    const dead = next.player.planeswalkers.filter((p) =>
      buryPwIds.includes(p.instanceId),
    )
    next = {
      ...next,
      player: {
        ...next.player,
        planeswalkers: next.player.planeswalkers.filter(
          (p) => !buryPwIds.includes(p.instanceId),
        ),
        graveyard: [
          ...dead.map((p) => ({
            instanceId: p.instanceId,
            defId: p.defId,
            name: p.name,
            nameZh: p.name,
            typeLine: 'Legendary Planeswalker',
            typeLineZh: '',
            oracleText: '',
            oracleTextZh: '',
            manaCost: '',
            cmc: 0,
            power: null,
            toughness: null,
            keywords: [],
            kind: 'planeswalker' as const,
            effect: { type: 'none' as const },
            image: p.image,
          })),
          ...next.player.graveyard,
        ],
      },
    }
    next = pushLog(next, 'legendaryRule', 'info', { n: buryPwIds.length })
  }

  return refreshGoyfStats(next)
}
