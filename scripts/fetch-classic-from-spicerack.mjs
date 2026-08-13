/**
 * Fetch recent tournament decklists from Spicerack (documented public API)
 * and materialize archetype JSON under src/data/classic-decks/.
 *
 * Spicerack docs:
 *   GET https://api.spicerack.gg/api/export-decklists/
 *   ?num_days=&event_format=&decklist_as_text=true
 * Optional: SPICERACK_API_KEY for higher limits.
 *
 * Usage:
 *   node scripts/fetch-classic-from-spicerack.mjs
 *   node scripts/fetch-classic-from-spicerack.mjs --days=30 --formats=MODERN,LEGACY,PIONEER,PAUPER,VINTAGE
 *
 * Curated bilingual primers (existing files) are never overwritten.
 * New tournament-derived decks are written as tournament-* ids and merged into index.json.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../src/data/classic-decks')
const API = 'https://api.spicerack.gg/api/export-decklists/'

const FORMAT_MAP = {
  STANDARD: 'standard-classic',
  MODERN: 'modern',
  PIONEER: 'pioneer',
  LEGACY: 'legacy',
  VINTAGE: 'vintage',
  PAUPER: 'pauper',
}

function parseArgs(argv) {
  const out = {
    days: 45,
    formats: ['MODERN', 'LEGACY', 'PIONEER', 'PAUPER', 'VINTAGE'],
    minCopies: 2,
  }
  for (const arg of argv) {
    if (arg.startsWith('--days=')) out.days = Number(arg.slice(7)) || out.days
    if (arg.startsWith('--formats=')) {
      out.formats = arg
        .slice(10)
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    }
    if (arg.startsWith('--min=')) out.minCopies = Number(arg.slice(6)) || out.minCopies
  }
  return out
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

/** Parse plaintext decklist into {name, qty, board}[] */
function parseDeckText(text) {
  if (!text || typeof text !== 'string') return []
  const rows = []
  let board = 'main'
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const lower = line.toLowerCase()
    if (
      lower === 'sideboard' ||
      lower === 'side board' ||
      lower.startsWith('sideboard:') ||
      lower === 'sb'
    ) {
      board = 'side'
      continue
    }
    if (
      lower === 'mainboard' ||
      lower === 'main deck' ||
      lower === 'deck' ||
      lower.startsWith('mainboard:')
    ) {
      board = 'main'
      continue
    }
    const m = line.match(/^(\d+)\s*[xX]?\s+(.+)$/)
    if (!m) continue
    const qty = Number(m[1])
    const name = m[2].replace(/\s*\(.*?\)\s*$/, '').trim()
    if (!name || !qty) continue
    rows.push({ name, qty, board })
  }
  return rows
}

function inferArchetype(standing) {
  const fromField =
    standing.archetype ||
    standing.Archetype ||
    standing.deck_archetype ||
    standing.deckArchetype
  if (typeof fromField === 'string' && fromField.trim()) return fromField.trim()

  // Some exports put archetype in deck name: "Burn - PlayerName"
  const name = String(standing.name || standing.player || '').trim()
  if (name.includes(' - ')) {
    const left = name.split(' - ')[0].trim()
    if (left && left.length < 40) return left
  }
  return 'Unknown'
}

function pickColors(list) {
  // Rough color guess from common land names — good enough for chips.
  const text = list.map((r) => r.name).join(' | ').toLowerCase()
  const colors = []
  if (/\bplains\b|flooded strand|hallowed|godless|sacred foundry|temple garden/.test(text))
    colors.push('W')
  if (/\bisland\b|polluted delta|steam vents|breeding pool|watery grave/.test(text))
    colors.push('U')
  if (/\bswamp\b|bloodstained|overgrown tomb|blood crypt|watery grave/.test(text))
    colors.push('B')
  if (/\bmountain\b|wooded foothills|stomping|steam vents|blood crypt/.test(text))
    colors.push('R')
  if (/\bforest\b|verdant|misty rainforest|stomping|overgrown|breeding/.test(text))
    colors.push('G')
  return colors.length ? colors : ['C']
}

function topCards(list, n = 4) {
  return [...list]
    .filter((r) => r.board === 'main')
    .sort((a, b) => b.qty - a.qty)
    .slice(0, n)
    .map((r) => r.name)
}

async function fetchFormat(format, days, apiKey) {
  const url = new URL(API)
  url.searchParams.set('num_days', String(days))
  url.searchParams.set('event_format', format)
  url.searchParams.set('decklist_as_text', 'true')

  const headers = { Accept: 'application/json' }
  if (apiKey) headers['X-API-Key'] = apiKey

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(25000),
  })
  if (!res.ok) {
    throw new Error(`Spicerack ${format} HTTP ${res.status}`)
  }
  return res.json()
}

