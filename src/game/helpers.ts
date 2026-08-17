import { nextId } from './buildDeck'
import { addFxPop, FX_HORDE, FX_PLAYER_LIFE } from './fx'
import {
  createHeroInstance,
  getHeroDef,
  heroBoost,
  heroExtraDraw,
  heroKeywords,
  maxHeroesFor,
  type HeroInstance,
} from './heroes'
import { DEFAULT_PLAYER_DECK } from './playerDecks'
import { buildPlayerLibrary, drawCards } from './playerDraw'
import { emptyManaPool } from './mana'
import { makePlayerCardInstance } from './playerDraw'
import { findCardDef } from './playerDecks'
import type {
  CardInstance,
  ChallengeCode,
  GameState,
  PlayerCardInstance,
  PlayerCreature,
  SetupConfig,
} from './types'
import { pushLog } from './log'

export function headsOf(state: GameState): CardInstance[] {
  return state.challenge.battlefield.filter((c) => c.isHead)
}

export function minotaursOf(state: GameState): CardInstance[] {
  return state.challenge.battlefield.filter((c) => c.isMinotaur)
}

export function revelersOf(state: GameState): CardInstance[] {
  return state.challenge.battlefield.filter((c) => c.isReveler)
}

export function artifactsOf(state: GameState): CardInstance[] {
  return state.challenge.battlefield.filter((c) => c.isArtifact)
}

export function effectiveToughness(card: CardInstance): number {
  return (card.toughness ?? 0) - card.markedDamage
}

export function creatureToGyCard(
  c: PlayerCreature,
  deckId?: string,
): PlayerCardInstance {
  const def = findCardDef(c.defId, deckId)
  if (def) return { ...makePlayerCardInstance(def), instanceId: c.instanceId }
  return {
    instanceId: c.instanceId,
    defId: c.defId,
    name: c.name,
    nameZh: c.name,
    typeLine: 'Creature',
    typeLineZh: '',
    oracleText: '',
    oracleTextZh: '',
    manaCost: '',
    cmc: 0,
    power: c.power,
    toughness: c.toughness,
    keywords: [...c.keywords],
    kind: 'creature',
    image: c.image,
    effect: { type: 'none' },
    produces: c.produces ? [...c.produces] : undefined,
  }
}

export function playerAlive(creature: PlayerCreature): boolean {
  return creature.toughness - creature.markedDamage > 0
}

/** When a bestowed host dies, the Aura becomes a creature again (CR bestow). */
export function bestowFalloffCreatures(
  dead: PlayerCreature[],
  deckId: string | undefined,
): PlayerCreature[] {
  const out: PlayerCreature[] = []
  for (const d of dead) {
    if (!d.bestowed) continue
    const b = d.bestowed
    const def = findCardDef(b.defId, deckId)
    out.push({
      instanceId: b.instanceId,
      defId: b.defId,
      name: b.name,
      power: def?.power ?? b.power,
      toughness: def?.toughness ?? b.toughness,
      markedDamage: 0,
      tapped: false,
      summoningSickness: false,
      keywords: def ? [...def.keywords] : [...b.keywords],
      image: b.image,
    })
  }
  return out
}

/**
 * Remove dead player creatures: bestow falloff → creatures; Persist may return;
 * otherwise to graveyard.
 */
