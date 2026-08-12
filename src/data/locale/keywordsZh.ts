/**
 * Common Magic keyword → official Simplified Chinese terminology.
 * Unknown keywords fall back to the English form.
 */
const KEYWORD_ZH: Record<string, string> = {
  flying: '飞行',
  trample: '践踏',
  haste: '敏捷',
  vigilance: '警戒',
  deathtouch: '死触',
  lifelink: '系命',
  'first strike': '先攻',
  'double strike': '连击',
  hexproof: '辟邪',
  indestructible: '不灭',
  menace: '威慑',
  reach: '延势',
  defender: '守军',
  flash: '闪现',
  prowess: '勇猛',
  equip: '佩带',
  enchant: '结附',
  flashback: '返照',
  scry: '占卜',
  mill: '磨牌',
  fight: '互斗',
  exile: '放逐',
  destroy: '消灭',
  regenerate: '重生',
  protection: '保护',
  shroud: '帷幕',
  fear: '恐惧',
  intimidate: '威吓',
  landwalk: '行越',
  plainswalk: '平原行越',
  islandwalk: '海岛行越',
  swampwalk: '沼泽行越',
  mountainwalk: '山脉行越',
  forestwalk: '树林行越',
  banding: '联结',
  rampage: '暴怒',
  flanking: '侧击',
  phasing: '相位出',
  shadow: '阴影',
  storm: '风暴',
  modular: '组装',
  affinity: '亲和',
  sunburst: '日光',
  convoke: '召集',
  delve: '掘穴',
  exploit: '搾取',
  renown: '扬威',
  skulk: '潜行',
  afflict: '折磨',
  afterlife: '死后世界',
  riot: '暴乱',
  escape: '逃逸',
  mutate: '异变',
  cascade: '倾曳',
  annihilator: '歼灭',
  infect: '侵染',
  wither: '凋零',
  persist: '留存',
  undying: '不死',
  exalted: '崇敬',
  crew: '搭载',
  fabricate: '装配',
  explore: '探查',
  amass: '聚军',
  surveil: '探查',
  ward: '守护',
  toxic: '毒性',
  backup: '后援',
  offspring: '子嗣',
  exhaust: '竭力',
}

export function localizeKeyword(keyword: string, lang?: string): string {
  const zh = (lang ?? '').startsWith('zh')
  if (!zh) return keyword
  const hit = KEYWORD_ZH[keyword.trim().toLowerCase()]
  return hit ?? keyword
}

export function localizeKeywords(keywords: string[], lang?: string): string[] {
  return keywords.map((k) => localizeKeyword(k, lang))
}
