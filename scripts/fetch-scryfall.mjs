import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const HEADERS = {
  'User-Agent': 'magic-solo/0.1 (github.com/local/magic-solo; challenge-deck archive)',
  Accept: 'application/json',
}

const QUANTITIES = {
  tfth: {
    'Hydra Head': 11,
    'Ravenous Brute Head': 4,
    'Savage Vigor Head': 1,
    'Shrieking Titan Head': 1,
    'Snapping Fang Head': 1,
    'Disorienting Glower': 5,
    'Distract the Hydra': 5,
    'Grown from the Stump': 4,
    "Hydra's Impenetrable Hide": 4,
    'Neck Tangle': 3,
    'Noxious Hydra Breath': 4,
    'Strike the Weak Spot': 2,
    'Swallow the Hero Whole': 5,
    'Torn Between Heads': 4,
    'Unified Lunge': 6,
  },
  tbth: {
    'Minotaur Goreseeker': 10,
    'Minotaur Younghorn': 15,
    "Mogis's Chosen": 4,
    'Phoberos Reaver': 10,
    'Reckless Minotaur': 4,
    'Consuming Rage': 2,
    'Descend on the Prey': 2,
    'Intervention of Keranos': 2,
    'Touch of the Horned God': 2,
    'Unquenchable Fury': 2,
    'Altar of Mogis': 1,
    'Massacre Totem': 1,
    'Plundered Statue': 2,
    'Refreshing Elixir': 2,
    'Vitality Salve': 1,
  },
  tdag: {
    'Xenagos Ascended': 1,
    'Rollicking Throng': 6,
    'Ecstatic Piper': 16,
    'Maddened Oread': 2,
    'Pheres-Band Revelers': 4,
    'Serpent Dancers': 2,
    'Wild Maenads': 2,
    'Impulsive Charge': 7,
    'Impulsive Destruction': 2,
    'Impulsive Return': 4,
    'Rip to Pieces': 2,
    "Xenagos's Scorn": 3,
    "Xenagos's Strike": 5,
    'Dance of Flame': 2,
    'Dance of Panic': 2,
  },
}

const SETS = [
  {
    code: 'tfth',
    name: 'Face the Hydra',
    challengeNumber: 1,
    setCode: 'TFTH',
    backColor: 'green',
    theme: 'hydra',
    heroCard: 'Hydra Head',
    wikiUrl: 'https://mtg.wiki/page/Face_the_Hydra',
    scryfallSetUri: 'https://scryfall.com/sets/tfth',
  },
  {
    code: 'tbth',
    name: 'Battle the Horde',
    challengeNumber: 2,
    setCode: 'TBTH',
    backColor: 'red',
    theme: 'horde',
    heroCard: 'Minotaur Goreseeker',
    wikiUrl: 'https://mtg.wiki/page/Battle_the_Horde',
    scryfallSetUri: 'https://scryfall.com/sets/tbth',
  },
  {
    code: 'tdag',
    name: 'Defeat a God',
    challengeNumber: 3,
    setCode: 'TDAG',
    backColor: 'indigo',
    theme: 'god',
    heroCard: 'Xenagos Ascended',
    wikiUrl: 'https://mtg.wiki/page/Defeat_a_God',
    scryfallSetUri: 'https://scryfall.com/sets/tdag',
  },
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  return res.json()
}