export function buryPlayerCreatures(
  state: GameState,
  deadIds: string[],
): GameState {
  const ids = [...new Set(deadIds)]
  if (!ids.length) return state
  const dead = state.player.creatures.filter((c) => ids.includes(c.instanceId))
  if (!dead.length) return state

  const falloff = bestowFalloffCreatures(dead, state.playerDeckId)
  const toGy: PlayerCardInstance[] = []
  const persisted: PlayerCreature[] = []

  for (const d of dead) {
    const def = findCardDef(d.defId, state.playerDeckId)
    const hasPersist =
      def?.effect.type === 'etb_gain_life' && Boolean(def.effect.persist)
    if (hasPersist && !(d.minusOneCounters ?? 0)) {
      const baseP = def?.power ?? d.power
      const baseT = def?.toughness ?? d.toughness
      persisted.push({
        instanceId: d.instanceId,
        defId: d.defId,
        name: d.name,
        power: Math.max(0, baseP - 1),
        toughness: Math.max(0, baseT - 1),
        markedDamage: 0,
        tapped: false,
        summoningSickness: true,
        keywords: def ? [...def.keywords] : [...d.keywords],
        image: d.image,
        produces: d.produces ? [...d.produces] : undefined,
        minusOneCounters: 1,
        monstrous: d.monstrous,
      })
    } else {
      toGy.push(creatureToGyCard(d, state.playerDeckId))
    }
  }

  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      creatures: [
        ...state.player.creatures.filter((c) => !ids.includes(c.instanceId)),
        ...falloff,
        ...persisted,
      ],
      graveyard: [...toGy, ...state.player.graveyard],
    },
  }
  if (falloff.length) {
    next = pushLog(next, 'bestowFalloff', 'info', { n: falloff.length })
  }
  for (const p of persisted) {
    next = pushLog(next, 'persistReturn', 'good', { name: p.name })
  }
  if (toGy.length) {
    next = pushLog(next, 'yourCreaturesDie', 'bad', { n: toGy.length })
  }
  return next
}

export function isIndestructible(state: GameState, card: CardInstance): boolean {
  return card.indestructible || (card.isHead && state.flags.headsIndestructible)
}

/** Mark damage; indestructible does not prevent damage (official Magic). */
export function dealDamageToChallengeCreature(
  state: GameState,
  instanceId: string,
  amount: number,
  opts: { deathtouch?: boolean } = {},
): GameState {
  let next = { ...state, challenge: { ...state.challenge, battlefield: [...state.challenge.battlefield] } }
  const idx = next.challenge.battlefield.findIndex((c) => c.instanceId === instanceId)
  if (idx < 0 || amount <= 0) return state
  const card = { ...next.challenge.battlefield[idx] }
  card.markedDamage += amount
  next.challenge.battlefield[idx] = card
  next = pushLog(next, 'takesDamage', 'info', { name: card.name, n: amount })
  next = addFxPop(next, { targetId: instanceId, kind: 'damage', amount }, 'damage')
  const lethal =
    effectiveToughness(card) <= 0 || (opts.deathtouch && amount > 0)
  if (lethal && !isIndestructible(next, card)) {
    next = destroyChallengePermanent(next, instanceId)
  }
  return next
}

export function checkXenagosSba(state: GameState): GameState {
  if (state.code !== 'tdag' || state.status !== 'playing') return state
  const god = state.challenge.battlefield.find((c) => c.isGod)
  if (!god) return state
  if (revelersOf(state).length > 0) return state
  if (effectiveToughness(god) <= 0) {
    return destroyChallengePermanent(state, god.instanceId)
  }
  return state
}

export function destroyChallengePermanent(
  state: GameState,
  instanceId: string,
  opts: { toLibraryTop?: boolean } = {},
): GameState {
  const card = state.challenge.battlefield.find((c) => c.instanceId === instanceId)
  if (!card) return state

  if (isIndestructible(state, card)) {
    return pushLog(state, 'indestructiblePrevented', 'info', { name: card.name })
  }

  // Xenagos Ascended can't leave while a Reveler is present
  if (card.isGod && revelersOf(state).length > 0) {
    return pushLog(state, 'xenagosCantLeave', 'info')
  }

  const wasReveler = card.isReveler

  let next: GameState = {
    ...state,
    challenge: {
      ...state.challenge,
      battlefield: state.challenge.battlefield.filter((c) => c.instanceId !== instanceId),
      graveyard: opts.toLibraryTop
        ? state.challenge.graveyard
        : [card, ...state.challenge.graveyard],
      library: opts.toLibraryTop
        ? [{ ...card, markedDamage: 0, tapped: false }, ...state.challenge.library]
        : state.challenge.library,
    },
  }
  next = pushLog(next, 'destroyed', 'bad', { name: card.name })

  // Hero's Reward — life / draw for player
  if (/Hero's Reward/i.test(card.oracleText)) {
    next = applyHeroReward(next, card)
  }

  if (card.isHead && next.code === 'tfth') {
    if (next.flags.swallowExileActive && next.player.exile.length) {
      next = {
        ...next,
        player: {
          ...next.player,
          creatures: [
            ...next.player.exile
              .filter((c): c is PlayerCreature => 'markedDamage' in c)
              .map((c) => ({
              ...c,
              summoningSickness: true,
              tapped: false,
              markedDamage: 0,
            })),
            ...next.player.creatures,
          ],
          exile: next.player.exile.filter((c) => !('markedDamage' in c)),
        },
        flags: { ...next.flags, swallowExileActive: false },
      }
      next = pushLog(next, 'swallowReturn', 'good')
    }
    next = growNewHeads(next)
  }

  if (card.isGod && next.code === 'tdag') {
    next = {
      ...next,
      status: 'won',
      resultKey: 'godFallen',
    }
    next = pushLog(next, 'xenagosLeaves', 'good')
  }

  next = checkWinLoss(next)
  if (wasReveler && next.status === 'playing') {
    next = checkXenagosSba(next)
  }
  return next
}

