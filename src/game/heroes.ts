import type { ChallengeCode } from './types'

export type HeroEffect =
  | { type: 'preventDamagePerTurn'; amount: number }
  | { type: 'boostCreatures'; power: number; toughness: number }
  | { type: 'extraDraw'; amount: number }
  | { type: 'grantKeywords'; keywords: string[] }

export interface HeroDef {
  id: string
  name: string
  nameZh: string
  typeLine: string
  typeLineZh: string
  oracleText: string
  oracleTextZh: string
  /** Which challenges this hero is recommended for (all allowed in Experience). */
  quests: ChallengeCode[]
  effect: HeroEffect
  /** Extra keywords granted to creatures (in addition to grantKeywords effects). */
  extraKeywords?: string[]
  /** Local Scryfall card face for preview / setup */
  image: string
  /** Optional art crop for setup tiles */
  art?: string
}

/** Curated Hero's Path cards with Experience-friendly effects. */
export const HERO_DEFS: HeroDef[] = [
  {
    id: 'protector',
    name: 'The Protector',
    nameZh: '守护者',
    typeLine: 'Hero',
    typeLineZh: '英雄',
    oracleText: 'Prevent the next 1 damage that would be dealt to you each turn.',
    oracleTextZh: '防止本回合接下来将对你造成的 1 点伤害。',
    quests: ['tfth', 'tbth', 'tdag'],
    effect: { type: 'preventDamagePerTurn', amount: 1 },
    image: 'assets/cards/heroes/ca66cd86-1574-4e6e-94de-a19d8d26836f-normal.jpg',
    art: 'assets/cards/heroes/ca66cd86-1574-4e6e-94de-a19d8d26836f-art.jpg',
  },
  {
    id: 'warrior',
    name: 'The Warrior',
    nameZh: '战士',
    typeLine: 'Hero',
    typeLineZh: '英雄',
    oracleText: 'Creatures you control get +1/+1.',
    oracleTextZh: '由你操控的生物得+1/+1。',
    quests: ['tfth', 'tbth', 'tdag'],
    effect: { type: 'boostCreatures', power: 1, toughness: 1 },
    image: 'assets/cards/heroes/dd60768a-c47f-4af5-bb33-c17777c7dd66-normal.jpg',
    art: 'assets/cards/heroes/dd60768a-c47f-4af5-bb33-c17777c7dd66-art.jpg',
  },
  {
    id: 'hunter',
    name: 'The Hunter',
    nameZh: '猎人',
    typeLine: 'Hero',
    typeLineZh: '英雄',
    oracleText: 'Creatures you control have reach.',
    oracleTextZh: '由你操控的生物具有延势异能。',
    quests: ['tfth', 'tbth', 'tdag'],
    effect: { type: 'grantKeywords', keywords: ['reach'] },
    image: 'assets/cards/heroes/4ef068ff-934c-4e4d-a4ae-e44f194b8dca-normal.jpg',
    art: 'assets/cards/heroes/4ef068ff-934c-4e4d-a4ae-e44f194b8dca-art.jpg',
  },
  {
    id: 'avenger',
    name: 'The Avenger',
    nameZh: '复仇者',
    typeLine: 'Hero',
    typeLineZh: '英雄',
    oracleText: 'Creatures you control have deathtouch.',
    oracleTextZh: '由你操控的生物具有死触异能。',
    quests: ['tfth', 'tbth', 'tdag'],
    effect: { type: 'grantKeywords', keywords: ['deathtouch'] },
    image: 'assets/cards/heroes/d0f83818-2c47-435c-ade3-302e4eabc2bf-normal.jpg',
    art: 'assets/cards/heroes/d0f83818-2c47-435c-ade3-302e4eabc2bf-art.jpg',
  },
  {
    id: 'slayer',
    name: 'The Slayer',
    nameZh: '杀手',
    typeLine: 'Hero',
    typeLineZh: '英雄',
    oracleText: 'Creatures you control get +1/+0.',
    oracleTextZh: '由你操控的生物得+1/+0。',
    quests: ['tfth', 'tbth', 'tdag'],
    effect: { type: 'boostCreatures', power: 1, toughness: 0 },
    image: 'assets/cards/heroes/5a12f3e3-5708-4d14-a1ed-600232002266-normal.jpg',
    art: 'assets/cards/heroes/5a12f3e3-5708-4d14-a1ed-600232002266-art.jpg',
  },
  {
    id: 'provider',
    name: 'The Provider',
    nameZh: '供给者',
    typeLine: 'Hero',
    typeLineZh: '英雄',
    oracleText: 'At the beginning of your turn, draw an additional card.',
    oracleTextZh: '在你的回合开始时，额外抓一张牌。',
    quests: ['tbth', 'tdag'],
    effect: { type: 'extraDraw', amount: 1 },
    image: 'assets/cards/heroes/d9987b43-7f20-46ce-b7dd-f3126e5bc991-normal.jpg',
    art: 'assets/cards/heroes/d9987b43-7f20-46ce-b7dd-f3126e5bc991-art.jpg',
  },
  {
    id: 'vanquisher',
    name: 'The Vanquisher',
    nameZh: '征服者',
    typeLine: 'Hero',
    typeLineZh: '英雄',
    oracleText: 'Creatures you control have vigilance.',
    oracleTextZh: '由你操控的生物具有警戒异能。',
    quests: ['tbth', 'tdag'],
    effect: { type: 'grantKeywords', keywords: ['vigilance'] },
    image: 'assets/cards/heroes/08a63083-997b-4a72-af48-cd35e6e9599d-normal.jpg',
    art: 'assets/cards/heroes/08a63083-997b-4a72-af48-cd35e6e9599d-art.jpg',
  },
  {
    id: 'champion',
    name: 'The Champion',
    nameZh: '冠军',
    typeLine: 'Hero',
    typeLineZh: '英雄',
    oracleText: 'Creatures you control get +1/+1 and have trample.',
    oracleTextZh: '由你操控的生物得+1/+1且具有践踏异能。',
    quests: ['tdag'],
    effect: { type: 'boostCreatures', power: 1, toughness: 1 },
    extraKeywords: ['trample'],
    image: 'assets/cards/heroes/9a6eba2c-a980-4a2b-b103-bd91bc5889d2-normal.jpg',
    art: 'assets/cards/heroes/9a6eba2c-a980-4a2b-b103-bd91bc5889d2-art.jpg',
  },
]