async function downloadFile(url, dest) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': HEADERS['User-Agent'],
      Accept: '*/*',
    },
  })
  if (!res.ok) {
    throw new Error(`Download failed ${res.status}: ${url}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
  return buf.length
}

function backPngUrl(cardBackId) {
  return `https://backs.scryfall.io/png/${cardBackId[0]}/${cardBackId[1]}/${cardBackId}.png`
}

async function fetchSetCards(setCode) {
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`set:${setCode}`)}&unique=prints&order=set`
  const data = await fetchJson(url)
  if (data.has_more) {
    throw new Error(`Unexpected pagination for set ${setCode}`)
  }
  return data.data
}

async function processSet(meta) {
  console.log(`\n=== ${meta.name} (${meta.code}) ===`)
  const cards = await fetchSetCards(meta.code)
  await sleep(120)

  const assetDir = path.join(root, 'public', 'assets', 'cards', meta.code)
  await mkdir(assetDir, { recursive: true })

  const cardBackId = cards[0]?.card_back_id
  if (!cardBackId) {
    throw new Error(`No card_back_id for ${meta.code}`)
  }

  const backPath = path.join(assetDir, 'back.png')
  const backBytes = await downloadFile(backPngUrl(cardBackId), backPath)
  console.log(`  back.png (${backBytes} bytes)`)
  await sleep(120)

  const quantities = QUANTITIES[meta.code]
  const cardRecords = []
  let heroArt = null

  for (const card of cards) {
    const slug = slugify(card.name)
    const frontFile = `${card.collector_number}-${slug}-front.png`
    const frontAbs = path.join(assetDir, frontFile)
    const pngUrl = card.image_uris?.png
    if (!pngUrl) {
      throw new Error(`Missing png for ${card.name}`)
    }

    const bytes = await downloadFile(pngUrl, frontAbs)
    console.log(`  ${frontFile} (${bytes} bytes)`)
    await sleep(120)

    const quantity = quantities[card.name] ?? 1
    const record = {
      id: card.id,
      name: card.name,
      collectorNumber: card.collector_number,
      typeLine: card.type_line,
      oracleText: card.oracle_text ?? '',
      power: card.power ?? null,
      toughness: card.toughness ?? null,
      manaCost: card.mana_cost ?? '',
      cmc: card.cmc,
      keywords: card.keywords ?? [],
      artist: card.artist ?? '',
      rarity: card.rarity,
      layout: card.layout,
      highresImage: card.highres_image,
      imageStatus: card.image_status,
      scryfallUri: card.scryfall_uri,
      quantity,
      images: {
        front: `assets/cards/${meta.code}/${frontFile}`,
        back: `assets/cards/${meta.code}/back.png`,
        artCrop: card.image_uris?.art_crop ?? null,
      },
    }
    cardRecords.push(record)

    if (card.name === meta.heroCard) {
      heroArt = record.images.artCrop || record.images.front
    }
  }

  cardRecords.sort((a, b) => Number(a.collectorNumber) - Number(b.collectorNumber))

  const deckJson = {
    code: meta.code,
    name: meta.name,
    challengeNumber: meta.challengeNumber,
    setCode: meta.setCode,
    backColor: meta.backColor,
    theme: meta.theme,
    cardBackId,
    wikiUrl: meta.wikiUrl,
    scryfallSetUri: meta.scryfallSetUri,
    heroArt: heroArt ?? cardRecords[0]?.images.artCrop,
    totalUniqueCards: cardRecords.length,
    totalDeckSize: cardRecords.reduce((sum, c) => sum + c.quantity, 0),
    cards: cardRecords,
    fetchedAt: new Date().toISOString(),
    attribution: 'Card data and images provided by Scryfall (https://scryfall.com).',
  }

  const dataDir = path.join(root, 'src', 'data', 'decks')
  await mkdir(dataDir, { recursive: true })
  await writeFile(
    path.join(dataDir, `${meta.code}.json`),
    `${JSON.stringify(deckJson, null, 2)}\n`,
    'utf8',
  )

  return {
    code: meta.code,
    name: meta.name,
    challengeNumber: meta.challengeNumber,
    setCode: meta.setCode,
    backColor: meta.backColor,
    theme: meta.theme,
    wikiUrl: meta.wikiUrl,
    scryfallSetUri: meta.scryfallSetUri,
    heroArt: deckJson.heroArt,
    backImage: `assets/cards/${meta.code}/back.png`,
    totalUniqueCards: deckJson.totalUniqueCards,
    totalDeckSize: deckJson.totalDeckSize,
  }
}

async function main() {
  const index = []
  for (const meta of SETS) {
    index.push(await processSet(meta))
  }

  index.sort((a, b) => a.challengeNumber - b.challengeNumber)
  const dataDir = path.join(root, 'src', 'data', 'decks')
  await writeFile(
    path.join(dataDir, 'index.json'),
    `${JSON.stringify({ decks: index, fetchedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  )
  console.log('\nDone. Wrote deck manifests to src/data/decks/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
