/**
 * Authoritative grounding for Magic Solo LLM prompts.
 *
 * Sources (prefer in this order when editing gloss / prompts):
 * 1. Wizards Comprehensive Rules — https://magic.wizards.com/en/rules
 * 2. Wizards ZH keyword glossary — https://magic.wizards.com/zh-hans/keyword-glossary
 * 3. Scryfall card oracle / search — https://scryfall.com/docs/syntax
 * 4. Site-local Challenge Deck / Experience rules JSON (overrides CR when modes conflict)
 *
 * Gloss English lines paraphrase the CR glossary (effective Aug 7, 2026 download).
 * Gloss Chinese lines paraphrase the official ZH keyword glossary where available.
 */

export const MTG_AUTHORITY = {
  comprehensiveRulesHub: 'https://magic.wizards.com/en/rules',
  /** Dated CR text used when curating evergreen gloss (update when refreshing gloss). */
  comprehensiveRulesTxt:
    'https://media.wizards.com/2026/downloads/MagicCompRules%2020260807.txt',
  zhKeywordGlossary: 'https://magic.wizards.com/zh-hans/keyword-glossary',
  scryfallSyntax: 'https://scryfall.com/docs/syntax',
  scryfallApi: 'https://scryfall.com/docs/api',
  gatherer: 'https://gatherer.wizards.com/',
} as const

/** Shared system-prompt rules: prefer provided data + named authorities; never invent rulings. */
export function authorityGrounding(opts?: {
  /** Challenge Experience / Challenge Deck local rules beat full CR. */
  challengeMode?: boolean
}): string {
  const challenge = opts?.challengeMode
    ? 'For Challenge Experience / Challenge Deck flows, the provided site rules JSON overrides Comprehensive Rules when they conflict.'
    : 'If site context includes Challenge or Experience rules, those local rules override Comprehensive Rules when they conflict.'
  return [
    'Authority order: (1) JSON / text provided in this request, (2) Magic Solo Challenge/Experience rules when present, (3) Wizards Comprehensive Rules and official keyword glossaries, (4) Scryfall oracle/search syntax for card data and queries.',
    challenge,
    'Do not invent Gatherer rulings, errata, or cards. If unsupported by the provided data (and any injected official gloss), say you cannot tell from the given information.',
    'Do not cite fan wikis as authority. Card names/oracle come from the provided JSON (Scryfall-backed data on this site).',
  ].join(' ')
}

type GlossEntry = {
  /** Short EN paraphrase of CR glossary. */
  en: string
  /** Short ZH paraphrase of official ZH glossary when available. */
  zh: string
  /** CR rule pointer from the official glossary line. */
  cr: string
}

/**
 * Evergreen / common keywords only — keep short for prompt tokens.
 * Keys are lowercase English keyword names as on cards.
 */
