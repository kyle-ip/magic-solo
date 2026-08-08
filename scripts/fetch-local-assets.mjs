/**
 * Download remaining remote Scryfall / cover assets into public/assets
 * and rewrite manifests to local paths:
 * - official box covers
 * - challenge deck art crops + heroArt
 * - player muster deck card images + tile art
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const HEADERS = {
  'User-Agent': 'magic-solo/0.1 (github.com/local/magic-solo; challenge-deck archive)',
  Accept: '*/*',
}

const COVERS = [
  {
    code: 'tfth',
    url: 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/e/e4/FacetheHydra.jpg/revision/latest?cb=20131017044956',
    ext: 'webp',
  },
  {
    code: 'tbth',
    url: 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/4/4d/Battle_the_Horde.jpg/revision/latest?cb=20140223070301',
    ext: 'webp',
  },
  {
    code: 'tdag',
    url: 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/d/d4/Defeat_a_God.jpg/revision/latest?cb=20140523051933',
    ext: 'webp',
  },
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

async function download(url, dest, { force = false } = {}) {
  if (!force && (await exists(dest))) {
    return { skipped: true, bytes: 0 }
  }
  await mkdir(path.dirname(dest), { recursive: true })
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
  return { skipped: false, bytes: buf.length }
}

function scryfallIdFromUrl(url) {
  const m = String(url).match(
    /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\./i,
  )
  return m?.[1] ?? null
}

function artCropUrl(cardId) {
  return `https://cards.scryfall.io/art_crop/front/${cardId[0]}/${cardId[1]}/${cardId}.jpg`
}

function normalUrl(cardId) {
  return `https://cards.scryfall.io/normal/front/${cardId[0]}/${cardId[1]}/${cardId}.jpg`
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function fetchCovers() {
  console.log('\n=== Covers ===')
  const coverDir = path.join(root, 'public', 'assets', 'covers')
  await mkdir(coverDir, { recursive: true })

  for (const cover of COVERS) {
    const dest = path.join(coverDir, `${cover.code}.${cover.ext}`)
    const result = await download(cover.url, dest)
    console.log(
      result.skipped
        ? `  ${cover.code}.${cover.ext} (exists)`
        : `  ${cover.code}.${cover.ext} (${result.bytes} bytes)`,
    )
    await sleep(120)
  }

  const indexPath = path.join(root, 'src', 'data', 'decks', 'index.json')
  const index = JSON.parse(await readFile(indexPath, 'utf8'))
  for (const deck of index.decks) {
    const cover = COVERS.find((c) => c.code === deck.code)
    deck.coverImage = `assets/covers/${cover.code}.${cover.ext}`
  }
  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`)

  for (const code of ['tfth', 'tbth', 'tdag']) {
    const deckPath = path.join(root, 'src', 'data', 'decks', `${code}.json`)
    const deck = JSON.parse(await readFile(deckPath, 'utf8'))
    const cover = COVERS.find((c) => c.code === code)
    deck.coverImage = `assets/covers/${cover.code}.${cover.ext}`
    await writeFile(deckPath, `${JSON.stringify(deck, null, 2)}\n`)
  }
}

async function fetchChallengeArtCrops() {
  console.log('\n=== Challenge art crops ===')
  const indexPath = path.join(root, 'src', 'data', 'decks', 'index.json')
  const index = JSON.parse(await readFile(indexPath, 'utf8'))

  for (const code of ['tfth', 'tbth', 'tdag']) {
    const deckPath = path.join(root, 'src', 'data', 'decks', `${code}.json`)
    const deck = JSON.parse(await readFile(deckPath, 'utf8'))
    const assetDir = path.join(root, 'public', 'assets', 'cards', code)
    const heroId =
      scryfallIdFromUrl(deck.heroArt) ??
      scryfallIdFromUrl(index.decks.find((d) => d.code === code)?.heroArt)

    for (const card of deck.cards) {
      const artFile = `${card.collectorNumber}-${slugify(card.name)}-art.jpg`
      const abs = path.join(assetDir, artFile)
      const url =
        typeof card.images.artCrop === 'string' &&
        card.images.artCrop.startsWith('http')
          ? card.images.artCrop.split('?')[0]
          : artCropUrl(card.id)
      const result = await download(url, abs)
      card.images.artCrop = `assets/cards/${code}/${artFile}`
      console.log(
        result.skipped
          ? `  ${code}/${artFile} (exists)`
          : `  ${code}/${artFile} (${result.bytes} bytes)`,
      )
      await sleep(110)
    }

    const heroCard =
      deck.cards.find((c) => c.id === heroId) ??
      deck.cards.find((c) => c.images.artCrop === deck.heroArt) ??
      deck.cards[0]
    deck.heroArt = heroCard.images.artCrop
    await writeFile(deckPath, `${JSON.stringify(deck, null, 2)}\n`)

    const indexDeck = index.decks.find((d) => d.code === code)
    if (indexDeck) {
      indexDeck.heroArt = deck.heroArt
      indexDeck.coverImage = deck.coverImage
    }
  }

  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`)
}

async function fetchPlayerDecks() {
  console.log('\n=== Player muster decks ===')
  const playerTsPath = path.join(root, 'src', 'game', 'playerDecks.ts')
  let source = await readFile(playerTsPath, 'utf8')
  const urlRe =
    /https:\/\/cards\.scryfall\.io\/(normal|art_crop)\/front\/[0-9a-f]\/[0-9a-f]\/([0-9a-f-]{36})\.jpg(?:\?[^\s'"]*)?/gi

  const jobs = new Map()
  for (const match of source.matchAll(urlRe)) {
    const kind = match[1].toLowerCase() === 'art_crop' ? 'art' : 'normal'
    const id = match[2]
    const key = `${id}:${kind}`
    if (!jobs.has(key)) {
      jobs.set(key, {
        id,
        kind,
        url: match[0].split('?')[0],
        local: `assets/cards/player/${id}-${kind}.jpg`,
      })
    }
  }

  // Ensure each unique id has both normal + art when we only saw one type
  const ids = new Set([...jobs.values()].map((j) => j.id))
  for (const id of ids) {
    for (const kind of ['normal', 'art']) {
      const key = `${id}:${kind}`
      if (!jobs.has(key)) {
        jobs.set(key, {
          id,
          kind,
          url: kind === 'art' ? artCropUrl(id) : normalUrl(id),
          local: `assets/cards/player/${id}-${kind}.jpg`,
        })
      }
    }
  }

  const playerDir = path.join(root, 'public', 'assets', 'cards', 'player')
  await mkdir(playerDir, { recursive: true })

  for (const job of jobs.values()) {
    const abs = path.join(root, 'public', job.local)
    const result = await download(job.url, abs)
    console.log(
      result.skipped
        ? `  ${job.local} (exists)`
        : `  ${job.local} (${result.bytes} bytes)`,
    )
    await sleep(110)
  }

  source = source.replace(urlRe, (full, type, id) => {
    const kind = String(type).toLowerCase() === 'art_crop' ? 'art' : 'normal'
    return `assets/cards/player/${id}-${kind}.jpg`
  })
  await writeFile(playerTsPath, source, 'utf8')
  console.log(`  updated ${path.relative(root, playerTsPath)}`)
}

async function main() {
  await fetchCovers()
  await fetchChallengeArtCrops()
  await fetchPlayerDecks()
  console.log('\nDone. Local assets ready under public/assets/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
