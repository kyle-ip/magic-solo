/** Challenge Deck cards have no official Chinese printing.
 * Localized with official Magic Simplified Chinese terminology.
 */
export interface CardZh {
  name: string
  typeLine: string
  oracleText: string
}

export const cardsZh: Record<string, Record<string, CardZh>> = {
  tfth: {
    'Hydra Head': {
      name: '多头龙头颅',
      typeLine: '生物～头颅',
      oracleText: '英雄赏赐 — 当多头龙头颅离开战场时，每位牌手获得2点生命。',
    },
    'Ravenous Brute Head': {
      name: '贪食蛮力头颅',
      typeLine: '精英生物～头颅',
      oracleText: '英雄赏赐 — 当贪食蛮力头颅离开战场时，每位牌手获得2点生命且抓一张牌。',
    },
    'Savage Vigor Head': {
      name: '野性活力头颅',
      typeLine: '精英生物～头颅',
      oracleText:
        '在多头龙的结束步骤开始时，展示多头龙牌库顶牌，且多头龙施放该牌。\n英雄赏赐 — 当野性活力头颅离开战场时，每位牌手获得4点生命且抓一张牌。',
    },
    'Shrieking Titan Head': {
      name: '尖啸泰坦头颅',
      typeLine: '精英生物～头颅',
      oracleText:
        '在多头龙的结束步骤开始时，每位牌手弃一张牌。\n英雄赏赐 — 当尖啸泰坦头颅离开战场时，每位牌手获得4点生命且抓一张牌。',
    },
    'Snapping Fang Head': {
      name: '猛咬尖牙头颅',
      typeLine: '精英生物～头颅',
      oracleText:
        '在多头龙的结束步骤开始时，猛咬尖牙头颅对每位牌手造成1点伤害。\n英雄赏赐 — 当猛咬尖牙头颅离开战场时，每位牌手获得4点生命且抓一张牌。',
    },
    'Disorienting Glower': {
      name: '迷乱怒视',
      typeLine: '法术',
      oracleText: '牌手不能施放咒语，直到多头龙的下一个回合。',
    },
    'Distract the Hydra': {
      name: '牵制多头龙',
      typeLine: '法术',
      oracleText:
        '每位牌手可以牺牲一个生物。以此法牺牲了生物的每位牌手选择一个头颅并横置它。未牺牲生物的每位牌手失去3点生命。',
    },
    'Grown from the Stump': {
      name: '残干再生',
      typeLine: '法术',
      oracleText:
        '从多头龙的坟墓场中正好将两张名称为多头龙头颅的牌放置进战场。若你无法如此作，则展示多头龙牌库顶牌，直到展示出一张头颅牌为止。将该牌放置进战场，并将其余的牌置入多头龙的坟墓场。',
    },
    "Hydra's Impenetrable Hide": {
      name: '多头龙不透之皮',
      typeLine: '法术',
      oracleText: '每个头颅获得不灭异能直到多头龙的下一个回合结束。',
    },
    'Neck Tangle': {
      name: '颈项缠结',
      typeLine: '法术',
      oracleText:
        '若战场上有五个或更多头颅，则横置其中两个，且它们于多头龙的下一个重置步骤中不能重置。否则，展示多头龙牌库顶牌，且多头龙施放该牌。',
    },
    'Noxious Hydra Breath': {
      name: '剧毒多头龙吐息',
      typeLine: '法术',
      oracleText:
        '选择一项 — 剧毒多头龙吐息对每位牌手造成5点伤害；或消灭每个已横置的非头颅生物。',
    },
    'Strike the Weak Spot': {
      name: '直击弱点',
      typeLine: '法术',
      oracleText: '消灭目标头颅。若该头颅是精英，则多头龙在此回合后额外进行一个回合。',
    },
    'Swallow the Hero Whole': {
      name: '囫囵吞下英雄',
      typeLine: '法术',
      oracleText:
        '每位牌手放逐一个由其操控的生物。直到多头龙的下一个回合，当一个头颅离开战场时，将所放逐的牌在其拥有者的操控下移回战场。',
    },
    'Torn Between Heads': {
      name: '头颅撕裂',
      typeLine: '法术',
      oracleText:
        '横置最多两个头颅。它们于多头龙的下一个重置步骤中不能重置。头颅撕裂对每位牌手造成5点伤害。',
    },
    'Unified Lunge': {
      name: '齐声猛扑',
      typeLine: '法术',
      oracleText: '齐声猛扑对每位牌手造成X点伤害，X为战场上头颅的数量。',
    },
  },
  tbth: {
    'Minotaur Goreseeker': {
      name: '寻血牛头怪',
      typeLine: '生物～牛头怪',
      oracleText: '敏捷\n寻血牛头怪每次战斗若能攻击则须攻击。',
    },
    'Minotaur Younghorn': {
      name: '幼角牛头怪',
      typeLine: '生物～牛头怪',
      oracleText: '敏捷\n幼角牛头怪每次战斗若能攻击则须攻击。',
    },
    "Mogis's Chosen": {
      name: '墨癸斯的选民',
      typeLine: '生物～牛头怪',
      oracleText: '墨癸斯的选民须横置进战场。\n墨癸斯的选民每次战斗若能攻击则须攻击。',
    },
    'Phoberos Reaver': {
      name: '弗伯洛掠夺者',
      typeLine: '生物～牛头怪',
      oracleText: '敏捷\n弗伯洛掠夺者每次战斗若能攻击则须攻击。',
    },
    'Reckless Minotaur': {
      name: '鲁莽牛头怪',
      typeLine: '生物～牛头怪',
      oracleText:
        '敏捷\n鲁莽牛头怪每次战斗若能攻击则须攻击。\n在结束步骤开始时，消灭鲁莽牛头怪。',
    },
    'Consuming Rage': {
      name: '吞噬怒火',
      typeLine: '法术',
      oracleText:
        '每当一个牛头怪本回合攻击时，它得+2/+0直到回合结束。在战斗结束时消灭该生物。',
    },
    'Descend on the Prey': {
      name: '扑向猎物',
      typeLine: '法术',
      oracleText:
        '每当一个牛头怪本回合攻击时，它获得先攻异能直到回合结束，且本回合若能被阻挡则须被阻挡。',
    },
    'Intervention of Keranos': {
      name: '刻拉诺斯干预',
      typeLine: '法术',
      oracleText: '在本回合的战斗开始时，刻拉诺斯干预对每个生物造成3点伤害。',
    },
    'Touch of the Horned God': {
      name: '角神之触',
      typeLine: '法术',
      oracleText: '每当一个牛头怪本回合攻击时，它获得死触异能直到回合结束。',
    },
    'Unquenchable Fury': {
      name: '难熄怒火',
      typeLine: '法术',
      oracleText: '本回合中，每个牛头怪都不能被少于两个生物阻挡。',
    },
    'Altar of Mogis': {
      name: '墨癸斯祭坛',
      typeLine: '神器',
      oracleText:
        '在部落的第一个主阶段开始时，额外展示部落牌库顶牌。部落施放该牌。\n英雄赏赐 — 当墨癸斯祭坛从任何区域置入坟墓场时，部落牺牲两个牛头怪。',
    },
    'Massacre Totem': {
      name: '屠杀图腾',
      typeLine: '神器',
      oracleText:
        '在部落的第一个主阶段开始时，额外展示部落牌库顶牌。部落施放该牌。\n英雄赏赐 — 当屠杀图腾从任何区域置入坟墓场时，将部落牌库顶七张牌置入其坟墓场。',
    },
    'Plundered Statue': {
      name: '劫掠雕像',
      typeLine: '神器',
      oracleText:
        '在部落的第一个主阶段开始时，额外展示部落牌库顶牌。部落施放该牌。\n英雄赏赐 — 当劫掠雕像从任何区域置入坟墓场时，每位牌手抓一张牌。',
    },
    'Refreshing Elixir': {
      name: '提神灵药',
      typeLine: '神器',
      oracleText:
        '在部落的第一个主阶段开始时，额外展示部落牌库顶牌。部落施放该牌。\n英雄赏赐 — 当提神灵药从任何区域置入坟墓场时，每位牌手获得5点生命。',
    },
    'Vitality Salve': {
      name: '活力药膏',
      typeLine: '神器',
      oracleText:
        '在部落的第一个主阶段开始时，额外展示部落牌库顶牌。部落施放该牌。\n英雄赏赐 — 当活力药膏从任何区域置入坟墓场时，每位牌手将其坟墓场中的一张生物牌移回战场。',
    },
  },
  tdag: {
    'Xenagos Ascended': {
      name: '晋升神明泽纳加思',
      typeLine: '传奇结界生物～神',
      oracleText:
        '只要战场上有狂欢者，晋升神明泽纳加思便不能离开战场。\n当晋升神明泽纳加思离开战场时，每位牌手赢得这盘游戏。',
    },
    'Rollicking Throng': {
      name: '喧闹人潮',
      typeLine: '生物～人类／狂欢者',
      oracleText:
        '当喧闹人潮进战场时，展示泽纳加思牌库顶牌，且泽纳加思施放该牌。（此异能不会在游戏开始时触发。）',
    },
    'Ecstatic Piper': {
      name: '狂喜吹笛手',
      typeLine: '生物～萨特／狂欢者',
      oracleText:
        '当狂喜吹笛手进战场时，晋升神明泽纳加思本回合若能攻击则须攻击。\n英雄赏赐 — 当狂喜吹笛手离开战场时，每位牌手获得2点生命。',
    },
    'Maddened Oread': {
      name: '发狂山林仙灵',
      typeLine: '结界生物～仙灵／狂欢者',
      oracleText:
        '只要战场上有五个或更多狂欢者，发狂山林仙灵每次战斗若能攻击则须攻击。\n英雄赏赐 — 当发狂山林仙灵离开战场时，每位牌手获得3点生命。',
    },
    'Pheres-Band Revelers': {
      name: '费利斯群狂欢者',
      typeLine: '生物～半人马／狂欢者',
      oracleText: '英雄赏赐 — 当费利斯群狂欢者离开战场时，每位牌手抓一张牌。',
    },
    'Serpent Dancers': {
      name: '弄蛇舞者',
      typeLine: '生物～人类／狂欢者',
      oracleText: '死触\n英雄赏赐 — 当弄蛇舞者离开战场时，每位牌手抓一张牌。',
    },
    'Wild Maenads': {
      name: '狂野酒神女祭司',
      typeLine: '生物～人类／狂欢者',
      oracleText: '先攻\n英雄赏赐 — 当狂野酒神女祭司离开战场时，每位牌手获得3点生命。',
    },
    'Impulsive Charge': {
      name: '冲动冲锋',
      typeLine: '法术',
      oracleText:
        '在本回合的战斗开始时，所有狂欢者获得敏捷异能直到回合结束，且本战斗若能攻击则须攻击。',
    },
    'Impulsive Destruction': {
      name: '冲动破坏',
      typeLine: '法术',
      oracleText:
        '每位牌手可以牺牲一个神器或结界。冲动破坏对未以此法牺牲永久物的每位牌手造成3点伤害。',
    },
    'Impulsive Return': {
      name: '冲动归来',
      typeLine: '法术',
      oracleText:
        '将两张名称为狂喜吹笛手的牌从泽纳加思的坟墓场移回战场。在本回合的战斗开始时，冲动归来对每位牌手造成伤害，其数量等同于战场上狂欢者的数量。',
    },
    'Rip to Pieces': {
      name: '撕成碎片',
      typeLine: '法术',
      oracleText:
        '在本回合的战斗开始时，每个狂欢者对每位牌手及其操控的每个生物各造成1点伤害。',
    },
    "Xenagos's Scorn": {
      name: '泽纳加思的轻蔑',
      typeLine: '法术',
      oracleText:
        '晋升神明泽纳加思获得践踏异能直到回合结束，且本回合若能攻击则须攻击。',
    },
    "Xenagos's Strike": {
      name: '泽纳加思的打击',
      typeLine: '法术',
      oracleText: '泽纳加思的打击对每位牌手造成4点伤害。',
    },
    'Dance of Flame': {
      name: '火焰之舞',
      typeLine: '结界',
      oracleText: '每当一个狂欢者攻击时，火焰之舞对每位牌手造成1点伤害。',
    },
    'Dance of Panic': {
      name: '恐慌之舞',
      typeLine: '结界',
      oracleText:
        '只要战场上有五个或更多狂欢者，所有狂欢者便具有敏捷异能，且每次战斗若能攻击则须攻击。',
    },
  },
}

export function getCardZh(setCode: string, englishName: string): CardZh | undefined {
  return cardsZh[setCode]?.[englishName]
}
