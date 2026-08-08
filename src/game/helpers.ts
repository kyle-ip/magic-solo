import { nextId } from './buildDeck'
import { addFxPop, FX_HORDE, FX_PLAYER_LIFE } from './fx'
import { DEFAULT_PLAYER_DECK, findTemplate, musterForTurn } from './playerDecks'
import type {
  CardInstance,
  ChallengeCode,
  GameState,
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

export function playerAlive(creature: PlayerCreature): boolean {
  return creature.toughness - creature.markedDamage > 0
}

export function dealDamageToChallengeCreature(
  state: GameState,
  instanceId: string,
  amount: number,
): GameState {
  let next = { ...state, challenge: { ...state.challenge, battlefield: [...state.challenge.battlefield] } }
  const idx = next.challenge.battlefield.findIndex((c) => c.instanceId === instanceId)
  if (idx < 0 || amount <= 0) return state
  const card = { ...next.challenge.battlefield[idx] }
  if (card.indestructible || (card.isHead && next.flags.headsIndestructible)) {
    return pushLog(next, 'indestructiblePrevented', 'info', { name: card.name })
  }
  card.markedDamage += amount
  next.challenge.battlefield[idx] = card
  next = pushLog(next, 'takesDamage', 'info', { name: card.name, n: amount })
  next = addFxPop(next, { targetId: instanceId, kind: 'damage', amount }, 'damage')
  if (effectiveToughness(card) <= 0) {
    next = destroyChallengePermanent(next, instanceId)
  }
  return next
}

export function destroyChallengePermanent(
  state: GameState,
  instanceId: string,
  opts: { toLibraryTop?: boolean } = {},
): GameState {
  const card = state.challenge.battlefield.find((c) => c.instanceId === instanceId)
  if (!card) return state

  // Xenagos Ascended can't leave while a Reveler is present
  if (card.isGod && revelersOf(state).length > 0) {
    return pushLog(state, 'xenagosCantLeave', 'info')
  }

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

  // Hero's Reward — simplified: life / muster for player
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
            ...next.player.exile.map((c) => ({
              ...c,
              summoningSickness: true,
              tapped: false,
              markedDamage: 0,
            })),
            ...next.player.creatures,
          ],
          exile: [],
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

  return checkWinLoss(next)
}