/** Exported for tests and Horde milling. */
export function applyHeroReward(state: GameState, card: CardInstance): GameState {
  let next = state

  // Named Horde artifacts with non-generic (or nested) rewards first
  if (card.name === 'Altar of Mogis') {
    const mins = minotaursOf(next).slice(0, 2)
    for (const m of mins) {
      next = destroyChallengePermanent(next, m.instanceId)
    }
    return next
  }
  if (card.name === 'Massacre Totem') {
    next = pushLog(next, 'massacreTotem', 'good')
    return millHorde(next, 7)
  }
  if (card.name === 'Vitality Salve') {
    const gy = next.player.graveyard.filter((c) => c.kind === 'creature')
    if (gy.length === 0) return next
    if (gy.length === 1) return returnCreatureFromGraveyard(next, gy[0].instanceId)
    return {
      ...next,
      prompt: {
        id: `p-${Date.now()}`,
        kind: 'vitality_return',
        titleKey: 'vitalitySalve',
        messageKey: 'vitalitySalveMsg',
        resume: 'vitality',
        options: gy.map((c) => ({
          id: c.instanceId,
          labelKey: 'returnCreatureOpt',
          labelParams: { pt: `${c.power}/${c.toughness}` },
          name: c.name,
        })),
      },
    }
  }

  // Generic Hero's Reward parsing (Elixir / Statue / Heads / Revelers, etc.)
  // Do NOT add named double-dips for Refreshing Elixir / Plundered Statue.
  const text = card.oracleText
  const lifeMatch = text.match(/gains? (\d+) life/i)
  if (lifeMatch) {
    const n = Number(lifeMatch[1])
    next = {
      ...next,
      player: { ...next.player, life: next.player.life + n },
    }
    next = pushLog(next, 'heroRewardLife', 'good', { n })
    next = addFxPop(next, { targetId: FX_PLAYER_LIFE, kind: 'heal', amount: n }, 'heal')
  }
  if (/draws? a card/i.test(text)) {
    next = drawCards(next, 1)
    if (next.status === 'playing') {
      next = pushLog(next, 'heroRewardDraw', 'good')
    }
  }
  return next
}

export function returnCreatureFromGraveyard(
  state: GameState,
  instanceId: string,
): GameState {
  const g = state.player.graveyard.find((c) => c.instanceId === instanceId)
  if (!g || g.kind !== 'creature') return state
  const returned = applyHeroCreatureMods(state, {
    instanceId: nextId('pl'),
    defId: g.defId,
    templateId: g.defId,
    name: g.name,
    power: g.power ?? 0,
    toughness: g.toughness ?? 0,
    markedDamage: 0,
    tapped: false,
    summoningSickness: true,
    keywords: [...g.keywords],
    image: g.image,
    produces: g.produces ? [...g.produces] : undefined,
    tempPower: 0,
    tempToughness: 0,
  })
  let next: GameState = {
    ...state,
    prompt: null,
    player: {
      ...state.player,
      graveyard: state.player.graveyard.filter((c) => c.instanceId !== instanceId),
      creatures: [returned, ...state.player.creatures],
    },
  }
  return pushLog(next, 'vitalitySalve', 'good', { name: g.name })
}

