/**
 * Build Challenge Experience player decks from Scryfall + local images.
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
  if (/Sorcery/i.test(typeLine)) return 'sorcery'
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
    name: 'Challenge Burn',
    nameZh: '挑战燃烧',
    blurb:
      'Low-curve red burn adapted for Challenge Experience: haste attackers and Lightning Bolt-style damage to Heads, the Horde library, or Revelers.',
    blurbZh:
      '为挑战体验精简的低曲线红色燃烧：敏捷生物配合闪电击式直伤，可打头颅、磨部落牌库或点掉狂欢者。',
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
        name: 'Cast Down',
        quantity: 4,
        nameZh: '湮灭',
        effect: { type: 'destroy_creature', nonlegendary: true },
      },
      { name: 'Murder', quantity: 4, effect: { type: 'destroy_creature' } },
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
  console.error('Usage: node scripts/build-player-deck.mjs <burn|skies|terror>')
  process.exit(1)
}

buildDeck(key).catch((e) => {
  console.error(e)
  process.exit(1)
})
