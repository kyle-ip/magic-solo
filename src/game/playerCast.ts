import { findCardDef, type PlayerEffect } from './playerDecks'
import {
  emptyManaPool,
  formatManaCost,
  parseManaCost,
  tryPayFromPool,
  type ManaColor,
  type ManaCost,
  type ManaPool,
} from './mana'
import { drawCards, makePlayerCardInstance } from './playerDraw'
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
  destroyChallengePermanent,
  millHorde,
  checkHordeWin,
  checkWinLoss,
} from './helpers'
import { addFxPop, FX_HORDE, FX_PLAYER_LIFE } from './fx'
import { applyProwessPumps, creatureHasDeathtouch, effectivePower } from './playerAbilities'

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

export function canAffordCard(state: GameState, card: PlayerCardInstance): boolean {
  const prepared = prepareCastCost(state, card, false)
  return autoTapForCost(prepared.state, prepared.manaCost) != null
}

function millOwnLibrary(state: GameState, n: number): GameState {
  if (n <= 0) return state
  const mill = state.player.library.slice(0, n)
  if (mill.length === 0) return state
  return {
    ...state,
    player: {
      ...state.player,
      library: state.player.library.slice(mill.length),
      graveyard: [...mill, ...state.player.graveyard],
    },
  }
}

function gyInstantSorceryCount(state: GameState): number {
  return state.player.graveyard.filter(
    (c) => c.kind === 'instant' || c.kind === 'sorcery',
  ).length
}

function reduceGeneric(cost: ManaCost, by: number): ManaCost {
  return { ...cost, generic: Math.max(0, cost.generic - by) }
}

/** Apply Terror / Delve cost reductions. Delve exile only when `commit` is true. */
function prepareCastCost(
  state: GameState,
  card: PlayerCardInstance,
  commit = false,
): { state: GameState; manaCost: string } {
  let need = parseManaCost(card.manaCost)
  let next = state

  if (card.effect.type === 'terror_discount') {
    need = reduceGeneric(need, gyInstantSorceryCount(state))
    return { state: next, manaCost: formatManaCost(need) }
  }

  if (card.effect.type === 'delve') {
    const available = next.player.graveyard.length
    const base = parseManaCost(card.manaCost)
    let exileCount = Math.min(base.generic, available)
    need = reduceGeneric(base, exileCount)
    for (let ex = 0; ex <= Math.min(base.generic, available); ex += 1) {
      const trial = reduceGeneric(base, ex)
      if (autoTapForCost(next, formatManaCost(trial)) != null) {
        exileCount = ex
        need = trial
        break
      }
    }
    if (commit && exileCount > 0) {
      next = {
        ...next,
        player: {
          ...next.player,
          graveyard: next.player.graveyard.slice(0, -exileCount),
        },
      }
      next = pushLog(next, 'delveExile', 'info', { n: exileCount })
    }
    return { state: next, manaCost: formatManaCost(need) }
  }

  return { state: next, manaCost: card.manaCost }
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

  const entersTapped =
    card.effect.type === 'etb_gain_life' ||
    card.effect.type === 'etb_exile_opp_graveyard' ||
    /enters the battlefield tapped/i.test(card.oracleText)

  const land: PlayerLand = {
    instanceId: card.instanceId,
    defId: card.defId,
    name: card.name,
    typeLine: card.typeLine,
    tapped: entersTapped,
    produces: (card.produces ?? []) as PlayerLand['produces'],
    image: card.image,
    isLand: true,
  }

  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      hand: state.player.hand.filter((c) => c.instanceId !== handId),
      lands: [...state.player.lands, land],
      landsPlayedThisTurn: state.player.landsPlayedThisTurn + 1,
    },
    pendingCast: null,
  }
  next = pushLog(next, 'playLand', 'good', { name: card.name })

  if (card.effect.type === 'etb_gain_life') {
    next = {
      ...next,
      player: {
        ...next.player,
        life: next.player.life + card.effect.amount,
      },
    }
    next = pushLog(next, 'gainLife', 'good', { n: card.effect.amount })
  }
  if (card.effect.type === 'etb_exile_opp_graveyard') {
    const n = next.challenge.graveyard.length
    next = {
      ...next,
      challenge: { ...next.challenge, graveyard: [] },
    }
    if (n > 0) next = pushLog(next, 'exileOppGraveyard', 'good', { n })
  }
  return next
}