export function growNewHeads(state: GameState): GameState {
  let next = state
  const revealed = next.challenge.library.slice(0, 2)
  next = {
    ...next,
    challenge: {
      ...next.challenge,
      library: next.challenge.library.slice(2),
    },
    revealed,
  }
  next = pushLog(next, 'growingNewHeads', 'cast')
  for (const card of revealed) {
    if (card.isHead) {
      const entered = {
        ...card,
        markedDamage: 0,
        indestructible: next.flags.headsIndestructible,
      }
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          battlefield: [...next.challenge.battlefield, entered],
        },
      }
      next = pushLog(next, 'growsOntoBattlefield', 'bad', { name: card.name })
    } else {
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          graveyard: [card, ...next.challenge.graveyard],
        },
      }
      next = pushLog(next, 'toGraveyard', 'info', { name: card.name })
    }
  }
  return next
}

export function millHorde(state: GameState, amount: number): GameState {
  if (amount <= 0) return state
  const mill = state.challenge.library.slice(0, amount)
  let next: GameState = {
    ...state,
    challenge: {
      ...state.challenge,
      library: state.challenge.library.slice(amount),
      graveyard: [...mill, ...state.challenge.graveyard],
    },
  }
  next = pushLog(next, 'hordeMills', 'good', { n: amount, milled: mill.length })
  next = addFxPop(next, { targetId: FX_HORDE, kind: 'mill', amount: mill.length }, 'mill')
  // Hero rewards on milled artifacts (nested, e.g. Massacre Totem)
  for (const card of mill) {
    if (card.isArtifact && /Hero's Reward/i.test(card.oracleText)) {
      next = applyHeroReward(next, card)
      if (next.prompt) break
    }
  }
  return checkWinLoss(next)
}

export function damagePlayer(state: GameState, amount: number): GameState {
  if (amount <= 0) return state
  let remaining = amount
  let heroes = state.player.heroes.map((h) => ({ ...h }))
  for (let i = 0; i < heroes.length; i += 1) {
    const h = heroes[i]
    if (
      h.effect.type === 'preventDamagePerTurn' &&
      !h.preventUsedThisTurn &&
      remaining > 0
    ) {
      const prevented = Math.min(remaining, h.effect.amount)
      remaining -= prevented
      heroes[i] = { ...h, preventUsedThisTurn: true }
      if (prevented > 0) {
        state = pushLog(state, 'heroPrevented', 'good', {
          name: h.name,
          n: prevented,
        })
      }
    }
  }
  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      heroes,
      life: state.player.life - remaining,
    },
  }
  if (remaining > 0) {
    next = pushLog(next, 'youTakeDamage', 'bad', { n: remaining, life: next.player.life })
    next = addFxPop(next, { targetId: FX_PLAYER_LIFE, kind: 'damage', amount: remaining }, 'damage')
  }
  return checkWinLoss(next)
}

export function checkWinLoss(state: GameState): GameState {
  if (state.status === 'won' || state.status === 'lost') return state

  if (state.player.life <= 0) {
    return {
      ...pushLog(state, 'defeatZeroLife', 'bad'),
      status: 'lost',
      resultKey: 'zeroLife',
    }
  }

  return state
}

/** Official: win only at end of turn if no Heads remain. */
export function checkHydraWin(state: GameState): GameState {
  if (state.code !== 'tfth' || state.status !== 'playing') return state
  if (headsOf(state).length === 0) {
    return {
      ...pushLog(state, 'winNoHeads', 'good'),
      status: 'won',
      resultKey: 'noHeads',
    }
  }
  return state
}

