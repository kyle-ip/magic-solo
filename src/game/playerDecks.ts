import type { PlayerTemplate } from './types'

export type PlayerDeckId = 'akroan' | 'nessian' | 'meletis' | 'forge'

export interface PlayerDeckDef {
  id: PlayerDeckId
  name: string
  nameZh: string
  blurb: string
  blurbZh: string
  /** Scryfall art_crop for setup tile */
  art: string
  roster: PlayerTemplate[]
}

/** Default muster costs tuned for solo challenge pacing (not printed CMC). */
const decks: PlayerDeckDef[] = [
  {
    id: 'akroan',
    name: 'Akroan Legion',
    nameZh: '阿喀洛斯军团',
    blurb: 'Disciplined soldiers and heroic strikes — a balanced Theros force.',
    blurbZh: '纪律严明的士兵与英雄纪元攻势——均衡的塞洛斯军队。',
    art: 'assets/cards/player/04aa9d4f-37cc-4fc8-877a-6190f96eb509-art.jpg',
    roster: [
      {
        id: 'akroan-hoplite',
        name: 'Akroan Hoplite',
        nameZh: '阿喀洛斯步兵',
        typeLine: 'Creature — Human Soldier',
        typeLineZh: '生物～人类／士兵',
        oracleText:
          'Whenever this creature attacks, it gets +X/+0 until end of turn, where X is the number of attacking creatures you control.',
        oracleTextZh:
          '每当此生物攻击时，它得+X/+0直到回合结束，X为攻击中由你操控的生物数量。',
        power: 2,
        toughness: 2,
        cost: 2,
        keywords: [],
        image:
          'assets/cards/player/04aa9d4f-37cc-4fc8-877a-6190f96eb509-normal.jpg',
      },
      {
        id: 'akroan-alseid',
        name: 'Observant Alseid',
        nameZh: '机警的树精',
        typeLine: 'Enchantment Creature — Nymph',
        typeLineZh: '结界生物～宁芙',
        oracleText: 'Bestow {4}{W}\nVigilance\nEnchanted creature gets +2/+2 and has vigilance.',
        oracleTextZh: '寄身{4}{W}\n警戒\n所结附的生物得+2/+2且具有警戒异能。',
        power: 3,
        toughness: 3,
        cost: 3,
        keywords: ['vigilance'],
        image:
          'assets/cards/player/e1410d10-476a-4ed2-ae44-75383ed0e359-normal.jpg',
      },
      {
        id: 'akroan-oathsworn',
        name: 'Setessan Oathsworn',
        nameZh: '塞特萨誓约者',
        typeLine: 'Creature — Satyr Warrior',
        typeLineZh: '生物～萨特／战士',
        oracleText:
          'Heroic — Whenever you cast a spell that targets this creature, put two +1/+1 counters on this creature.',
        oracleTextZh:
          '英雄纪元～每当你施放以本生物为目标的咒语时，在其上放置两个+1/+1指示物。',
        power: 2,
        toughness: 3,
        cost: 3,
        keywords: [],
        image:
          'assets/cards/player/e5579755-4718-406a-bba6-27f1f2811e59-normal.jpg',
      },
      {
        id: 'akroan-centaur',
        name: 'Centaur Battlemaster',
        nameZh: '半人马战斗大师',
        typeLine: 'Creature — Centaur Warrior',
        typeLineZh: '生物～半人马／战士',
        oracleText:
          'Heroic — Whenever you cast a spell that targets this creature, put three +1/+1 counters on this creature.',
        oracleTextZh:
          '英雄纪元～每当你施放以本生物为目标的咒语时，在其上放置三个+1/+1指示物。',
        power: 4,
        toughness: 4,
        cost: 4,
        keywords: [],
        image:
          'assets/cards/player/d190aac9-9ac8-4b54-9f51-d7d1561dc743-normal.jpg',
      },
      {
        id: 'akroan-lion',
        name: 'Fleecemane Lion',
        nameZh: '绒鬃狮',
        typeLine: 'Creature — Cat',
        typeLineZh: '生物～猫',
        oracleText:
          '{3}{G}{W}: Monstrosity 1.\nAs long as this creature is monstrous, it has hexproof and indestructible.',
        oracleTextZh:
          '{3}{G}{W}：蛮化1。\n只要此生物已蛮化，它便具有辟邪与不灭异能。',
        power: 3,
        toughness: 4,
        cost: 4,
        keywords: [],
        image:
          'assets/cards/player/ef4e1c37-d520-4025-bd56-15ec452f6842-normal.jpg',
      },
      {
        id: 'akroan-polukranos',
        name: 'Polukranos, World Eater',
        nameZh: '吞世者波卢克拉诺斯',
        typeLine: 'Legendary Creature — Hydra',
        typeLineZh: '传奇生物～多头龙',
        oracleText: '{X}{X}{G}: Monstrosity X. When it becomes monstrous, divide X damage among creatures.',
        oracleTextZh: '{X}{X}{G}：蛮化X。当它成为蛮化时，将X点伤害任意分配给若干生物。',
        power: 6,
        toughness: 6,
        cost: 6,
        keywords: ['trample'],
        image:
          'assets/cards/player/4979cc1b-9c1a-47e4-ae37-7c41798eb89a-normal.jpg',
      },
    ],
  },
  {
    id: 'nessian',
    name: 'Nessian Wilds',
    nameZh: '涅西恩荒野',
    blurb: 'Towering beasts and forest giants — hit hard, hit late.',
    blurbZh: '巍峨野兽与森林巨人——慢热但一击沉重。',
    art: 'assets/cards/player/87a12eac-c104-4a91-a9d3-ccc450d5114c-art.jpg',
    roster: [
      {
        id: 'nessian-tusker',
        name: 'Kalonian Tusker',
        nameZh: '卡罗尼亚长牙兽',
        typeLine: 'Creature — Beast',
        typeLineZh: '生物～野兽',
        oracleText: 'A sturdy forest beast. (Muster unit for solo challenges.)',
        oracleTextZh: '强壮的森林野兽。（单人挑战用的集结单位。）',
        power: 3,
        toughness: 3,
        cost: 2,
        keywords: [],
        image:
          'assets/cards/player/135946fc-fe67-401f-821d-d7145c63f030-normal.jpg',
      },
      {
        id: 'nessian-satyr',
        name: 'Voyaging Satyr',
        nameZh: '远行萨特',
        typeLine: 'Creature — Satyr Druid',
        typeLineZh: '生物～萨特／德鲁伊',
        oracleText: '{T}: Untap target land.',
        oracleTextZh: '{T}：重置目标地。',
        power: 2,
        toughness: 2,
        cost: 2,
        keywords: [],
        image:
          'assets/cards/player/180773da-dadc-414a-92c6-f4e13c753718-normal.jpg',
      },
      {
        id: 'nessian-courser',
        name: 'Nessian Courser',
        nameZh: '涅西恩奔行者',
        typeLine: 'Creature — Centaur Warrior',
        typeLineZh: '生物～半人马／战士',
        oracleText: 'A swift centaur of the Nessian Wood.',
        oracleTextZh: '涅西恩林地中迅捷的半人马。',
        power: 3,
        toughness: 3,
        cost: 3,
        keywords: [],
        image:
          'assets/cards/player/4697f3aa-abde-4379-af82-f30115f59be0-normal.jpg',
      },
      {
        id: 'nessian-slaughterhorn',
        name: 'Slaughterhorn',
        nameZh: '屠戮角兽',
        typeLine: 'Creature — Beast',
        typeLineZh: '生物～野兽',
        oracleText: 'Bloodrush — {G}, Discard this card: Target attacking creature gets +3/+2 until end of turn.',
        oracleTextZh: '血奔～{G}，弃掉此牌：目标攻击中的生物得+3/+2直到回合结束。',
        power: 3,
        toughness: 3,
        cost: 3,
        keywords: ['trample'],
        image:
          'assets/cards/player/4010a419-8291-4c8b-8cda-38c35fbd7b88-normal.jpg',
      },
      {
        id: 'nessian-colossus',
        name: 'Arbor Colossus',
        nameZh: '乔木巨像',
        typeLine: 'Creature — Giant',
        typeLineZh: '生物～巨人',
        oracleText: 'Reach\n{3}{G}{G}{G}: Monstrosity 3.',
        oracleTextZh: '延势\n{3}{G}{G}{G}：蛮化3。',
        power: 5,
        toughness: 5,
        cost: 5,
        keywords: ['reach'],
        image:
          'assets/cards/player/87a12eac-c104-4a91-a9d3-ccc450d5114c-normal.jpg',
      },
      {
        id: 'nessian-nemesis',
        name: 'Nemesis of Mortals',
        nameZh: '凡人之敌',
        typeLine: 'Creature — Snake',
        typeLineZh: '生物～蛇',
        oracleText: 'Costs less for each creature card in your graveyard.\n{7}{G}{G}: Monstrosity 5.',
        oracleTextZh: '你坟墓场中每有一张生物牌，此咒语减少{1}来施放。\n{7}{G}{G}：蛮化5。',
        power: 6,
        toughness: 6,
        cost: 6,
        keywords: ['trample'],
        image:
          'assets/cards/player/c4010889-1d7a-4db3-a27c-c39baa024765-normal.jpg',
      },
    ],
  },
  {
    id: 'meletis',
    name: 'Meletis Tide',
    nameZh: '迈勒提斯潮涌',
    blurb: 'Scholars, tritons, and sea gods — clever lines and flying pressure.',
    blurbZh: '学者、人鱼与海洋神祇——机巧阵线与飞行施压。',
    art: 'assets/cards/player/9f9db424-e668-48b4-b275-7b35be4e1bf8-art.jpg',
    roster: [
      {
        id: 'meletis-hoplite',
        name: 'Battlewise Hoplite',
        nameZh: '战智步兵',
        typeLine: 'Creature — Human Soldier',
        typeLineZh: '生物～人类／士兵',
        oracleText: 'Heroic — Whenever you cast a spell that targets this creature, put a +1/+1 counter on it, then scry 1.',
        oracleTextZh: '英雄纪元～每当你施放以本生物为目标的咒语时，在其上放置一个+1/+1指示物，然后占卜1。',
        power: 2,
        toughness: 2,
        cost: 2,
        keywords: [],
        image:
          'assets/cards/player/4c929a57-2c23-4bbf-b265-666630a4fde8-normal.jpg',
      },
      {
        id: 'meletis-triton',
        name: 'Triton Fortune Hunter',
        nameZh: '特里同寻运者',
        typeLine: 'Creature — Merfolk Soldier',
        typeLineZh: '生物～人鱼／士兵',
        oracleText: 'Heroic — Whenever you cast a spell that targets this creature, draw a card.',
        oracleTextZh: '英雄纪元～每当你施放以本生物为目标的咒语时，抓一张牌。',
        power: 2,
        toughness: 3,
        cost: 3,
        keywords: [],
        image:
          'assets/cards/player/1173ff96-998c-4fe7-9b28-602d990e0339-normal.jpg',
      },
      {
        id: 'meletis-chimera',
        name: 'Coastline Chimera',
        nameZh: '海岸奇美拉',
        typeLine: 'Creature — Chimera',
        typeLineZh: '生物～奇美拉',
        oracleText: 'Flying\n{1}{W}: This creature can block an additional creature this turn.',
        oracleTextZh: '飞行\n{1}{W}：本回合此生物能额外阻挡一个生物。',
        power: 2,
        toughness: 4,
        cost: 3,
        keywords: ['flying'],
        image:
          'assets/cards/player/01320a31-25fa-4324-8225-d150c6aa58a1-normal.jpg',
      },
      {
        id: 'meletis-waves',
        name: 'Master of Waves',
        nameZh: '浪潮大师',
        typeLine: 'Creature — Merfolk Wizard',
        typeLineZh: '生物～人鱼／法术师',
        oracleText: 'Protection from red. Elementals you control get +1/+1.',
        oracleTextZh: '反红保护。由你操控的元素得+1/+1。',
        power: 3,
        toughness: 3,
        cost: 4,
        keywords: [],
        image:
          'assets/cards/player/14cd5387-c6aa-4430-8edb-05da6b4e2ff5-normal.jpg',
      },
      {
        id: 'meletis-prophet',
        name: 'Prophet of Kruphix',
        nameZh: '克洛菲斯先知',
        typeLine: 'Creature — Human Wizard',
        typeLineZh: '生物～人类／法术师',
        oracleText: 'Untap your creatures and lands on each other player’s untap step.',
        oracleTextZh: '在每位其他牌手的重置步骤中，重置由你操控的所有生物与地。',
        power: 3,
        toughness: 4,
        cost: 5,
        keywords: [],
        image:
          'assets/cards/player/45de923f-fdab-460c-96f4-f62aefa9ad73-normal.jpg',
      },
      {
        id: 'meletis-thassa',
        name: 'Thassa, God of the Sea',
        nameZh: '海洋神塔萨',
        typeLine: 'Legendary Enchantment Creature — God',
        typeLineZh: '传奇结界生物～神',
        oracleText: 'Indestructible. Devotion matters. Scry when creatures attack.',
        oracleTextZh: '不灭。献力影响是否为生物。生物攻击时占卜。',
        power: 5,
        toughness: 5,
        cost: 6,
        keywords: ['indestructible'],
        image:
          'assets/cards/player/9f9db424-e668-48b4-b275-7b35be4e1bf8-normal.jpg',
      },
    ],
  },
  {
    id: 'forge',
    name: 'Purphoros Forge',
    nameZh: '波洛芬斯熔炉',
    blurb: 'Haste, double strike, and dragons — end games before they begin.',
    blurbZh: '敏捷、连击与巨龙——在对手站稳前结束战斗。',
    art: 'assets/cards/player/4736a2c4-c89c-48db-a104-6303e7e2eee8-art.jpg',
    roster: [
      {
        id: 'forge-cavalry',
        name: 'Firehoof Cavalry',
        nameZh: '火蹄骑兵',
        typeLine: 'Creature — Human Berserker',
        typeLineZh: '生物～人类／狂战士',
        oracleText: '{3}{R}: This creature gets +2/+0 and gains trample until end of turn.',
        oracleTextZh: '{3}{R}：此生物得+2/+0且获得践踏直到回合结束。',
        power: 2,
        toughness: 1,
        cost: 1,
        keywords: ['haste'],
        image:
          'assets/cards/player/edb2b284-f79c-41eb-a25f-4710d4a5228f-normal.jpg',
      },
      {
        id: 'forge-cerberus',
        name: 'Two-Headed Cerberus',
        nameZh: '双头地狱犬',
        typeLine: 'Creature — Dog',
        typeLineZh: '生物～犬',
        oracleText: 'Double strike (This creature deals both first-strike and regular combat damage.)',
        oracleTextZh: '连击（此生物造成先攻与普通战斗伤害。）',
        power: 2,
        toughness: 2,
        cost: 2,
        keywords: ['double strike'],
        image:
          'assets/cards/player/f8d2f75c-ef2a-4d30-86d1-c47307fc47ac-normal.jpg',
      },
      {
        id: 'forge-skullcleaver',
        name: 'Minotaur Skullcleaver',
        nameZh: '牛头人劈颅者',
        typeLine: 'Creature — Minotaur Berserker',
        typeLineZh: '生物～牛头人／狂战士',
        oracleText: 'Haste\nWhen this creature enters, it gets +2/+0 until end of turn.',
        oracleTextZh: '敏捷\n当此生物进战场时，它得+2/+0直到回合结束。',
        power: 3,
        toughness: 2,
        cost: 3,
        keywords: ['haste'],
        image:
          'assets/cards/player/b6fef9f8-ff3e-4a3f-a3ff-4534ff0c3946-normal.jpg',
      },
      {
        id: 'forge-swallower',
        name: 'Ember Swallower',
        nameZh: '余烬吞噬者',
        typeLine: 'Creature — Elemental',
        typeLineZh: '生物～元素',
        oracleText: '{5}{R}{R}: Monstrosity 3. When monstrous, each player sacrifices three lands.',
        oracleTextZh: '{5}{R}{R}：蛮化3。当成为蛮化时，每位牌手牺牲三个地。',
        power: 4,
        toughness: 4,
        cost: 4,
        keywords: [],
        image:
          'assets/cards/player/e2715851-9def-42a0-bed4-0923e599e19a-normal.jpg',
      },
      {
        id: 'forge-dragon',
        name: 'Stormbreath Dragon',
        nameZh: '风暴吐息龙',
        typeLine: 'Creature — Dragon',
        typeLineZh: '生物～龙',
        oracleText: 'Flying, haste, protection from white\n{5}{R}{R}: Monstrosity 3.',
        oracleTextZh: '飞行，敏捷，反白保护\n{5}{R}{R}：蛮化3。',
        power: 5,
        toughness: 4,
        cost: 5,
        keywords: ['flying', 'haste'],
        image:
          'assets/cards/player/3637d9b8-87bb-478d-bfb1-59ddab7b5e4c-normal.jpg',
      },
      {
        id: 'forge-purphoros',
        name: 'Purphoros, God of the Forge',
        nameZh: '熔炉神波洛芬斯',
        typeLine: 'Legendary Enchantment Creature — God',
        typeLineZh: '传奇结界生物～神',
        oracleText: 'Indestructible. Creatures entering deal 2 damage to each opponent.',
        oracleTextZh: '不灭。生物进战场时向每位对手造成 2 点伤害。',
        power: 6,
        toughness: 5,
        cost: 6,
        keywords: ['indestructible'],
        image:
          'assets/cards/player/4736a2c4-c89c-48db-a104-6303e7e2eee8-normal.jpg',
      },
    ],
  },
]