function revelersPresent(state: GameState): boolean {
  return state.challenge.battlefield.some((c) => c.isReveler)
}

function applyDamageAny(
  state: GameState,
  amount: number,
  targetId: string,
  opts: { deathtouch?: boolean } = {},
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
    return dealDamageToChallengeCreature(next, targetId, amount, {
      deathtouch: opts.deathtouch,
    })
  }
  const pl = next.player.creatures.find((c) => c.instanceId === targetId)
  if (pl) {
    next = addFxPop(next, { targetId, kind: 'damage', amount }, 'damage')
    const dmg = pl.markedDamage + amount
    const lethal = pl.toughness - dmg <= 0 || (opts.deathtouch && amount > 0)
    if (lethal) {
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
    case 'terror_discount':
    case 'delve':
    case 'activate_sac_damage':
    case 'activate_draw':
    case 'activate_monstrosity':
    case 'anthem_other_flyers':
    case 'attack_guide':
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
      next = applyDamageAny(next, effectivePower(next, fighter), enemy.instanceId, {
        deathtouch: creatureHasDeathtouch(fighter),
      })
      const enemyPower = enemy.power ?? 0
      if (enemyPower > 0) {
        next = applyDamageAny(next, enemyPower, fighter.instanceId, {
          deathtouch: creatureHasDeathtouch(enemy),
        })
      }
      return next
    }
    case 'mill_draw': {
      next = millOwnLibrary(next, effect.mill)
      next = pushLog(next, 'millSelf', 'info', { n: effect.mill })
      next = drawCards(next, effect.draw)
      return pushLog(next, 'drawCards', 'good', { n: effect.draw })
    }
    case 'brainstorm': {
      next = drawCards(next, 3)
      if (next.status !== 'playing') return next
      if (next.player.hand.length === 0) {
        return pushLog(next, 'brainstorm', 'good')
      }
      const putBack = Math.min(2, next.player.hand.length)
      return {
        ...next,
        prompt: {
          id: `brainstorm-${Date.now()}`,
          kind: 'brainstorm',
          titleKey: 'brainstormTitle',
          messageKey: 'brainstormMsg',
          messageParams: { n: putBack, left: putBack },
          resume: `brainstorm:${putBack}`,
          options: next.player.hand.map((c) => ({
            id: c.instanceId,
            labelKey: 'brainstormPutBack',
            name: c.name,
          })),
        },
      }
    }
    case 'draw': {
      next = drawCards(next, effect.amount)
      return pushLog(next, 'drawCards', 'good', { n: effect.amount })
    }
    case 'scry_draw': {
      if (effect.scry > 0 && next.player.library.length > 0) {
        const top = next.player.library[0]
        return {
          ...next,
          prompt: {
            id: `scry-${Date.now()}`,
            kind: 'scry',
            titleKey: 'scryTitle',
            messageKey: 'scryMsg',
            messageParams: { name: top.name, n: effect.scry },
            resume: `scry_draw:${effect.draw}`,
            options: [
              { id: 'top', labelKey: 'scryKeepTop', name: top.name },
              { id: 'bottom', labelKey: 'scryBottom', name: top.name },
            ],
          },
        }
      }
      next = drawCards(next, effect.draw)
      return pushLog(next, 'drawCards', 'good', { n: effect.draw })
    }
    case 'destroy_creature': {
      if (!opts.targetId) return pushLog(next, 'needTarget', 'info')
      const enemy = next.challenge.battlefield.find((c) => c.instanceId === opts.targetId)
      if (!enemy || enemy.isGod) return pushLog(next, 'invalidTarget', 'info')
      if (effect.nonlegendary && /legendary/i.test(enemy.typeLine)) {
        return pushLog(next, 'castDownLegendary', 'info', { name: enemy.name })
      }
      next = destroyChallengePermanent(next, opts.targetId)
      return checkWinLoss(next)
    }
    case 'edict': {
      const victims = next.challenge.battlefield.filter(
        (c) =>
          !c.isGod &&
          (c.power != null || c.isHead || c.isReveler || c.isMinotaur),
      )
      if (victims.length === 0) return pushLog(next, 'edictNoVictim', 'info')
      if (victims.length === 1) {
        next = destroyChallengePermanent(next, victims[0].instanceId)
        next = pushLog(next, 'edictSac', 'good', { name: victims[0].name })
        return checkWinLoss(next)
      }
      return {
        ...next,
        prompt: {
          id: `edict-${Date.now()}`,
          kind: 'choose_edict',
          titleKey: 'edictTitle',
          messageKey: 'edictMsg',
          resume: 'edict',
          options: victims.map((c) => ({
            id: c.instanceId,
            labelKey: 'edictOpt',
            name: c.name,
            labelParams: {
              pt: `${c.power ?? 0}/${(c.toughness ?? 0) - c.markedDamage}`,
            },
          })),
        },
      }
    }
    case 'fangs': {
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
                  power: c.power + 1,
                  toughness: c.toughness + 1,
                  keywords: c.keywords.some((k) => /lifelink/i.test(k))
                    ? c.keywords
                    : [...c.keywords, 'Lifelink'],
                }
              : c,
          ),
        },
      }
      return pushLog(next, 'fangs', 'good', { name: mine.name })
    }
    case 'crawl_cellar': {
      const creatures = next.player.graveyard.filter((c) => c.kind === 'creature')
      if (creatures.length === 0) return pushLog(next, 'crawlEmpty', 'info')
      if (creatures.length === 1) {
        return finishCrawlReturn(next, creatures[0].instanceId)
      }
      return {
        ...next,
        prompt: {
          id: `crawl-${Date.now()}`,
          kind: 'choose_crawl',
          titleKey: 'crawlTitle',
          messageKey: 'crawlMsg',
          resume: 'crawl',
          options: creatures
            .slice()
            .sort((a, b) => b.cmc - a.cmc)
            .map((c) => ({
              id: c.instanceId,
              labelKey: 'crawlOpt',
              name: c.name,
              labelParams: { cmc: c.cmc },
            })),
        },
      }
    }
    case 'etb_miscreant_draw': {
      if (!opts.selfId) return next
      const others = next.player.creatures.filter(
        (c) => c.instanceId !== opts.selfId && c.name === 'Faerie Miscreant',
      )
      if (others.length === 0) return next
      next = drawCards(next, 1)
      return pushLog(next, 'miscreantDraw', 'good')
    }
    case 'etb_mill_loot': {
      if (!opts.selfId) return next
      const milled = next.player.library.slice(0, effect.mill)
      const restLib = next.player.library.slice(milled.length)
      const loot = milled.find((c) => c.kind === 'instant' || c.kind === 'sorcery')
      if (loot) {
        next = {
          ...next,
          player: {
            ...next.player,
            library: restLib,
            graveyard: [...milled.filter((c) => c.instanceId !== loot.instanceId), ...next.player.graveyard],
            hand: [...next.player.hand, loot],
          },
        }
        return pushLog(next, 'fallajiLoot', 'good', { name: loot.name })
      }
      const bounced = next.player.creatures.find((c) => c.instanceId === opts.selfId)
      next = {
        ...next,
        player: {
          ...next.player,
          library: restLib,
          graveyard: [...milled, ...next.player.graveyard],
          creatures: next.player.creatures.filter((c) => c.instanceId !== opts.selfId),
          hand: bounced
            ? [...next.player.hand, cardToGy(bounced)]
            : next.player.hand,
        },
      }
      return pushLog(next, 'fallajiBounce', 'info')
    }
    case 'etb_gain_life':
    case 'etb_exile_opp_graveyard':
      return next
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

  const hasFlash = card.keywords.some((k) => /flash/i.test(k))
  if (card.kind === 'sorcery' && state.playerPhase !== 'main') {
    return pushLog(state, 'sorceryMainOnly', 'info')
  }
  if (card.kind === 'creature' && !hasFlash && state.playerPhase !== 'main') {
    return pushLog(state, 'sorceryMainOnly', 'info')
  }
  if (
    (card.kind === 'instant' || (card.kind === 'creature' && hasFlash)) &&
    state.playerPhase !== 'main' &&
    state.playerPhase !== 'combat'
  ) {
    return pushLog(state, 'castMainOrCombat', 'info')
  }

  const effect = card.effect
  if (effect.type === 'damage_any' && !opts.targetId) {
    return { ...state, pendingCast: { handInstanceId: handId, mode: 'damage' } }
  }
  if ((effect.type === 'pump_target' || effect.type === 'fangs') && !opts.targetId) {
    return {
      ...state,
      pendingCast: {
        handInstanceId: handId,
        mode: effect.type === 'fangs' ? 'fangs' : 'pump',
      },
    }
  }
  if (effect.type === 'destroy_creature' && !opts.targetId) {
    return { ...state, pendingCast: { handInstanceId: handId, mode: 'destroy' } }
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

  const prepared = prepareCastCost(state, card, true)
  const paid = autoTapForCost(prepared.state, prepared.manaCost)
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
    if (
      effect.type === 'etb_self_pump' ||
      effect.type === 'etb_mill_loot' ||
      effect.type === 'etb_miscreant_draw'
    ) {
      next = resolveEffect(next, effect, { selfId: creature.instanceId })
    }
    return next
  }

  next = resolveEffect(next, effect, opts)
  // Spell may have opened a choice prompt — still put card in GY / finish later
  if (isPlayerChoicePrompt(next.prompt?.kind)) {
    next = {
      ...next,
      pendingCast: null,
      player: {
        ...next.player,
        graveyard: [card, ...next.player.graveyard],
      },
    }
    next = pushLog(next, 'castSpell', 'good', { name: card.name })
    next = applyProwessPumps(next)
    return next
  }
  next = {
    ...next,
    player: {
      ...next.player,
      graveyard: [card, ...next.player.graveyard],
    },
  }
  next = pushLog(next, 'castSpell', 'good', { name: card.name })
  next = applyProwessPumps(next)
  return checkWinLoss(next)
}

