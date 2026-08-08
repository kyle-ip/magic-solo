export interface LocalizedDeckMeta {
  name: string
  blurb: string
  overview: string
}

export const deckMetaZh: Record<string, LocalizedDeckMeta> = {
  tfth: {
    name: '勇战多头龙',
    blurb: '在多头龙的吐息吞噬你之前，斩落每一颗头颅。',
    overview:
      '一套60张的自运行多头龙挑战套牌。头颅被消灭后可能再生，精英头颅造成更多伤害。清空战场上的头颅即可获胜。',
  },
  tbth: {
    name: '勇战蛮群',
    blurb: '在牛头怪冲锋时，耗尽部落牌库。',
    overview:
      '一支没有生命值的牛头怪大军——伤害会改为将部落牌库顶的牌置入坟墓场。存活下来，并清空其牌库与战场上的生物。',
  },
  tdag: {
    name: '勇战天神',
    blurb: '驱散狂欢——让每位狂欢者离开泽纳加思身边。',
    overview:
      '晋升神明泽纳加思率领酒宴狂欢。除掉所有狂欢者，使泽纳加思得以离开战场——你便获胜。',
  },
}

export const deckMetaEn: Record<string, LocalizedDeckMeta> = {
  tfth: {
    name: 'Face the Hydra',
    blurb: 'Cut down every Head before the Hydra’s breath consumes you.',
    overview:
      'A sixty-card, self-running Hydra. Heads grow back when cut, and elite Heads hit harder. Clear the battlefield of Heads to claim victory.',
  },
  tbth: {
    name: 'Battle the Horde',
    blurb: 'Bleed the Horde’s library dry while the Minotaurs charge.',
    overview:
      'A Minotaur swarm with no life total — damage mills the Horde’s library. Survive the charge and empty both the library and the battlefield.',
  },
  tdag: {
    name: 'Defeat a God',
    blurb: 'Shatter the revel — strip every Reveler from Xenagos Ascended.',
    overview:
      'Xenagos Ascended leads a drunken revel. Strip away every Reveler so the god can finally leave the battlefield — and you win.',
  },
}