function applyHeroReward(state: GameState, card: CardInstance): GameState {
  let next = state
  const text = card.oracleText
  // Life gains
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
    next = {
      ...next,
      player: { ...next.player, muster: next.player.muster + 1 },
    }
    next = pushLog(next, 'heroRewardMuster', 'good')
  }
  // Horde artifacts
  if (card.name === 'Altar of Mogis') {
    const mins = minotaursOf(next).slice(0, 2)
    for (const m of mins) {
      next = destroyChallengePermanent(next, m.instanceId)
    }
  }
  if (card.name === 'Massacre Totem') {
    const mill = next.challenge.library.slice(0, 7)
    next = {
      ...next,
      challenge: {
        ...next.challenge,
        library: next.challenge.library.slice(7),
        graveyard: [...mill, ...next.challenge.graveyard],
      },
    }
    next = pushLog(next, 'massacreTotem', 'good')
  }
  if (card.name === 'Refreshing Elixir') {
    next = {
      ...next,
      player: { ...next.player, life: next.player.life + 5 },
    }
    next = pushLog(next, 'refreshingElixir', 'good')
  }
  if (card.name === 'Plundered Statue') {
    next = {
      ...next,
      player: { ...next.player, muster: next.player.muster + 1 },
    }
    next = pushLog(next, 'plunderedStatue', 'good')
  }
  if (card.name === 'Vitality Salve') {
    const g = next.player.graveyard[0]
    if (g) {
      next = {
        ...next,
        player: {
          ...next.player,
          graveyard: next.player.graveyard.slice(1),
          creatures: [
            { ...g, markedDamage: 0, tapped: false, summoningSickness: true },
            ...next.player.creatures,
          ],
        },
      }
      next = pushLog(next, 'vitalitySalve', 'good', { name: g.name })
    }
  }
  return next
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
      next = {
        ...next,
        challenge: {
          ...next.challenge,
          battlefield: [...next.challenge.battlefield, { ...card, markedDamage: 0 }],
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
  // Hero rewards on milled artifacts
  for (const card of mill) {
    if (card.isArtifact && /Hero's Reward/i.test(card.oracleText)) {
      next = applyHeroReward(
        {
          ...next,
          challenge: {
            ...next.challenge,
            // already in graveyard
          },
        },
        card,
      )
    }
  }
  return checkWinLoss(next)
}

export function damagePlayer(state: GameState, amount: number): GameState {
  if (amount <= 0) return state
  let next: GameState = {
    ...state,
    player: { ...state.player, life: state.player.life - amount },
  }
  next = pushLog(next, 'youTakeDamage', 'bad', { n: amount, life: next.player.life })
  next = addFxPop(next, { targetId: FX_PLAYER_LIFE, kind: 'damage', amount }, 'damage')
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

  if (state.code === 'tfth') {
    if (headsOf(state).length === 0 && state.status === 'playing') {
      // Win checked at end of turn in engine; allow mid-turn empty for grow
      // Only win if library grow finished and still no heads — handled by endTurn check
    }
  }

  return state
}

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

export function summonPlayerCreature(
  state: GameState,
  templateId: string,
): GameState {
  const template = findTemplate(templateId, state.playerDeckId)
  if (!template) return state
  if (state.player.muster < template.cost) {
    return pushLog(state, 'notEnoughMuster', 'info')
  }
  if (state.flags.cannotCastSpells && state.code === 'tfth') {
    // Disorienting Glower — treat summons as spells
    return pushLog(state, 'cannotCastUntilHydra', 'bad')
  }
  const creature: PlayerCreature = {
    instanceId: nextId('pl'),
    templateId: template.id,
    name: template.name,
    power: template.power,
    toughness: template.toughness,
    markedDamage: 0,
    tapped: false,
    summoningSickness: true,
    keywords: [...template.keywords],
    image: template.image,
  }
  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      muster: state.player.muster - template.cost,
      creatures: [...state.player.creatures, creature],
    },
  }
  return pushLog(next, 'musterCreature', 'good', { name: template.name, pt: `${template.power}/${template.toughness}` })
}

export function beginPlayerTurn(state: GameState): GameState {
  const turnNumber = state.turnNumber + 1
  const musterGain = musterForTurn(turnNumber)

  let next: GameState = {
    ...state,
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
    player: {
      ...state.player,
      muster: state.player.muster + musterGain,
      creatures: state.player.creatures.map((c) => ({
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
    next = pushLog(next, 'yourTurnMusterHorde', 'info', { turn: turnNumber, n: musterGain, left: next.flags.playerTurnsRemaining })
  } else {
    next = pushLog(next, 'yourTurnMuster', 'info', { turn: turnNumber, n: musterGain })
  }
  return next
}

export function emptyFlags() {
  return {
    playerTurnsRemaining: 0,
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
}

export function baseState(
  code: ChallengeCode,
  theme: GameState['theme'],
  config: SetupConfig,
): Omit<GameState, 'challenge'> & { challenge: GameState['challenge'] } {
  return {
    code,
    theme,
    status: 'playing',
    turnNumber: 0,
    activeSide: 'player',
    phase: 'main',
    playerPhase: 'main',
    challengePhase: 'idle',
    playerDeckId: config.playerDeckId ?? DEFAULT_PLAYER_DECK,
    castQueue: [],
    awaitingAdvance: false,
    player: {
      life: 20,
      muster: 0,
      creatures: [],
      graveyard: [],
      exile: [],
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
  const survivors: PlayerCreature[] = []
  const dead: PlayerCreature[] = []
  for (const c of next.player.creatures) {
    next = addFxPop(next, { targetId: c.instanceId, kind: 'damage', amount }, 'damage')
    const dmg = c.markedDamage + amount
    if (c.toughness - dmg <= 0) dead.push(c)
    else survivors.push({ ...c, markedDamage: dmg })
  }
  next = {
    ...next,
    player: {
      ...next.player,
      creatures: survivors,
      graveyard: [...dead, ...next.player.graveyard],
    },
  }
  if (dead.length) {
    next = pushLog(next, 'yourCreaturesDie', 'bad', { n: dead.length })
  }
  return next
}