function rebuildIndex() {
  const files = fs
    .readdirSync(outDir)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
  const decks = files.map((f) => {
    const d = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'))
    return {
      id: d.id,
      format: d.format,
      name: d.name,
      colors: d.colors,
      playstyle: d.playstyle || 'midrange',
      era: d.era || 'tournament',
      coverCard: d.coverCard,
    }
  })
  const formatOrder = [
    'modern',
    'legacy',
    'pioneer',
    'pauper',
    'vintage',
    'standard-classic',
  ]
  decks.sort((a, b) => {
    const fa = formatOrder.indexOf(a.format)
    const fb = formatOrder.indexOf(b.format)
    if (fa !== fb) return fa - fb
    return String(a.name.en).localeCompare(String(b.name.en))
  })
  fs.writeFileSync(
    path.join(outDir, 'index.json'),
    JSON.stringify({ decks, fetchedAt: new Date().toISOString() }, null, 2) +
      '\n',
  )
  return decks.length
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const apiKey = process.env.SPICERACK_API_KEY || ''

  console.log(
    `Fetching Spicerack decklists (days=${args.days}, formats=${args.formats.join(',')})…`,
  )

  /** @type {Map<string, {format:string, archetype:string, lists: ReturnType<typeof parseDeckText>[], count:number}>} */
  const buckets = new Map()

  for (const format of args.formats) {
    if (!FORMAT_MAP[format]) {
      console.warn(`Skip unsupported format ${format}`)
      continue
    }
    try {
      const payload = await fetchFormat(format, args.days, apiKey)
      const tournaments = Array.isArray(payload) ? payload : payload?.results || []
      let lists = 0
      for (const t of tournaments) {
        for (const standing of t.standings || []) {
          const text = standing.decklist_text || standing.decklistText || ''
          const parsed = parseDeckText(text)
          if (parsed.length < 8) continue
          const archetype = inferArchetype(standing)
          if (!archetype || archetype === 'Unknown') continue
          const key = `${FORMAT_MAP[format]}::${archetype.toLowerCase()}`
          const bucket = buckets.get(key) || {
            format: FORMAT_MAP[format],
            archetype,
            lists: [],
            count: 0,
          }
          bucket.lists.push(parsed)
          bucket.count += 1
          buckets.set(key, bucket)
          lists += 1
        }
      }
      console.log(`  ${format}: ${tournaments.length} events, ${lists} decklists with text`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ${format}: ${msg}`)
    }
    await sleep(800)
  }

  let written = 0
  let skipped = 0
  for (const bucket of buckets.values()) {
    if (bucket.count < args.minCopies) continue
    const id = `tournament-${bucket.format}-${slugify(bucket.archetype)}`
    const outPath = path.join(outDir, `${id}.json`)
    if (fs.existsSync(outPath)) {
      skipped += 1
      continue
    }
    // Prefer the median-sized list as a representative sample
    const sorted = [...bucket.lists].sort((a, b) => a.length - b.length)
    const sampleList = sorted[Math.floor(sorted.length / 2)] || sorted[0]
    const keyCards = topCards(sampleList, 4)
    const coverCard = keyCards[0] || sampleList[0]?.name || 'Island'
    const deck = {
      id,
      format: bucket.format,
      name: {
        en: bucket.archetype,
        zh: bucket.archetype,
      },
      colors: pickColors(sampleList),
      playstyle: 'midrange',
      era: 'tournament',
      summary: {
        en: `${bucket.archetype} — a recent paper tournament archetype (${bucket.count} lists in the fetch window).`,
        zh: `${bucket.archetype}——近期纸面赛事中的构筑原型（本次抓取窗口内 ${bucket.count} 份牌表）。`,
      },
      howItWins: {
        en: 'Study the decklist and key cards below for the core plan.',
        zh: '查看下方牌表与关键卡，了解这套牌的核心思路。',
      },
      keyCards,
      coverCard,
      sampleList,
      links: {
        scryfallQuery: `f:${bucket.format} ${keyCards.slice(0, 2).join(' ')}`,
      },
      source: 'spicerack',
    }
    fs.writeFileSync(outPath, JSON.stringify(deck, null, 2) + '\n')
    written += 1
    console.log(`wrote ${id} (n=${bucket.count})`)
  }

  const total = rebuildIndex()
  console.log(
    `Done. new=${written}, skippedExisting=${skipped}, buckets=${buckets.size}, index=${total}`,
  )
  if (written === 0 && buckets.size === 0) {
    console.log(
      'No Spicerack data reached. Curated decks in src/data/classic-decks/ remain available. Retry later or set SPICERACK_API_KEY.',
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