export const PLAYER_DECKS: PlayerDeckDef[] = decks

export const DEFAULT_PLAYER_DECK: PlayerDeckId = 'akroan'

export function getPlayerDeck(id: string | undefined | null): PlayerDeckDef {
  return PLAYER_DECKS.find((d) => d.id === id) ?? PLAYER_DECKS[0]
}

export function getRoster(deckId?: string | null): PlayerTemplate[] {
  return getPlayerDeck(deckId).roster
}

export function findTemplate(
  templateId: string,
  deckId?: string | null,
): PlayerTemplate | undefined {
  const preferred = getRoster(deckId).find((t) => t.id === templateId)
  if (preferred) return preferred
  for (const deck of PLAYER_DECKS) {
    const hit = deck.roster.find((t) => t.id === templateId)
    if (hit) return hit
  }
  return undefined
}

export function findTemplateByName(name: string): PlayerTemplate | undefined {
  for (const deck of PLAYER_DECKS) {
    const hit = deck.roster.find((t) => t.name === name)
    if (hit) return hit
  }
  return undefined
}

export function musterForTurn(turnNumber: number): number {
  return Math.min(10, 3 + Math.floor((turnNumber - 1) / 2))
}

/** @deprecated use getRoster / PLAYER_DECKS — kept for brief compatibility */
export const PLAYER_ROSTER = getRoster(DEFAULT_PLAYER_DECK)
