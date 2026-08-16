/**
 * Build UB Tolarian Terror deck JSON from Scryfall + fetch images.
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
  if (/Island/i.test(typeLine)) return ['U']
  if (/Swamp/i.test(typeLine)) return ['B']
  if (/Dismal Backwater/i.test(name) || /\{T\}: Add \{U\} or \{B\}/i.test(oracleText))
    return ['U', 'B']
  if (/Bojuka Bog/i.test(name) || /\{T\}: Add \{B\}\./i.test(oracleText)) return ['B']
  return undefined
}

/** quantity + effect overrides keyed by English name */
const LIST = [
  {
    name: 'Mental Note',
    quantity: 4,
    nameZh: '读心记事',
    effect: { type: 'mill_draw', mill: 2, draw: 1 },
  },
  {
    name: 'Brainstorm',
    quantity: 4,
    effect: { type: 'brainstorm' },
  },
  {
    name: 'Thought Scour',
    quantity: 4,
    effect: { type: 'mill_draw', mill: 2, draw: 1, target: 'self' },
  },
  {
    name: 'Spell Pierce',
    quantity: 3,
    nameZh: '点破咒语',
    effect: { type: 'none' },
  },
  {
    name: 'Counterspell',
    quantity: 3,
    effect: { type: 'none' },
  },
  {
    name: 'Deep Analysis',
    quantity: 2,
    effect: { type: 'draw', amount: 2 },
  },
  {
    name: 'Unexpected Fangs',
    quantity: 1,
    effect: { type: 'fangs' },
  },
  {
    name: "Chainer's Edict",
    quantity: 1,
    nameZh: '崔娜的勒令',
    effect: { type: 'edict' },
  },
  {
    name: 'Crawl from the Cellar',
    quantity: 1,
    effect: { type: 'crawl_cellar' },
  },
  {
    name: 'Cast Down',
    quantity: 4,
    nameZh: '湮灭',
    effect: { type: 'destroy_creature' },
  },
  {
    name: 'Fallaji Archaeologist',
    quantity: 4,
    effect: { type: 'etb_mill_loot', mill: 3 },
  },
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
  {
    name: 'Island',
    quantity: 12,
    effect: { type: 'none' },
  },
  {
    name: 'Swamp',
    quantity: 7,
    effect: { type: 'none' },
  },
  {
    name: 'Dismal Backwater',
    quantity: 1,
    effect: { type: 'etb_gain_life', amount: 1 },
  },
  {
    name: 'Bojuka Bog',
    quantity: 1,
    nameZh: '放逐墓地沼泽',
    effect: { type: 'etb_exile_opp_graveyard' },
  },
]

async function download(url, dest) {
  const res = await fetch(url, { headers: { ...HEADERS, Accept: '*/*' } })
  if (!res.ok) throw new Error(`dl ${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
  return buf.length
}

async function main() {
  const outCards = []
  const assetDir = path.join(root, 'public', 'assets', 'cards', 'player')
  await mkdir(assetDir, { recursive: true })

  for (const entry of LIST) {
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

    const row = {
      id,
      quantity: entry.quantity,
      name: card.name,
      nameZh: entry.nameZh ?? zh?.printed_name ?? card.name,
      typeLine,
      typeLineZh: zh?.printed_type_line ?? typeLine,
      oracleText: card.oracle_text ?? '',
      oracleTextZh: zh?.printed_text ?? card.oracle_text ?? '',
      manaCost: card.mana_cost ?? '',
      cmc: card.cmc ?? 0,
      power: Number.isFinite(power) ? power : null,
      toughness: Number.isFinite(toughness) ? toughness : null,
      keywords: entry.keywords ?? card.keywords ?? [],
      kind,
      ...(produces ? { produces } : {}),
      effect: entry.effect,
      image: normalLocal,
    }
    outCards.push(row)
  }

  const deck = {
    id: 'terror',
    name: 'UB Terror',
    nameZh: '蓝黑惧兽',
    blurb:
      'Pauper Dimir Tolarian Terror: mill/filter into the yard, then land discounted Terrors and delved Anglers. Soft counters are inert in Challenge.',
    blurbZh:
      '蓝黑惧兽：用洗牌与滤牌填坟，减费拍出陶拉利亚惧兽与掘坟谷尔玛钓客。点破/反击在挑战中无交互堆叠，暂不生效。',
    art: `assets/cards/player/${outCards.find((c) => c.name === 'Tolarian Terror').id}-art.jpg`,
    cards: outCards,
  }

  const total = outCards.reduce((s, c) => s + c.quantity, 0)
  console.log('Total cards:', total)
  const outPath = path.join(root, 'src', 'data', 'cards', 'player', 'terror.json')
  await writeFile(outPath, `${JSON.stringify(deck, null, 2)}\n`)
  console.log('Wrote', outPath)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
