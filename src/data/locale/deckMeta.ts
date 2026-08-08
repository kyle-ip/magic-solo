export interface LocalizedDeckMeta {
  name: string
  blurb: string
  overview: string
  /** Expansion set that shipped this Challenge Deck. */
  expansion: string
  /** Card-back color (for rules / catalog context). */
  backColor: string
}

export const deckMetaZh: Record<string, LocalizedDeckMeta> = {
  tfth: {
    name: '勇战多头龙',
    blurb: '在多头龙的吐息吞噬你之前，斩落每一颗头颅。',
    overview:
      '自运行多头龙挑战套牌。头颅被消灭后可能再生，精英头颅造成更多伤害。清空战场上的头颅即可获胜。',
    expansion: '塞洛斯',
    backColor: '绿色卡背',
  },
  tbth: {
    name: '勇战蛮群',
    blurb: '在牛头怪冲锋时，耗尽部落牌库。',
    overview:
      '自运行牛头怪挑战套牌。没有生命值——伤害会改为磨掉部落牌库。存活下来，并清空其牌库与战场上的生物。',
    expansion: '神生万象',
    backColor: '红色卡背',
  },
  tdag: {
    name: '勇战天神',
    blurb: '驱散狂欢——让每位狂欢者离开泽纳加思身边。',
    overview:
      '自运行天神挑战套牌。除掉所有狂欢者，使泽纳加思得以离开战场——你便获胜。',
    expansion: '尼克斯踏临',
    backColor: '靛蓝色卡背',
  },
}

export const deckMetaEn: Record<string, LocalizedDeckMeta> = {
  tfth: {
    name: 'Face the Hydra',
    blurb: 'Cut down every Head before the Hydra’s breath consumes you.',
    overview:
      'A self-running Hydra Challenge Deck. Heads grow back when cut, and elite Heads hit harder. Clear the battlefield of Heads to win.',
    expansion: 'Theros',
    backColor: 'green card backs',
  },
  tbth: {
    name: 'Battle the Horde',
    blurb: 'Bleed the Horde’s library dry while the Minotaurs charge.',
    overview:
      'A self-running Minotaur Challenge Deck with no life total — damage mills its library. Survive the charge and empty both the library and the battlefield.',
    expansion: 'Born of the Gods',
    backColor: 'red card backs',
  },
  tdag: {
    name: 'Defeat a God',
    blurb: 'Shatter the revel — strip every Reveler from Xenagos Ascended.',
    overview:
      'A self-running Challenge Deck led by Xenagos Ascended. Strip away every Reveler so the god can leave the battlefield — and you win.',
    expansion: 'Journey into Nyx',
    backColor: 'indigo card backs',
  },
}