export function checkHordeWin(state: GameState): GameState {
  if (state.code !== 'tbth' || state.status !== 'playing') return state
  const creatures = state.challenge.battlefield.filter((c) => c.power != null)
  if (state.challenge.library.length === 0 && creatures.length === 0) {
    return {
      ...pushLog(state, 'winHordeBroken', 'good'),
      status: 'won',
      resultKey: 'hordeBroken',
    }
  }
  return state
}

export function applyHeroCreatureMods(
  state: GameState,
  creature: PlayerCreature,
): PlayerCreature {
  const boost = heroBoost(state.player.heroes)
  const extraKw = heroKeywords(state.player.heroes)
  const keywords = [...new Set([...creature.keywords, ...extraKw])]
  return {
    ...creature,
    power: creature.power + boost.power,
    toughness: creature.toughness + boost.toughness,
    keywords,
  }
}

function clearMarkedDamageOnChallenge(state: GameState): GameState {
  return {
    ...state,
    challenge: {
      ...state.challenge,
      battlefield: state.challenge.battlefield.map((c) =>
        c.markedDamage ? { ...c, markedDamage: 0 } : c,
      ),
    },
  }
}

function resetHeroTurnFlags(heroes: HeroInstance[]): HeroInstance[] {
  return heroes.map((h) => ({ ...h, preventUsedThisTurn: false }))
}

function clearEotPlayerEffects(state: GameState): GameState {
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
      landsPlayedThisTurn: 0,
    },
    flags: {
      ...state.flags,
      preventCombatDamageThisTurn: false,
    },
    pendingCast: null,
  }
}

export function beginPlayerTurn(state: GameState): GameState {
  // End previous turn's until-EOT effects, then start new turn
  let next = clearEotPlayerEffects(state)
  next = clearMarkedDamageOnChallenge(next)

  const turnNumber = next.turnNumber + 1
  const skipDraw = turnNumber === 1

  next = {
    ...next,
    activeSide: 'player',
    phase: 'main',
    playerPhase: 'main',
    challengePhase: 'idle',
    turnNumber,
    selectedAttackers: [],
    attackAssignments: {},
    blockAssignments: {},
    revealed: [],
    castQueue: [],
    awaitingAdvance: false,
    fx: null,
    pendingCast: null,
    player: {
      ...next.player,
      heroes: resetHeroTurnFlags(next.player.heroes),
      landsPlayedThisTurn: 0,
      manaPool: emptyManaPool(),
      lands: next.player.lands.map((l) => ({ ...l, tapped: false })),
      creatures: next.player.creatures.map((c) => ({
        ...c,
        tapped: false,
        summoningSickness: false,
        markedDamage: 0,
      })),
    },
  }

  if (next.code === 'tbth' && next.flags.playerTurnsRemaining > 0) {
    next = {
      ...next,
      flags: {
        ...next.flags,
        playerTurnsRemaining: next.flags.playerTurnsRemaining - 1,
      },
    }
  }

  if (!skipDraw) {
    next = drawCards(next, 1 + heroExtraDraw(next.player.heroes))
  } else if (heroExtraDraw(next.player.heroes) > 0) {
    // Provider still draws on turn 1? Official: don't draw on first turn.
    // Extra draw from Provider is "beginning of turn" — allow it as additional.
    next = drawCards(next, heroExtraDraw(next.player.heroes))
  }

  if (next.status !== 'playing') return next

  if (next.code === 'tbth') {
    next = pushLog(next, 'yourTurnDrawHorde', 'info', {
      turn: turnNumber,
      left: next.flags.playerTurnsRemaining,
      hand: next.player.hand.length,
    })
  } else {
    next = pushLog(next, 'yourTurnDraw', 'info', {
      turn: turnNumber,
      hand: next.player.hand.length,
    })
  }
  return next
}

export function emptyFlags() {
  return {
    playerTurnsRemaining: 0,
    cannotCastSpells: false,
    headsIndestructible: false,
    hideExpiresInHydraEnds: 0,
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
    xenagosTrample: false,
    danceOfFlame: false,
    danceOfPanic: false,
    hydraTriggersDone: false,
    hydraBreathDone: false,
    preventCombatDamageThisTurn: false,
    spiritsHaveFlash: false,
  }
}