function isPlayerChoicePrompt(
  kind: string | undefined,
): boolean {
  return (
    kind === 'scry' ||
    kind === 'brainstorm' ||
    kind === 'choose_edict' ||
    kind === 'choose_crawl' ||
    kind === 'choose_crawl_zombie'
  )
}

function finishCrawlReturn(state: GameState, cardId: string): GameState {
  const card = state.player.graveyard.find((c) => c.instanceId === cardId)
  if (!card || card.kind !== 'creature') {
    return pushLog({ ...state, prompt: null }, 'crawlEmpty', 'info')
  }
  let next: GameState = {
    ...state,
    prompt: null,
    player: {
      ...state.player,
      graveyard: state.player.graveyard.filter((c) => c.instanceId !== cardId),
      hand: [...state.player.hand, card],
    },
  }
  next = pushLog(next, 'crawlToHand', 'good', { name: card.name })
  const zombies = next.player.creatures.filter((c) =>
    /zombie/i.test(findCardDef(c.defId, next.playerDeckId)?.typeLine ?? ''),
  )
  if (zombies.length === 0) return next
  if (zombies.length === 1) {
    return pumpCrawlZombie(next, zombies[0].instanceId)
  }
  return {
    ...next,
    prompt: {
      id: `crawl-zombie-${Date.now()}`,
      kind: 'choose_crawl_zombie',
      titleKey: 'crawlZombieTitle',
      messageKey: 'crawlZombieMsg',
      resume: 'crawl_zombie',
      options: zombies.map((c) => ({
        id: c.instanceId,
        labelKey: 'crawlZombieOpt',
        name: c.name,
        labelParams: { pt: `${c.power}/${c.toughness}` },
      })),
    },
  }
}

