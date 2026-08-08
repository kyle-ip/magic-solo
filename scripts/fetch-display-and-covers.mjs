import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises'
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
    // Official product packaging (MTG Wiki / MTG Salvation)
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

function largeUrl(cardId) {
  return `https://cards.scryfall.io/large/front/${cardId[0]}/${cardId[1]}/${cardId}.jpg`
}

async function download(url, dest) {
  const res = await fetch(url, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
  return buf.length
}

async function main() {
  const coverDir = path.join(root, 'public', 'assets', 'covers')
  await mkdir(coverDir, { recursive: true })

  for (const cover of COVERS) {
    const dest = path.join(coverDir, `${cover.code}.${cover.ext}`)
    const bytes = await download(cover.url, dest)
    console.log(`cover ${cover.code}: ${bytes} bytes`)
    await sleep(150)
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

    for (const card of deck.cards) {
      const displayFile = `${card.collectorNumber}-${card.name
        .toLowerCase()
        .replace(/['']/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}-display.jpg`
      const abs = path.join(root, 'public', 'assets', 'cards', code, displayFile)
      const bytes = await download(largeUrl(card.id), abs)
      card.images.display = `assets/cards/${code}/${displayFile}`
      console.log(`  ${code}/${displayFile} (${bytes})`)
      await sleep(110)
    }

    await writeFile(deckPath, `${JSON.stringify(deck, null, 2)}\n`)
  }

  console.log('Done covers + display JPGs')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
