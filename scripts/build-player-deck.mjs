/**
 * Build Challenge player decks from Scryfall + local images.
 * Usage: node scripts/build-player-deck.mjs <burn|skies|terror>
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const HEADERS = {
  'User-Agent': 'magic-solo/0.1',
  Accept: 'application/json',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function named(name) {
  await sleep(80)
  const res = await fetch(
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`,
    { headers: HEADERS },
  )
  if (!res.ok) throw new Error(`named fail ${name} ${res.status}`)
  return res.json()
}

async function zhsPrint(oracleId) {
  await sleep(80)
  const res = await fetch(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`oracleid:${oracleId} lang:zhs`)}&unique=prints`,
    { headers: HEADERS },
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.data?.find((c) => c.printed_name) ?? data.data?.[0] ?? null
}

function kindOf(typeLine) {
  if (/Land/i.test(typeLine)) return 'land'
  if (/Creature/i.test(typeLine)) return 'creature'
  if (/Instant/i.test(typeLine)) return 'instant'
  if (/Sorcery|Enchantment|Artifact/i.test(typeLine)) return 'sorcery'
  return 'instant'
}

function producesFrom(name, typeLine, oracleText) {
  if (/Forest/i.test(typeLine)) return ['G']
  if (/Mountain/i.test(typeLine)) return ['R']
  if (/Island/i.test(typeLine)) return ['U']
  if (/Swamp/i.test(typeLine)) return ['B']
  if (/Plains/i.test(typeLine)) return ['W']
  if (/Dismal Backwater/i.test(name) || /\{T\}: Add \{U\} or \{B\}/i.test(oracleText))
    return ['U', 'B']
  if (/Bojuka Bog/i.test(name) || (/\{T\}: Add \{B\}\./i.test(oracleText) && /Swamp/i.test(typeLine)))
    return ['B']
  return undefined
}

const DECKS = {
  burn: {
    id: 'burn',
    name: 'Ember Barrage',
    nameZh: '焦炎齐射',
    blurb:
      'Low-curve red burn adapted for Challenge: haste attackers and Lightning Bolt-style damage to Heads, the Horde library, or Revelers.',
    blurbZh:
      '为挑战精简的低曲线红色燃烧：敏捷生物配合闪电击式直伤，可打头颅、磨部落牌库或点掉狂欢者。',
    colors: ['R'],
    archetype: 'aggro',
    hint: 'Aim burn at the Horde pile or troublesome creatures; haste pressures before blockers pile up.',
    hintZh: '直伤优先打向部落牌库或难缠生物；敏捷生物抢在挡者成型前施压。',
    hintByChallenge: {
      tbth: {
        en: 'Best here: target the Horde with damage to mill its library.',
        zh: '本挑战优先：对部落造成伤害以磨牌库。',
      },
      tfth: {
        en: 'Bolt Heads and race; Fog is scarce—finish before breath chains grow.',
        zh: '点掉头颅并抢攻；本套少雾，赶在吐息连锁扩大前结束。',
      },
    },
    artCard: 'Goblin Guide',
    list: [
      { name: 'Goblin Guide', quantity: 4, keywords: ['Haste'], effect: { type: 'attack_guide' } },
      {
        name: 'Monastery Swiftspear',
        quantity: 4,
        keywords: ['Haste', 'Prowess'],
        effect: { type: 'none' },
      },
      {
        name: 'Fanatical Firebrand',
        quantity: 4,
        keywords: ['Haste'],
        effect: { type: 'activate_sac_damage', amount: 1 },
      },
      { name: 'Lightning Bolt', quantity: 4, effect: { type: 'damage_any', amount: 3 } },
      { name: 'Lava Spike', quantity: 4, effect: { type: 'damage_any', amount: 3 } },
      { name: 'Shock', quantity: 4, effect: { type: 'damage_any', amount: 2 } },
      { name: 'Lightning Strike', quantity: 4, effect: { type: 'damage_any', amount: 3 } },
      { name: 'Searing Spear', quantity: 4, effect: { type: 'damage_any', amount: 3 } },
      { name: 'Mountain', quantity: 28, effect: { type: 'none' } },
    ],
  },
  skies: {
    id: 'skies',
    name: 'Azure Skies',
    nameZh: '苍穹飞攻',
    blurb:
      'White-blue flyers with hard removal: clear Revelers or Heads, then attack in the air.',
    blurbZh: '白蓝飞行生物配合硬性清除：先清狂欢者或头颅，再从空中施压。',
    colors: ['W', 'U'],
    archetype: 'midrange',
    hint: 'Prioritize destroy spells on must-answer threats, then swing with flyers.',
    hintZh: '先用清除解决必须回答的威胁，再用飞行生物进攻。',
    hintByChallenge: {
      tdag: {
        en: 'Destroy Revelers first so Xenagos can take lethal damage.',
        zh: '先消灭狂欢者，泽纳加思才能被致命伤害击中。',
      },
      tfth: {
        en: 'Removal and flyers carve Heads; chump or race breath carefully.',
        zh: '清除与飞行切掉头颅；注意吐息，必要时挡一下或抢速。',
      },
      tbth: {
        en: 'Flyers race the Horde; removal buys time but burn decks mill faster.',
        zh: '飞行可与部落赛跑；清除换时间，但燃烧磨库往往更快。',
      },
    },
    artCard: 'Serra Angel',
    list: [
      {
        name: "Healer's Hawk",
        quantity: 4,
        keywords: ['Flying', 'Lifelink'],
        effect: { type: 'none' },
      },
      {
        name: 'Faerie Miscreant',
        quantity: 4,
        keywords: ['Flying'],
        effect: { type: 'etb_miscreant_draw' },
      },
      {
        name: 'Spectral Sailor',
        quantity: 4,
        keywords: ['Flash', 'Flying'],
        effect: { type: 'activate_draw', manaCost: '{3}{U}', amount: 1 },
      },
      { name: 'Snapping Drake', quantity: 4, keywords: ['Flying'], effect: { type: 'none' } },
      {
        name: 'Serra Angel',
        quantity: 3,
        keywords: ['Flying', 'Vigilance'],
        effect: { type: 'none' },
      },
      {
        name: 'Empyrean Eagle',
        quantity: 3,
        keywords: ['Flying'],
        effect: { type: 'anthem_other_flyers', power: 1, toughness: 1 },
      },
      {
        name: 'Journey to Nowhere',
        quantity: 4,
        nameZh: '渺无人烟之旅',
        effect: { type: 'destroy_creature' },
        oracleNote:
          '(Challenge: exile is treated as destroying the challenge permanent.)',
        oracleNoteZh: '（挑战：放逐按消灭挑战永久物处理。）',
      },
      {
        name: 'Banishing Light',
        quantity: 4,
        nameZh: '放逐之光',
        effect: { type: 'destroy_creature' },
        oracleNote:
          '(Challenge: exile is treated as destroying the challenge permanent.)',
        oracleNoteZh: '（挑战：放逐按消灭挑战永久物处理。）',
      },
      { name: 'Opt', quantity: 4, effect: { type: 'scry_draw', scry: 1, draw: 1 } },
      { name: 'Brainstorm', quantity: 2, effect: { type: 'brainstorm' } },
      { name: 'Plains', quantity: 12, effect: { type: 'none' } },
      { name: 'Island', quantity: 12, effect: { type: 'none' } },
    ],
  },
  terror: {
    id: 'terror',
    name: 'UB Terror',
    nameZh: '蓝黑惧兽',
    blurb:
      'Pauper Dimir Tolarian Terror: mill/filter into the yard, then land discounted Terrors and delved Anglers.',
    blurbZh:
      '蓝黑惧兽：用洗牌与滤牌填坟，减费拍出陶拉利亚惧兽与掘坟谷尔玛钓客。',
    colors: ['U', 'B'],
    archetype: 'tempo',
    hint: 'Fill the graveyard, then drop discounted Terrors and delved Anglers. Soft counters are not in this list.',
    hintZh: '先填坟再减费拍惧兽与钓客。本列表不含无效软反。',
    hintByChallenge: {
      tbth: {
        en: 'Strong vs Horde: mill yourself into threats that race the library.',
        zh: '对部落较强：自磨进坟后拍出威胁，与牌库赛跑。',
      },
    },
    artCard: 'Tolarian Terror',
    list: [
      { name: 'Mental Note', quantity: 4, nameZh: '读心记事', effect: { type: 'mill_draw', mill: 2, draw: 1 } },
      { name: 'Brainstorm', quantity: 4, effect: { type: 'brainstorm' } },
      {
        name: 'Thought Scour',
        quantity: 4,
        effect: { type: 'mill_draw', mill: 2, draw: 1, target: 'self' },
      },
      { name: 'Deep Analysis', quantity: 4, effect: { type: 'draw', amount: 2 }, flashback: { manaCost: '{1}{U}', payLife: 3 } },
      { name: 'Unexpected Fangs', quantity: 3, effect: { type: 'fangs' } },
      { name: "Chainer's Edict", quantity: 3, nameZh: '崔娜的勒令', effect: { type: 'edict' }, flashback: { manaCost: '{5}{B}{B}' } },
      { name: 'Crawl from the Cellar', quantity: 1, effect: { type: 'crawl_cellar' }, flashback: { manaCost: '{B}' } },
      { name: 'Cast Down', quantity: 4, nameZh: '湮灭', effect: { type: 'destroy_creature', nonlegendary: true } },
      { name: 'Fallaji Archaeologist', quantity: 4, effect: { type: 'etb_mill_loot', mill: 3 } },
      {
        name: 'Tolarian Terror',
        quantity: 4,
        nameZh: '陶拉利亚惧兽',
        effect: { type: 'terror_discount' },
        keywords: ['Ward'],
      },
      {
        name: 'Gurmag Angler',
        quantity: 4,
        effect: { type: 'delve' },
        keywords: ['Delve'],
      },
      { name: 'Island', quantity: 12, effect: { type: 'none' } },
      { name: 'Swamp', quantity: 7, effect: { type: 'none' } },
      { name: 'Dismal Backwater', quantity: 1, effect: { type: 'etb_gain_life', amount: 1 } },
      {
        name: 'Bojuka Bog',
        quantity: 1,
        nameZh: '放逐墓地沼泽',
        effect: { type: 'etb_exile_opp_graveyard' },
      },
    ],
  },
  merfolk: {
    id: 'merfolk',
    name: 'Pearl Trident',
    nameZh: '珍珠三叉戟',
    blurb:
      'Blue Merfolk tempo adapted for Challenge: lords pump the tribe, cheap body pressure, and bounce/removal to clear Heads or Revelers.',
    blurbZh:
      '为挑战精简的蓝人人鱼节奏：领主加成部族，廉价生物施压，弹回/清除对付头颅或狂欢者。',
    colors: ['U'],
    archetype: 'tempo',
    hint: 'Curve lords, then swing wide. Bounce or destroy must-answer threats before combat.',
    hintZh: '先铺领主再宽攻；开战前弹回或消灭必须回答的威胁。',
    hintByChallenge: {
      tfth: {
        en: 'Lords make small Merfolk chop Heads quickly; save removal for regenerating threats.',
        zh: '领主让小人鱼快速砍头颅；清除留给会再生的威胁。',
      },
      tbth: {
        en: 'Wide boards mill the Horde; bounce buys a turn when the pile is lethal.',
        zh: '宽场面磨部落牌库；致命时弹回可换一回合。',
      },
      tdag: {
        en: 'Clear Revelers first so lords can finish Xenagos.',
        zh: '先清狂欢者，领主加成才能收尾泽纳加思。',
      },
    },
    artCard: 'Lord of Atlantis',
    list: [
      {
        name: 'Lord of Atlantis',
        quantity: 4,
        keywords: [],
        effect: {
          type: 'anthem_creature_type',
          creatureType: 'Merfolk',
          power: 1,
          toughness: 1,
        },
        oracleNote:
          '(Challenge: other Merfolk you control get +1/+1; islandwalk omitted.)',
        oracleNoteZh: '（挑战：由你操控的其他人鱼得+1/+1；海岛行省略。）',
      },
      {
        name: 'Master of the Pearl Trident',
        quantity: 4,
        keywords: [],
        effect: {
          type: 'anthem_creature_type',
          creatureType: 'Merfolk',
          power: 1,
          toughness: 1,
        },
        oracleNote:
          '(Challenge: other Merfolk you control get +1/+1; islandwalk omitted.)',
        oracleNoteZh: '（挑战：由你操控的其他人鱼得+1/+1；海岛行省略。）',
      },
      {
        name: 'Merfolk of the Pearl Trident',
        quantity: 4,
        keywords: [],
        effect: { type: 'none' },
      },
      {
        name: 'Coral Merfolk',
        quantity: 4,
        keywords: [],
        effect: { type: 'none' },
      },
      {
        name: 'Merfolk Trickster',
        quantity: 4,
        keywords: ['Flash'],
        effect: { type: 'none' },
        oracleNote:
          '(Challenge: ETB tap/hexproof strip omitted — flash body only.)',
        oracleNoteZh: '（挑战：省略进场横置/去辟邪；仅作闪现生物。）',
      },
      {
        name: 'Silvergill Adept',
        quantity: 4,
        keywords: [],
        effect: { type: 'draw', amount: 1 },
        oracleNote:
          '(Challenge: enters, draw a card; reveal Merfolk cost omitted — always draws.)',
        oracleNoteZh: '（挑战：进场抓一张；省略展示人鱼费用——始终抓牌。）',
      },
      // draw on ETB for creature - need to check if draw effect works on creature cast
      {
        name: 'Unsummon',
        quantity: 4,
        effect: { type: 'destroy_creature' },
        oracleNote:
          '(Challenge: bounce treated as destroying the challenge permanent.)',
        oracleNoteZh: '（挑战：弹回按消灭挑战永久物处理。）',
      },
      {
        name: 'Into the Roil',
        quantity: 3,
        effect: { type: 'destroy_creature' },
        oracleNote:
          '(Challenge: bounce treated as destroying the challenge permanent; kicker draw omitted.)',
        oracleNoteZh: '（挑战：弹回按消灭挑战永久物处理；起动式抓牌省略。）',
      },
      {
        name: 'Opt',
        quantity: 4,
        effect: { type: 'scry_draw', scry: 1, draw: 1 },
      },
      { name: 'Island', quantity: 25, effect: { type: 'none' } },
    ],
  },
  akroan: {
    id: 'akroan',
    name: 'Akroan Legion',
    nameZh: '阿喀洛斯军团',
    blurb:
      'White-red Theros soldiers: first strike, vigilance, and flying pressure for chopping Heads and holding the line.',
    blurbZh: '红白 Theros 士兵：先攻、警戒与飞行施压，适合砍头颅与稳住防线。',
    colors: ['W', 'R'],
    archetype: 'aggro',
    hint: 'Attack with multiple creatures to pump Hoplite; first strikers carve Heads before breath.',
    hintZh: '多生物进攻触发步兵泵攻；先攻者在吐息前切掉头颅。',
    hintByChallenge: {
      tfth: {
        en: 'First strike and Hoplite pumps race Heads; chump flyers into breath when needed.',
        zh: '先攻与步兵泵攻抢掉头颅；必要时用飞行挡吐息。',
      },
      tbth: {
        en: 'Burn mills the Horde; keep a wide attack for Hoplite.',
        zh: '直伤磨部落；保持宽攻触发步兵。',
      },
      tdag: {
        en: 'Clear Revelers with burn or Archon, then finish Xenagos.',
        zh: '用直伤或执政清狂欢者，再收尾泽纳加思。',
      },
    },
    artCard: 'Akroan Hoplite',
    list: [
      {
        name: 'Akroan Hoplite',
        quantity: 4,
        keywords: [],
        effect: { type: 'attack_pump_per_attacker', powerPer: 1 },
        oracleNote:
          '(Challenge: when this attacks, it gets +1/+0 until end of turn for each attacking creature you control.)',
        oracleNoteZh:
          '（挑战：当此生物攻击时，攻击中由你操控的生物每有一个，它便得+1/+0直到回合结束。）',
      },
      {
        name: 'Oreskos Swiftclaw',
        quantity: 4,
        keywords: ['First strike'],
        effect: { type: 'none' },
      },
      {
        name: 'Wingsteed Rider',
        quantity: 4,
        keywords: ['Flying'],
        effect: { type: 'none' },
        oracleNote: '(Challenge: Heroic omitted.)',
        oracleNoteZh: '（挑战：省略英雄纪元异能。）',
      },
      {
        name: 'Observant Alseid',
        quantity: 4,
        keywords: ['Vigilance'],
        effect: { type: 'none' },
        oracleNote: '(Challenge: Bestow omitted.)',
        oracleNoteZh: '（挑战：省略寄身异能。）',
      },
      {
        name: 'Anax and Cymede',
        quantity: 2,
        keywords: ['First strike', 'Vigilance'],
        effect: { type: 'none' },
        oracleNote: '(Challenge: Heroic omitted.)',
        oracleNoteZh: '（挑战：省略英雄纪元异能。）',
      },
      {
        name: 'Celestial Archon',
        quantity: 2,
        keywords: ['Flying', 'First strike'],
        effect: { type: 'none' },
        oracleNote: '(Challenge: Bestow omitted.)',
        oracleNoteZh: '（挑战：省略寄身异能。）',
      },
      {
        name: 'Boros Elite',
        quantity: 4,
        keywords: [],
        effect: { type: 'attack_battalion', power: 2, toughness: 2, minAttackers: 3 },
        oracleNote:
          '(Challenge: Battalion — when this and at least two other creatures attack, it gets +2/+2 until end of turn.)',
        oracleNoteZh:
          '（挑战：营队——当此生物与至少两个其他生物攻击时，它得+2/+2直到回合结束。）',
      },
      { name: 'Lightning Strike', quantity: 4, effect: { type: 'damage_any', amount: 3 } },
      { name: 'Shock', quantity: 4, effect: { type: 'damage_any', amount: 2 } },
      {
        name: 'Journey to Nowhere',
        quantity: 3,
        effect: { type: 'destroy_creature' },
        oracleNote:
          '(Challenge: exile is treated as destroying the challenge permanent.)',
        oracleNoteZh: '（挑战：放逐按消灭挑战永久物处理。）',
      },
      { name: 'Plains', quantity: 13, effect: { type: 'none' } },
      { name: 'Mountain', quantity: 12, effect: { type: 'none' } },
    ],
  },
  nessian: {
    id: 'nessian',
    name: 'Nessian Wilds',
    nameZh: '涅西恩荒野',
    blurb:
      'Green Theros beasts with reach and trample — sturdy blockers that finish wide boards late.',
    blurbZh: '具延势与践踏的绿色 Theros 野兽——能挡能打，后期清场。',
    colors: ['G'],
    archetype: 'midrange',
    hint: 'Ramp into Asp and Colossus; fight or trample through blockers; Fog the lethal breath.',
    hintZh: '加速拍出蚺与巨像；互斗或践踏过挡者；浓雾挡致命吐息。',
    hintByChallenge: {
      tfth: {
        en: 'Reach blocks flying Heads; trample spills excess to the next Head.',
        zh: '延势挡飞行头颅；践踏超额溢到下一头颅。',
      },
      tbth: {
        en: 'Big tramplers mill the Horde; fight clears Minotaurs.',
        zh: '大型践踏磨部落；互斗清牛头人。',
      },
      tdag: {
        en: 'Trample over Revelers into Xenagos; keep Fog for combat.',
        zh: '践踏过狂欢者打到泽纳加思；浓雾留给战斗。',
      },
    },
    artCard: 'Arbor Colossus',
    list: [
      {
        name: 'Leafcrown Dryad',
        quantity: 4,
        keywords: ['Reach'],
        effect: { type: 'none' },
        oracleNote: '(Challenge: Bestow omitted.)',
        oracleNoteZh: '（挑战：省略寄身异能。）',
      },
      {
        name: 'Kalonian Tusker',
        quantity: 4,
        keywords: [],
        effect: { type: 'none' },
      },
      {
        name: 'Nessian Courser',
        quantity: 4,
        keywords: [],
        effect: { type: 'none' },
      },
      {
        name: 'Slaughterhorn',
        quantity: 4,
        keywords: ['Trample'],
        effect: { type: 'none' },
        oracleNote:
          '(Challenge: Bloodrush omitted; Trample granted for Challenge midrange.)',
        oracleNoteZh: '（挑战：省略血奔；为挑战中速赋予践踏。）',
      },
      {
        name: 'Nessian Asp',
        quantity: 3,
        keywords: ['Reach'],
        effect: {
          type: 'activate_monstrosity',
          manaCost: '{6}{G}',
          power: 4,
          toughness: 4,
        },
      },
      {
        name: 'Arbor Colossus',
        quantity: 2,
        keywords: ['Reach'],
        effect: {
          type: 'activate_monstrosity',
          manaCost: '{3}{G}{G}{G}',
          power: 3,
          toughness: 3,
        },
        oracleNote:
          '(Challenge: monstrosity destroy-flyer trigger omitted.)',
        oracleNoteZh: '（挑战：省略庞大化消灭飞行生物的触发。）',
      },
      {
        name: 'Elvish Mystic',
        quantity: 4,
        keywords: [],
        effect: { type: 'mana_dork', color: 'G' },
      },
      { name: 'Prey Upon', quantity: 4, effect: { type: 'fight' } },
      { name: 'Fog', quantity: 4, effect: { type: 'fog' } },
      {
        name: 'Giant Growth',
        quantity: 3,
        effect: { type: 'pump_target', power: 3, toughness: 3 },
      },
      { name: 'Forest', quantity: 24, effect: { type: 'none' } },
    ],
  },
  humans: {
    id: 'humans',
    name: 'Parish Host',
    nameZh: '教区人海',
    blurb:
      'White Human tribal adapted from Modern Humans: Parish counters, Lieutenant anthem, and cheap bodies with exile removal.',
    blurbZh:
      '自近代人类改编的白色人类部族：教区冠军指示物、中尉颂歌、廉价生物配合放逐清除。',
    colors: ['W'],
    archetype: 'aggro',
    hint: 'Curve Humans into Parish and Lieutenant; keep pressure wide for lords.',
    hintZh: '曲线铺人类接冠军与中尉；保持宽场面吃满领主加成。',
    hintByChallenge: {
      tfth: {
        en: 'Wide Human boards carve Heads; exile must-answer Heads.',
        zh: '宽人类场面砍头颅；用放逐处理必须回答的头颅。',
      },
      tbth: {
        en: 'Race the Horde with anthemed Humans; removal buys time.',
        zh: '用颂歌人类与部落赛跑；清除换时间。',
      },
      tdag: {
        en: 'Exile Revelers so Xenagos can die to the Human swarm.',
        zh: '放逐狂欢者，人类海才能击杀泽纳加思。',
      },
    },
    artCard: 'Champion of the Parish',
    list: [
      {
        name: 'Champion of the Parish',
        quantity: 4,
        keywords: [],
        effect: { type: 'parish_counters' },
        oracleNote:
          '(Challenge: whenever another Human you control enters, this gets a +1/+1 counter.)',
        oracleNoteZh:
          '（挑战：每当另一个由你操控的人类进场时，此生物获得一个+1/+1指示物。）',
      },
      {
        name: "Thalia's Lieutenant",
        quantity: 4,
        keywords: [],
        effect: {
          type: 'anthem_creature_type',
          creatureType: 'Human',
          power: 1,
          toughness: 1,
        },
        oracleNote:
          '(Challenge: other Humans you control get +1/+1; ETB pump omitted — static anthem only.)',
        oracleNoteZh:
          '（挑战：由你操控的其他人类得+1/+1；省略进场泵攻——仅静态颂歌。）',
      },
      {
        name: 'Soldier of the Pantheon',
        quantity: 4,
        keywords: [],
        effect: { type: 'none' },
        oracleNote:
          '(Challenge: protection from multicolored omitted — 2/1 Human body.)',
        oracleNoteZh: '（挑战：省略防多色——仅 2/1 人类身材。）',
      },
      {
        name: 'Elite Vanguard',
        quantity: 4,
        keywords: [],
        effect: { type: 'none' },
      },
      {
        name: 'Thraben Inspector',
        quantity: 4,
        keywords: [],
        effect: { type: 'draw', amount: 1 },
        oracleNote:
          '(Challenge: Clue omitted — enters and draws a card.)',
        oracleNoteZh: '（挑战：省略线索——进场抓一张牌。）',
      },
      {
        name: 'Benalish Marshal',
        quantity: 3,
        keywords: [],
        effect: {
          type: 'anthem_creature_type',
          creatureType: 'Human',
          power: 1,
          toughness: 1,
        },
        oracleNote:
          '(Challenge: other creatures get +1/+1 approximated as other Humans +1/+1.)',
        oracleNoteZh:
          '（挑战：其他生物+1/+1 近似为其他人类+1/+1。）',
      },
      {
        name: 'Journey to Nowhere',
        quantity: 4,
        effect: { type: 'destroy_creature' },
        oracleNote:
          '(Challenge: exile is treated as destroying the challenge permanent.)',
        oracleNoteZh: '（挑战：放逐按消灭挑战永久物处理。）',
      },
      {
        name: 'Banishing Light',
        quantity: 3,
        effect: { type: 'destroy_creature' },
        oracleNote:
          '(Challenge: exile is treated as destroying the challenge permanent.)',
        oracleNoteZh: '（挑战：放逐按消灭挑战永久物处理。）',
      },
      { name: 'Plains', quantity: 30, effect: { type: 'none' } },
    ],
  },
  spirits: {
    id: 'spirits',
    name: 'Spectral Chorus',
    nameZh: '幽影合唱',
    blurb:
      'White-blue Spirit tempo adapted from Pioneer Spirits: flying lords, flash bodies, and bounce/removal.',
    blurbZh:
      '自先驱精怪改编的白蓝精怪节奏：飞行领主、闪现身材、弹回与清除。',
    colors: ['W', 'U'],
    archetype: 'tempo',
    hint: 'Curve Spirit lords, flash in blockers, then clear Revelers or Heads before swinging.',
    hintZh: '曲线精怪领主，闪现挡者，开战前清狂欢者或头颅。',
    hintByChallenge: {
      tfth: {
        en: 'Flyers race Heads; bounce resets a regenerating Head.',
        zh: '飞行与头颅赛跑；弹回可重置会再生的头颅。',
      },
      tbth: {
        en: 'Anthemed flyers mill the Horde; flash blocks buy a turn.',
        zh: '颂歌飞行磨部落；闪现阻挡换回合。',
      },
      tdag: {
        en: 'Remove Revelers, then finish Xenagos in the air.',
        zh: '先清狂欢者，再从空中收尾泽纳加思。',
      },
    },
    artCard: 'Supreme Phantom',
    list: [
      {
        name: 'Supreme Phantom',
        quantity: 4,
        keywords: ['Flying'],
        effect: {
          type: 'anthem_creature_type',
          creatureType: 'Spirit',
          power: 1,
          toughness: 1,
        },
      },
      {
        name: 'Mausoleum Wanderer',
        quantity: 4,
        keywords: ['Flying'],
        effect: { type: 'none' },
        oracleNote:
          '(Challenge: spell-counter / power-from-Spirits omitted — flying Spirit body.)',
        oracleNoteZh: '（挑战：省略反击与按精怪数加力——仅飞行精怪身材。）',
      },
      {
        name: 'Rattlechains',
        quantity: 4,
        keywords: ['Flash', 'Flying'],
        effect: { type: 'none' },
        oracleNote:
          '(Challenge: give-flash / hexproof to Spirits omitted — flash flyer.)',
        oracleNoteZh: '（挑战：省略赋予闪现/辟邪——仅闪现飞行。）',
      },
      {
        name: 'Spectral Sailor',
        quantity: 4,
        keywords: ['Flash', 'Flying'],
        effect: { type: 'activate_draw', manaCost: '{3}{U}', amount: 1 },
      },
      {
        name: 'Remorseful Cleric',
        quantity: 3,
        keywords: ['Flying'],
        effect: { type: 'none' },
        oracleNote:
          '(Challenge: activate exile graveyard omitted — flying Spirit body.)',
        oracleNoteZh: '（挑战：省略启动放逐坟墓——仅飞行精怪身材。）',
      },
      {
        name: 'Empyrean Eagle',
        quantity: 3,
        keywords: ['Flying'],
        effect: { type: 'anthem_other_flyers', power: 1, toughness: 1 },
      },
      {
        name: 'Unsummon',
        quantity: 4,
        effect: { type: 'destroy_creature' },
        oracleNote:
          '(Challenge: bounce treated as destroying the challenge permanent.)',
        oracleNoteZh: '（挑战：弹回按消灭挑战永久物处理。）',
      },
      {
        name: 'Journey to Nowhere',
        quantity: 3,
        effect: { type: 'destroy_creature' },
        oracleNote:
          '(Challenge: exile is treated as destroying the challenge permanent.)',
        oracleNoteZh: '（挑战：放逐按消灭挑战永久物处理。）',
      },
      { name: 'Opt', quantity: 4, effect: { type: 'scry_draw', scry: 1, draw: 1 } },
      { name: 'Plains', quantity: 12, effect: { type: 'none' } },
      { name: 'Island', quantity: 15, effect: { type: 'none' } },
    ],
  },
  jund: {
    id: 'jund',
    name: 'Bloodbraid Barrens',
    nameZh: '血辫荒原',
    blurb:
      'Black-red-green midrange adapted from Modern Jund: value creatures, bolts, and fight/removal to grind Challenge boards.',
    blurbZh:
      '自近代杰恩德改编的黑红绿中速：价值生物、闪电击与互斗/清除，磨掉挑战场面。',
    colors: ['B', 'R', 'G'],
    archetype: 'midrange',
    hint: 'Curve midrange threats; bolt or fight key permanents; grind with card advantage.',
    hintZh: '曲线中速威胁；用闪电或互斗清关键永久物；用卡优磨穿。',
    hintByChallenge: {
      tfth: {
        en: 'Fight and bolt Heads; Fog the big breath turns.',
        zh: '互斗与闪电砍头颅；大吐息回合用浓雾。',
      },
      tbth: {
        en: 'Bolts mill the Horde; keep pressure with hasty threats.',
        zh: '闪电磨部落；用敏捷威胁持续施压。',
      },
      tdag: {
        en: 'Clear Revelers with removal, then finish Xenagos.',
        zh: '用清除清狂欢者，再收尾泽纳加思。',
      },
    },
    artCard: 'Bloodbraid Elf',
    list: [
      {
        name: 'Bloodbraid Elf',
        quantity: 4,
        keywords: ['Haste'],
        effect: { type: 'draw', amount: 1 },
        oracleNote:
          '(Challenge: cascade approximated as draw a card on ETB.)',
        oracleNoteZh: '（挑战：倾曳近似为进场抓一张牌。）',
      },
      {
        name: 'Tarmogoyf',
        quantity: 4,
        keywords: [],
        effect: {
          type: 'etb_self_pump',
          power: 2,
          toughness: 2,
          untilEndOfTurn: false,
        },
        oracleNote:
          '(Challenge: enters as 2/3 then sticky +2/+2 — approximate CDAs without counting types.)',
        oracleNoteZh:
          '（挑战：以 2/3 进场并永久 +2/+2 近似——不按牌类计数。）',
      },
      {
        name: 'Scavenging Ooze',
        quantity: 3,
        keywords: [],
        effect: { type: 'scavenge_ooze', manaCost: '{G}' },
        oracleNote:
          '(Challenge: double-click to pay {G}; prefers challenge graveyard.)',
        oracleNoteZh: '（挑战：双击支付{G}；优先挑战坟墓场。）',
      },
      {
        name: 'Kitchen Finks',
        quantity: 3,
        keywords: [],
        effect: { type: 'etb_gain_life', amount: 2, persist: true },
      },
      {
        name: 'Lightning Bolt',
        quantity: 4,
        effect: { type: 'damage_any', amount: 3 },
      },
      {
        name: 'Terminate',
        quantity: 4,
        effect: { type: 'destroy_creature' },
      },
      {
        name: 'Maelstrom Pulse',
        quantity: 2,
        effect: { type: 'destroy_creature', sameName: true },
        oracleNote:
          '(Challenge: challenge creatures only; same-name wipe included.)',
        oracleNoteZh: '（挑战：仅挑战生物；含同名清场。）',
      },
      { name: 'Prey Upon', quantity: 3, effect: { type: 'fight' } },
      { name: 'Fog', quantity: 3, effect: { type: 'fog' } },
      {
        name: 'Elvish Mystic',
        quantity: 4,
        effect: { type: 'mana_dork', color: 'G' },
      },
      { name: 'Swamp', quantity: 8, effect: { type: 'none' } },
      { name: 'Mountain', quantity: 8, effect: { type: 'none' } },
      { name: 'Forest', quantity: 10, effect: { type: 'none' } },
    ],
  },
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { ...HEADERS, Accept: '*/*' } })
  if (!res.ok) throw new Error(`dl ${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
  return buf.length
}

async function buildDeck(key) {
  const cfg = DECKS[key]
  if (!cfg) throw new Error(`Unknown deck ${key}. Use: ${Object.keys(DECKS).join(', ')}`)

  const outCards = []
  const assetDir = path.join(root, 'public', 'assets', 'cards', 'player')
  await mkdir(assetDir, { recursive: true })

  for (const entry of cfg.list) {
    const card = await named(entry.name)
    const zh = await zhsPrint(card.oracle_id)
    const id = card.id
    const normalLocal = `assets/cards/player/${id}-normal.jpg`
    const artLocal = `assets/cards/player/${id}-art.jpg`
    const normalAbs = path.join(root, 'public', normalLocal)
    const artAbs = path.join(root, 'public', artLocal)

    const nBytes = await download(
      `https://cards.scryfall.io/normal/front/${id[0]}/${id[1]}/${id}.jpg`,
      normalAbs,
    )
    await sleep(80)
    const aBytes = await download(
      `https://cards.scryfall.io/art_crop/front/${id[0]}/${id[1]}/${id}.jpg`,
      artAbs,
    )
    console.log(`${entry.name}: normal ${nBytes} art ${aBytes}`)

    const typeLine = card.type_line
    const kind = kindOf(typeLine)
    const produces = producesFrom(card.name, typeLine, card.oracle_text ?? '')
    const power =
      card.power == null || card.power === '*' ? null : Number(card.power)
    const toughness =
      card.toughness == null || card.toughness === '*'
        ? null
        : Number(card.toughness)

    let oracleText = card.oracle_text ?? ''
    let oracleTextZh = zh?.printed_text ?? card.oracle_text ?? ''
    if (entry.oracleNote) {
      oracleText = oracleText
        ? `${oracleText}\n${entry.oracleNote}`
        : entry.oracleNote
    }
    if (entry.oracleNoteZh) {
      oracleTextZh = oracleTextZh
        ? `${oracleTextZh}\n${entry.oracleNoteZh}`
        : entry.oracleNoteZh
    }

    const row = {
      id,
      quantity: entry.quantity,
      name: card.name,
      nameZh: entry.nameZh ?? zh?.printed_name ?? card.name,
      typeLine,
      typeLineZh: zh?.printed_type_line ?? typeLine,
      oracleText,
      oracleTextZh,
      manaCost: card.mana_cost ?? '',
      cmc: card.cmc ?? 0,
      power: Number.isFinite(power) ? power : null,
      toughness: Number.isFinite(toughness) ? toughness : null,
      keywords: entry.keywords ?? card.keywords ?? [],
      kind,
      ...(produces ? { produces } : {}),
      effect: entry.effect,
      ...(entry.flashback ? { flashback: entry.flashback } : {}),
      image: normalLocal,
    }
    outCards.push(row)
  }

  const artCard = outCards.find((c) => c.name === cfg.artCard) ?? outCards[0]
  const deck = {
    id: cfg.id,
    name: cfg.name,
    nameZh: cfg.nameZh,
    blurb: cfg.blurb,
    blurbZh: cfg.blurbZh,
    colors: cfg.colors,
    archetype: cfg.archetype,
    hint: cfg.hint,
    hintZh: cfg.hintZh,
    ...(cfg.hintByChallenge ? { hintByChallenge: cfg.hintByChallenge } : {}),
    art: `assets/cards/player/${artCard.id}-art.jpg`,
    cards: outCards,
  }

  const total = outCards.reduce((s, c) => s + c.quantity, 0)
  console.log('Total cards:', total)
  if (total !== 60) console.warn(`Expected 60, got ${total}`)

  const outPath = path.join(root, 'src', 'data', 'cards', 'player', `${cfg.id}.json`)
  await writeFile(outPath, `${JSON.stringify(deck, null, 2)}\n`)
  console.log('Wrote', outPath)
}

const key = process.argv[2]
if (!key) {
  console.error(
    'Usage: node scripts/build-player-deck.mjs <burn|skies|terror|merfolk|akroan|nessian|humans|spirits|jund>',
  )
  process.exit(1)
}

buildDeck(key).catch((e) => {
  console.error(e)
  process.exit(1)
})