const EVERGREEN_GLOSS: Record<string, GlossEntry> = {
  flying: {
    en: 'A flying creature can be blocked only by creatures with flying or reach. (CR 702.9)',
    zh: '具飞行的生物只能被具飞行或延势的生物阻挡。',
    cr: '702.9',
  },
  reach: {
    en: 'A creature with reach can block creatures with flying. (CR 702.17)',
    zh: '具延势的生物可以阻挡具飞行的生物。',
    cr: '702.17',
  },
  trample: {
    en: 'Excess combat damage from a blocked trampler may be assigned to the player or planeswalker it is attacking. (CR 702.19)',
    zh: '被阻挡时，践踏可将过量战斗伤害分配给所攻击的牌手（践踏鹏洛客另有规则）。',
    cr: '702.19',
  },
  haste: {
    en: 'Ignores summoning sickness for attacking and for activating {T} abilities. (CR 702.10)',
    zh: '具敏捷的生物不受召唤失调影响，进战场当下即可攻击或起动含横置的异能。',
    cr: '702.10',
  },
  vigilance: {
    en: 'Attacking does not cause the creature to tap. (CR 702.20)',
    zh: '具警戒的生物攻击时不需横置。',
    cr: '702.20',
  },
  deathtouch: {
    en: 'Any nonzero damage this deals to a creature is enough to destroy it. (CR 702.2)',
    zh: '对生物造成任意数量伤害即足以消灭该生物；对牌手或鹏洛客无此效果。',
    cr: '702.2',
  },
  lifelink: {
    en: 'Damage dealt by this causes its controller to gain that much life. (CR 702.15)',
    zh: '此物件造成伤害时，其操控者获得等量生命。',
    cr: '702.15',
  },
  'first strike': {
    en: 'Deals combat damage before creatures without first strike or double strike. (CR 702.7)',
    zh: '具先攻的生物比不具先攻或连击者更早造成战斗伤害。',
    cr: '702.7',
  },
  'double strike': {
    en: 'Deals both first-strike and regular combat damage. (CR 702.4)',
    zh: '具连击的生物会造成先攻与普通两段战斗伤害。',
    cr: '702.4',
  },
  hexproof: {
    en: 'Cannot be the target of spells or abilities opponents control. (CR 702.11)',
    zh: '不能成为由对手操控的咒语或异能的目标。',
    cr: '702.11',
  },
  indestructible: {
    en: 'Cannot be destroyed by damage or by effects that say “destroy.” (CR 702.12)',
    zh: '不会因伤害或注记「消灭」的效应而被消灭。',
    cr: '702.12',
  },
  menace: {
    en: 'Can be blocked only by two or more creatures. (CR 702.111)',
    zh: '具威慑的生物只能被两个或更多生物阻挡。',
    cr: '702.111',
  },
  defender: {
    en: 'This creature cannot attack. (CR 702.3)',
    zh: '具守军的生物不能攻击。',
    cr: '702.3',
  },
  flash: {
    en: 'May be cast any time you could cast an instant. (CR 702.8)',
    zh: '具闪现的牌可在能施放瞬间的时机下施放。',
    cr: '702.8',
  },
  prowess: {
    en: 'Whenever you cast a noncreature spell, this gets +1/+1 until end of turn. (CR 702.107)',
    zh: '每当你施放非生物咒语时，此永久物得+1/+1直到回合结束。',
    cr: '702.107',
  },
  ward: {
    en: 'If this becomes the target of a spell or ability an opponent controls, counter it unless that player pays the ward cost. (CR 702.21)',
    zh: '若对手操控的咒语或异能以此为目标，除非该牌手支付守护费用，否则反击之。',
    cr: '702.21',
  },
  scry: {
    en: 'Look at the top N cards; put any number on the bottom, rest on top in any order. (CR 701.22)',
    zh: '「占卜N」：检视牌库顶N张牌，可将任意数量置于牌库底，其余以任意顺序放回牌库顶。',
    cr: '701.22',
  },
  surveil: {
    en: 'Look at the top N cards; put any into the graveyard and the rest on top in any order. (CR 701.25)',
    zh: '「刺探N」：检视牌库顶N张牌，可将任意数量置入坟墓场，其余以任意顺序放回牌库顶。',
    cr: '701.25',
  },
  mill: {
    en: 'Put the top N cards of a library into its owner’s graveyard. (CR 701.17)',
    zh: '将牌库顶若干张牌置入其拥有者的坟墓场。',
    cr: '701.17',
  },
  fight: {
    en: 'Each of two creatures deals damage equal to its power to the other. (CR 701.14)',
    zh: '两只生物互斗时，各向对方造成等同于自身力量的伤害。',
    cr: '701.14',
  },
  explore: {
    en: 'Reveal the top card: put a land into hand, or else put a +1/+1 counter on the exploring creature and put the card back or into the graveyard. (CR 701.44)',
    zh: '「勘察」：展示牌库顶牌；若是地则放手中，否则在该生物上放置+1/+1指示物，再将该牌放回牌库顶或置入坟墓场。',
    cr: '701.44',
  },
  investigate: {
    en: 'Create a Clue token. (CR 701.16)',
    zh: '「探查」：派出一个线索衍生物。',
    cr: '701.16',
  },
  exile: {
    en: 'Move the object to the exile zone. (CR glossary / 406)',
    zh: '将被放逐的牌或永久物移到放逐区。',
    cr: '406',
  },
  destroy: {
    en: 'Move a permanent from the battlefield to its owner’s graveyard. (CR glossary)',
    zh: '将永久物从战场移到其拥有者的坟墓场。',
    cr: 'glossary',
  },
  equip: {
    en: 'Attach this Equipment to target creature you control; equip is an activated ability. (CR 702.6)',
    zh: '佩带是起动式异能，将武具贴附在由你操控的目标生物上。',
    cr: '702.6',
  },
  enchant: {
    en: 'Enchant [quality] restricts what an Aura can attach to. (CR 702.5)',
    zh: '「结附于…」限定灵气能够贴附的对象。',
    cr: '702.5',
  },
  flashback: {
    en: 'Cast from the graveyard for the flashback cost, then exile it. (CR 702.34)',
    zh: '可支付返照费用从坟墓场施放，之后放逐该牌。',
    cr: '702.34',
  },
  protection: {
    en: 'Protection from a quality stops damage, enchanting/equipping, blocking, and targeting from that quality. (CR 702.16)',
    zh: '保护使该永久物不受具该性质之物件的伤害、结附/佩带、阻挡与指定目标。',
    cr: '702.16',
  },
}

function normalizeKeyword(raw: string): string {
  return raw.trim().toLowerCase().replace(/_/g, ' ')
}

/** Build a compact official gloss block for keywords present on a card. */
export function officialGlossBlock(
  keywords: string[] | undefined,
  lang: string,
): string {
  if (!keywords?.length) return ''
  const zh = lang.startsWith('zh')
  const lines: string[] = []
  const seen = new Set<string>()
  for (const raw of keywords) {
    const key = normalizeKeyword(raw)
    if (seen.has(key)) continue
    seen.add(key)
    const entry = EVERGREEN_GLOSS[key]
    if (!entry) continue
    lines.push(`- ${raw}: ${zh ? entry.zh : entry.en}`)
  }
  if (lines.length === 0) return ''
  return [
    'Official keyword gloss (Wizards CR / ZH keyword glossary paraphrases; use only for listed keywords):',
    ...lines,
  ].join('\n')
}

export function scryfallQueryGrounding(): string {
  return [
    'Emit valid Scryfall search syntax only (see Scryfall docs).',
    'Common operators: set:CODE, t:type, c:colors, cmc=N, o:"oracle text", pow, tou, rararity, is:permanent, etc.',
    'Do not invent operators. Prefer ASCII quotes for phrases.',
  ].join(' ')
}