function pumpCrawlZombie(state: GameState, zombieId: string): GameState {
  const zombie = state.player.creatures.find((c) => c.instanceId === zombieId)
  if (!zombie) return { ...state, prompt: null }
  let next: GameState = {
    ...state,
    prompt: null,
    player: {
      ...state.player,
      creatures: state.player.creatures.map((c) =>
        c.instanceId === zombieId
          ? { ...c, power: c.power + 1, toughness: c.toughness + 1 }
          : c,
      ),
    },
  }
  return pushLog(next, 'crawlZombiePump', 'good', { name: zombie.name })
}

export function resolveScryPrompt(
  state: GameState,
  optionId: string,
): GameState {
  if (!state.prompt || state.prompt.kind !== 'scry') return state
  const resume = state.prompt.resume
  const drawMatch = /^scry_draw:(\d+)$/.exec(resume)
  const drawN = drawMatch ? Number(drawMatch[1]) : 1
  let next: GameState = { ...state, prompt: null }
  if (optionId === 'bottom' && next.player.library.length > 0) {
    const [top, ...rest] = next.player.library
    next = {
      ...next,
      player: {
        ...next.player,
        library: [...rest, top],
      },
    }
    next = pushLog(next, 'scryBottom', 'info', { name: top.name })
  } else if (next.player.library[0]) {
    next = pushLog(next, 'scryKeep', 'info', { name: next.player.library[0].name })
  }
  next = drawCards(next, drawN)
  if (next.status === 'playing') {
    next = pushLog(next, 'drawCards', 'good', { n: drawN })
  }
  return checkWinLoss(next)
}

