/**
 * Curated Simplified Chinese set names. Missing codes fall back to English.
 */
const setNamesZh: Record<string, string> = {
  ltr: '魔戒：中洲传说',
  ltc: '魔戒：中洲传说指挥官',
  mom: '机械克生：完化预兆',
  mat: '机械克生：完化预兆余波',
  one: '非瑞克西亚：完全始源',
  bro: '兄弟之战',
  dmu: '多明纳里亚合众国',
  snc: '新卡佩纳：喧嚣街巷',
  neo: '神河：霓虹王朝',
  vow: '依尼翠：血色婚约',
  mid: '依尼翠：午夜猎捕',
  afr: '龙与地下城：被遗忘国度战记',
  stx: '斯翠海文：魔法学校',
  khm: '卡尔德海姆',
  znr: '赞迪卡再起',
  iko: '伊克利亚：巨兽时空',
  thb: '塞洛斯：冥途求生',
  eld: '艾卓王权',
  war: '火花之战',
  rna: '拉尼卡忠心纷争',
  grn: '公会之城拉尼卡',
  dom: '多明纳里亚',
  rix: '雨林秘境争锋',
  xln: '依克撒兰',
  hou: '阿芒凯毁灭时刻',
  akh: '阿芒凯',
  aer: '乙太之乱',
  kld: '卡拉德许',
  emn: '艾卓暗影',
  soi: '依尼翠暗影',
  ogw: '再战赞迪卡：守望者誓言',
  bfz: '再战赞迪卡',
  dtk: '龙命殊途',
  frf: '龙命殊途：命运再起',
  ktk: '可汗秘罗地',
  m21: '核心系列 2021',
  m20: '核心系列 2020',
  m19: '核心系列 2019',
  mh3: '摩登新篇 3',
  mh2: '摩登新篇 2',
  mh1: '摩登新篇',
  clb: '龙与地下城：争战博德之门',
  woe: '艾卓王权：仙境',
  lci: '失落洞窟：依克撒兰',
  mkm: '谋杀：公会之城拉尼卡',
  otj: '外域雷霆',
  big: '大分数抢劫',
  blb: '繁花乡',
  dsk: '暮暗幽笼：恐怖屋',
  fdn: '基础系列',
  dft: '乙太漂移',
  tdm: '鞑契龙岚录',
  fin: '最终幻想',
  eoe: '秘罗地：乙太窜流',
}

export function getSetNameZh(code: string): string | undefined {
  return setNamesZh[code.toLowerCase()]
}

export function localizedSetName(
  code: string,
  englishName: string,
  lang?: string,
): string {
  if (lang?.startsWith('zh')) {
    return getSetNameZh(code) ?? englishName
  }
  return englishName
}
