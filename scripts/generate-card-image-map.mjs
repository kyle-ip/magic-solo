/**
 * Build src/data/cardImageMap.json — local static paths ↔ remote CDN URLs.
 * Run after fetch:* scripts when card assets change.
 *
 * Usage: node scripts/generate-card-image-map.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

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

const CLASSIC_CARD_BACK_ID = '0aeebaf5-8c7d-4636-9e82-8c27447861f7'

const MANA_CODES = [
  'W',
  'U',
  'B',
  'R',
  'G',
  'C',
  'S',
  'X',
  'Y',
  'Z',
  'T',
  'Q',
  'E',
  'P',
  'PW',
  'CHAOS',
  ...Array.from({ length: 21 }, (_, i) => String(i)),
  'WUBRG',
  'WU',
  'UB',
  'BR',
  'RG',
  'GW',
  'WB',
  'UR',
  'BG',
  'RW',
  'GU',
  '2W',
  '2U',
  '2B',
  '2R',
  '2G',
  'WP',
  'UP',
  'BP',
  'RP',
  'GP',
  'W/U',
  'U/B',
  'B/R',
  'R/G',
  'G/W',
  'W/B',
  'U/R',
  'B/G',
  'R/W',
  'G/U',
  'W/P',
  'U/P',
  'B/P',
  'R/P',
  'G/P',
  'H',
  'TK',
]

const UUID_RE =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

function cardFaceUrl(cardId, size) {
  return `https://cards.scryfall.io/${size}/front/${cardId[0]}/${cardId[1]}/${cardId}.jpg`
}

function cardBackUrl(backId) {
  return `https://backs.scryfall.io/png/${backId[0]}/${backId[1]}/${backId}.png`
}

function manaFileName(code) {
  return `${code.replace(/\//g, '').toUpperCase()}.svg`
}

function manaRemoteUrl(code) {
  const normalized = code.replace(/\//g, '').toUpperCase()
  return `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(normalized)}.svg`
}

function addEntry(map, entry) {
  const key = `${entry.kind}::${entry.local}`
  map.set(key, entry)
}

async function loadJson(rel) {
  return JSON.parse(await readFile(path.join(root, rel), 'utf8'))
}

async function main() {
  const byKey = new Map()

  // --- Challenge catalogs ---
  for (const code of ['tfth', 'tbth', 'tdag']) {
    const deck = await loadJson(`src/data/cards/challenge/${code}.json`)
    const deckMeta = await loadJson(`src/data/decks/${code}.json`)
    const cardBackId = deckMeta.cardBackId

    if (cardBackId && deck.backImage) {
      addEntry(byKey, {
        id: cardBackId,
        kind: 'card_back',
        local: deck.backImage,
        remote: cardBackUrl(cardBackId),
        source: 'deck_back',
      })
    }
    // Per-card images.back often same shared back.png
    for (const card of deck.cards ?? []) {
      if (card.images?.back && cardBackId) {
        addEntry(byKey, {
          id: cardBackId,
          kind: 'card_back',
          local: card.images.back,
          remote: cardBackUrl(cardBackId),
          source: 'deck_back',
        })
      }
      if (card.id && card.images?.front) {
        addEntry(byKey, {
          id: card.id,
          kind: 'normal',
          local: card.images.front,
          remote: cardFaceUrl(card.id, 'normal'),
          source: 'challenge',
        })
      }
      if (card.id && card.images?.display) {
        addEntry(byKey, {
          id: card.id,
          kind: 'large',
          local: card.images.display,
          remote: cardFaceUrl(card.id, 'large'),
          source: 'challenge',
        })
      }
      if (card.id && card.images?.artCrop) {
        addEntry(byKey, {
          id: card.id,
          kind: 'art_crop',
          local: card.images.artCrop,
          remote: cardFaceUrl(card.id, 'art_crop'),
          source: 'challenge',
        })
      }
    }

    if (deck.heroArt) {
      const heroCard =
        (deck.cards ?? []).find((c) => c.images?.artCrop === deck.heroArt) ??
        (deck.cards ?? [])[0]
      if (heroCard?.id) {
        addEntry(byKey, {
          id: heroCard.id,
          kind: 'art_crop',
          local: deck.heroArt,
          remote: cardFaceUrl(heroCard.id, 'art_crop'),
          source: 'challenge',
        })
      }
    }
  }

  // --- Player decks (all JSON under player/) ---
  const playerDir = path.join(root, 'src/data/cards/player')
  const playerFiles = (await readdir(playerDir)).filter(
    (f) => f.endsWith('.json') && f !== 'index.json',
  )
  for (const file of playerFiles) {
    const deck = await loadJson(`src/data/cards/player/${file}`)
    if (deck.art) {
      const m = String(deck.art).match(UUID_RE)
      if (m) {
        addEntry(byKey, {
          id: m[1].toLowerCase(),
          kind: 'art_crop',
          local: deck.art,
          remote: cardFaceUrl(m[1].toLowerCase(), 'art_crop'),
          source: 'player',
        })
      }
    }
    for (const card of deck.cards ?? []) {
      const id = card.id || String(card.image || '').match(UUID_RE)?.[1]
      if (!id || !card.image) continue
      const kind = String(card.image).includes('-art.') ? 'art_crop' : 'normal'
      addEntry(byKey, {
        id: id.toLowerCase(),
        kind,
        local: card.image,
        remote: cardFaceUrl(id.toLowerCase(), kind === 'art_crop' ? 'art_crop' : 'normal'),
        source: 'player',
      })
    }
  }

  // --- Heroes (parse heroes.ts paths) ---
  const heroesTs = await readFile(
    path.join(root, 'src/game/heroes.ts'),
    'utf8',
  )
  const heroPathRe =
    /assets\/cards\/heroes\/([0-9a-f-]{36})-(normal|art)\.jpg/gi
  for (const match of heroesTs.matchAll(heroPathRe)) {
    const id = match[1].toLowerCase()
    const kind = match[2].toLowerCase() === 'art' ? 'art_crop' : 'normal'
    const local = `assets/cards/heroes/${id}-${match[2].toLowerCase()}.jpg`
    addEntry(byKey, {
      id,
      kind,
      local,
      remote: cardFaceUrl(id, kind === 'art_crop' ? 'art_crop' : 'normal'),
      source: 'heroes',
    })
  }

  // --- Classic card back ---
  addEntry(byKey, {
    id: CLASSIC_CARD_BACK_ID,
    kind: 'card_back',
    local: 'assets/cards/mtg-card-back.jpg',
    remote: cardBackUrl(CLASSIC_CARD_BACK_ID),
    source: 'classic_back',
  })

  // --- Covers ---
  for (const cover of COVERS) {
    addEntry(byKey, {
      id: cover.code,
      kind: 'cover',
      local: `assets/covers/${cover.code}.${cover.ext}`,
      remote: cover.url,
      source: 'cover',
    })
  }

  // --- Mana symbols ---
  for (const code of MANA_CODES) {
    const file = manaFileName(code)
    addEntry(byKey, {
      id: file.replace(/\.svg$/i, ''),
      kind: 'mana_symbol',
      local: `mana-symbols/${file}`,
      remote: manaRemoteUrl(code),
      source: 'mana',
    })
  }

  const entries = [...byKey.values()].sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source)
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
    return a.local.localeCompare(b.local)
  })

  const out = {
    generatedAt: new Date().toISOString(),
    classicCardBackId: CLASSIC_CARD_BACK_ID,
    entries,
  }

  const outPath = path.join(root, 'src/data/cardImageMap.json')
  await writeFile(outPath, `${JSON.stringify(out, null, 2)}\n`)
  console.log(`Wrote ${entries.length} entries → ${path.relative(root, outPath)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