function buildHeroes(config: SetupConfig, code: ChallengeCode): HeroInstance[] {
  const max = maxHeroesFor(code)
  const ids = [...new Set(config.heroIds ?? [])].slice(0, max)
  const heroes: HeroInstance[] = []
  for (const id of ids) {
    const def = getHeroDef(id)
    if (!def) continue
    heroes.push(createHeroInstance(def, nextId('hero')))
  }
  return heroes
}

export function baseState(
  code: ChallengeCode,
  theme: GameState['theme'],
  config: SetupConfig,
): Omit<GameState, 'challenge'> & { challenge: GameState['challenge'] } {
  const playerDeckId = config.playerDeckId ?? DEFAULT_PLAYER_DECK
  const library = buildPlayerLibrary(playerDeckId)
  const hand = library.slice(0, 7)
  const rest = library.slice(7)

  return {
    code,
    theme,
    status: 'playing',
    turnNumber: 0,
    activeSide: 'player',
    phase: 'main',
    playerPhase: 'main',
    challengePhase: 'idle',
    playerDeckId,
    castQueue: [],
    awaitingAdvance: false,
    pendingCast: null,
    player: {
      life: 20,
      library: rest,
      hand,
      lands: [],
      creatures: [],
      graveyard: [],
      exile: [],
      heroes: buildHeroes(config, code),
      landsPlayedThisTurn: 0,
      manaPool: emptyManaPool(),
    },
    challenge: {
      library: [],
      battlefield: [],
      graveyard: [],
    },
    flags: {
      ...emptyFlags(),
      playerTurnsRemaining:
        code === 'tbth' ? (config.playerTurnsBeforeHorde ?? 3) : 0,
    },
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

export function damagePlayerCreatures(
  state: GameState,
  amount: number,
): GameState {
  if (amount <= 0) return state
  let next = { ...state, player: { ...state.player, creatures: [...state.player.creatures] } }
  const deadIds: string[] = []
  const survivors: PlayerCreature[] = []
  for (const c of next.player.creatures) {
    next = addFxPop(next, { targetId: c.instanceId, kind: 'damage', amount }, 'damage')
    const dmg = c.markedDamage + amount
    if (c.toughness - dmg <= 0) {
      deadIds.push(c.instanceId)
    } else survivors.push({ ...c, markedDamage: dmg })
  }
  next = {
    ...next,
    player: {
      ...next.player,
      creatures: survivors,
    },
  }
  return buryPlayerCreatures(next, deadIds)
}

/** Tick Hide duration at end of a Hydra turn. Cast sets countdown to 2. */
export function tickHydraHide(state: GameState): GameState {
  if (!state.flags.headsIndestructible && state.flags.hideExpiresInHydraEnds <= 0) {
    return state
  }
  const remaining = state.flags.hideExpiresInHydraEnds - 1
  if (remaining <= 0) {
    let next: GameState = {
      ...state,
      flags: {
        ...state.flags,
        headsIndestructible: false,
        hideExpiresInHydraEnds: 0,
      },
      challenge: {
        ...state.challenge,
        battlefield: state.challenge.battlefield.map((c) =>
          c.isHead ? { ...c, indestructible: false } : c,
        ),
      },
    }
    // SBAs: heads with lethal marked damage die once Hide ends
    for (const head of [...headsOf(next)]) {
      if (effectiveToughness(head) <= 0) {
        next = destroyChallengePermanent(next, head.instanceId)
      }
    }
    return next
  }
  return {
    ...state,
    flags: { ...state.flags, hideExpiresInHydraEnds: remaining },
  }
}

export function clearSwallowWindow(state: GameState): GameState {
  if (!state.flags.swallowExileActive) return state
  let next: GameState = {
    ...state,
    flags: { ...state.flags, swallowExileActive: false },
  }
  if (next.player.exile.length) {
    next = pushLog(next, 'swallowExpired', 'info')
  }
  return next
}

export function clearChallengeDamage(state: GameState): GameState {
  return clearMarkedDamageOnChallenge(state)
}