export function resolveBrainstormPrompt(
  state: GameState,
  optionId: string,
): GameState {
  if (!state.prompt || state.prompt.kind !== 'brainstorm') return state
  const match = /^brainstorm:(\d+)$/.exec(state.prompt.resume)
  const left = match ? Number(match[1]) : 0
  const card = state.player.hand.find((c) => c.instanceId === optionId)
  if (!card || left <= 0) return { ...state, prompt: null }

  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      hand: state.player.hand.filter((c) => c.instanceId !== optionId),
      library: [card, ...state.player.library],
    },
  }
  const remaining = left - 1
  if (remaining <= 0 || next.player.hand.length === 0) {
    next = { ...next, prompt: null }
    return pushLog(next, 'brainstorm', 'good')
  }
  return {
    ...next,
    prompt: {
      id: `brainstorm-${Date.now()}`,
      kind: 'brainstorm',
      titleKey: 'brainstormTitle',
      messageKey: 'brainstormMsg',
      messageParams: { n: remaining, left: remaining },
      resume: `brainstorm:${remaining}`,
      options: next.player.hand.map((c) => ({
        id: c.instanceId,
        labelKey: 'brainstormPutBack',
        name: c.name,
      })),
    },
  }
}

export function resolveEdictPrompt(
  state: GameState,
  optionId: string,
): GameState {
  if (!state.prompt || state.prompt.kind !== 'choose_edict') return state
  const victim = state.challenge.battlefield.find((c) => c.instanceId === optionId)
  if (!victim || victim.isGod) {
    return { ...state, prompt: null }
  }
  let next: GameState = { ...state, prompt: null }
  next = destroyChallengePermanent(next, optionId)
  next = pushLog(next, 'edictSac', 'good', { name: victim.name })
  return checkWinLoss(next)
}

export function resolveCrawlPrompt(
  state: GameState,
  optionId: string,
): GameState {
  if (!state.prompt) return state
  if (state.prompt.kind === 'choose_crawl') {
    return finishCrawlReturn(state, optionId)
  }
  if (state.prompt.kind === 'choose_crawl_zombie') {
    return pumpCrawlZombie(state, optionId)
  }
  return state
}

/** Double-click / activate a battlefield creature ability. */
export function activateCreature(
  state: GameState,
  creatureId: string,
  opts: { targetId?: string } = {},
): GameState {
  if (state.status !== 'playing' || state.activeSide !== 'player') return state
  const creature = state.player.creatures.find((c) => c.instanceId === creatureId)
  if (!creature) {
    return pushLog(state, 'cannotActivate', 'info')
  }
  const def = findCardDef(creature.defId, state.playerDeckId)
  const effect = def?.effect
  if (!effect) return state

  if (effect.type === 'activate_monstrosity' && creature.monstrous) {
    return pushLog(state, 'alreadyMonstrous', 'info', { name: creature.name })
  }

  if (creature.tapped || creature.summoningSickness) {
    return pushLog(state, 'cannotActivate', 'info')
  }

  if (effect.type === 'activate_sac_damage') {
    if (!opts.targetId) {
      return {
        ...state,
        pendingCast: {
          handInstanceId: creatureId,
          mode: 'damage',
          activateCreatureId: creatureId,
        },
      }
    }
    let next = applyDamageAny(state, effect.amount, opts.targetId)
    next = {
      ...next,
      pendingCast: null,
      player: {
        ...next.player,
        creatures: next.player.creatures.filter((c) => c.instanceId !== creatureId),
        graveyard: [cardToGy(creature), ...next.player.graveyard],
      },
    }
    next = pushLog(next, 'activateSacDamage', 'good', {
      name: creature.name,
      n: effect.amount,
    })
    return checkWinLoss(next)
  }

  if (effect.type === 'activate_draw') {
    const paid = autoTapForCost(state, effect.manaCost)
    if (!paid) return pushLog(state, 'notEnoughMana', 'info')
    let next: GameState = {
      ...paid,
      player: {
        ...paid.player,
        creatures: paid.player.creatures.map((c) =>
          c.instanceId === creatureId ? { ...c, tapped: true } : c,
        ),
      },
    }
    next = drawCards(next, effect.amount)
    next = pushLog(next, 'activateDraw', 'good', {
      name: creature.name,
      n: effect.amount,
    })
    return checkWinLoss(next)
  }

  if (effect.type === 'activate_monstrosity') {
    if (creature.monstrous) return pushLog(state, 'alreadyMonstrous', 'info')
    const paid = autoTapForCost(state, effect.manaCost)
    if (!paid) return pushLog(state, 'notEnoughMana', 'info')
    let next: GameState = {
      ...paid,
      player: {
        ...paid.player,
        creatures: paid.player.creatures.map((c) =>
          c.instanceId === creatureId
            ? {
                ...c,
                power: c.power + effect.power,
                toughness: c.toughness + effect.toughness,
                monstrous: true,
                tapped: true,
              }
            : c,
        ),
      },
    }
    next = pushLog(next, 'monstrosity', 'good', {
      name: creature.name,
      pt: `+${effect.power}/+${effect.toughness}`,
    })
    return next
  }

  return pushLog(state, 'cannotActivate', 'info')
}