export interface HeroInstance {
  instanceId: string
  defId: string
  name: string
  oracleText: string
  effect: HeroEffect
  image: string
  /** Protector-style: already prevented damage this turn */
  preventUsedThisTurn: boolean
}

export function maxHeroesFor(code: ChallengeCode): number {
  return code === 'tfth' ? 2 : 3
}

export function getHeroDef(id: string): HeroDef | undefined {
  return HERO_DEFS.find((h) => h.id === id)
}

export function createHeroInstance(def: HeroDef, instanceId: string): HeroInstance {
  return {
    instanceId,
    defId: def.id,
    name: def.name,
    oracleText: def.oracleText,
    effect: def.effect,
    image: def.image,
    preventUsedThisTurn: false,
  }
}

export function heroBoost(heroes: HeroInstance[]): { power: number; toughness: number } {
  let power = 0
  let toughness = 0
  for (const h of heroes) {
    if (h.effect.type === 'boostCreatures') {
      power += h.effect.power
      toughness += h.effect.toughness
    }
  }
  return { power, toughness }
}

export function heroKeywords(heroes: HeroInstance[]): string[] {
  const set = new Set<string>()
  for (const h of heroes) {
    if (h.effect.type === 'grantKeywords') {
      for (const k of h.effect.keywords) set.add(k)
    }
    const def = getHeroDef(h.defId)
    for (const k of def?.extraKeywords ?? []) set.add(k)
  }
  return [...set]
}

export function heroExtraDraw(heroes: HeroInstance[]): number {
  let n = 0
  for (const h of heroes) {
    if (h.effect.type === 'extraDraw') n += h.effect.amount
  }
  return n
}

/** @deprecated use heroExtraDraw */
export function heroExtraMuster(heroes: HeroInstance[]): number {
  return heroExtraDraw(heroes)
}