/** Cast a flashback card from the graveyard. */
export function castFlashback(
  state: GameState,
  gyId: string,
  opts: { targetId?: string; fighterId?: string } = {},
): GameState {
  if (state.status !== 'playing' || state.activeSide !== 'player') return state
  if (state.flags.cannotCastSpells && state.code === 'tfth') {
    return pushLog(state, 'cannotCastUntilHydra', 'bad')
  }
  const card = state.player.graveyard.find((c) => c.instanceId === gyId)
  if (!card?.flashback) return pushLog(state, 'noFlashback', 'info')

  if (card.kind === 'sorcery' && state.playerPhase !== 'main') {
    return pushLog(state, 'sorceryMainOnly', 'info')
  }
  if (
    card.kind === 'instant' &&
    state.playerPhase !== 'main' &&
    state.playerPhase !== 'combat'
  ) {
    return pushLog(state, 'castMainOrCombat', 'info')
  }

  const effect = card.effect
  if (effect.type === 'damage_any' && !opts.targetId) {
    return {
      ...state,
      pendingCast: { handInstanceId: gyId, mode: 'damage', fromGraveyard: true },
    }
  }
  if ((effect.type === 'pump_target' || effect.type === 'fangs') && !opts.targetId) {
    return {
      ...state,
      pendingCast: {
        handInstanceId: gyId,
        mode: effect.type === 'fangs' ? 'fangs' : 'pump',
        fromGraveyard: true,
      },
    }
  }
  if (effect.type === 'destroy_creature' && !opts.targetId) {
    return {
      ...state,
      pendingCast: { handInstanceId: gyId, mode: 'destroy', fromGraveyard: true },
    }
  }
  if (effect.type === 'fight') {
    if (!opts.fighterId) {
      return {
        ...state,
        pendingCast: { handInstanceId: gyId, mode: 'fight_mine', fromGraveyard: true },
      }
    }
    if (!opts.targetId) {
      return {
        ...state,
        pendingCast: {
          handInstanceId: gyId,
          mode: 'fight_theirs',
          fighterId: opts.fighterId,
          fromGraveyard: true,
        },
      }
    }
  }

  const fb = card.flashback
  if (fb.payLife && state.player.life <= fb.payLife) {
    return pushLog(state, 'notEnoughLife', 'info')
  }
  const paid = autoTapForCost(state, fb.manaCost)
  if (!paid) return pushLog(state, 'notEnoughMana', 'info')

  let next: GameState = {
    ...paid,
    pendingCast: null,
    player: {
      ...paid.player,
      life: fb.payLife ? paid.player.life - fb.payLife : paid.player.life,
      graveyard: paid.player.graveyard.filter((c) => c.instanceId !== gyId),
    },
  }
  if (fb.payLife) {
    next = pushLog(next, 'flashbackLife', 'info', { n: fb.payLife })
  }

  next = resolveEffect(next, effect, opts)
  if (isPlayerChoicePrompt(next.prompt?.kind)) {
    next = {
      ...next,
      player: {
        ...next.player,
        exile: [card, ...next.player.exile],
      },
    }
    next = pushLog(next, 'flashbackCast', 'good', { name: card.name })
    next = applyProwessPumps(next)
    return next
  }
  next = {
    ...next,
    player: {
      ...next.player,
      exile: [card, ...next.player.exile],
    },
  }
  next = pushLog(next, 'flashbackCast', 'good', { name: card.name })
  next = applyProwessPumps(next)
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
