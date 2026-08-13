/**
 * Download Scryfall mana/card-symbol SVGs into public/mana-symbols/
 * so the app can load them same-origin (no CORS) and cache as blob URLs.
 *
 * Usage: node scripts/fetch-mana-symbols.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../public/mana-symbols')
const BASE = 'https://svgs.scryfall.io/card-symbols'

const CODES = [
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
  // Extra hybrids / phyrexian / snow often seen in oracle
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

function fileName(code) {
  // Scryfall files use slash stripped uppercase, e.g. WU.svg, WP.svg
  return `${code.replace(/\//g, '').toUpperCase()}.svg`
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

fs.mkdirSync(outDir, { recursive: true })

let ok = 0
let skip = 0
let fail = 0

for (const code of CODES) {
  const name = fileName(code)
  const dest = path.join(outDir, name)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    skip += 1
    continue
  }
  const url = `${BASE}/${encodeURIComponent(name.replace(/\.svg$/i, ''))}.svg`
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.warn('miss', name, res.status)
      fail += 1
      await sleep(80)
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(dest, buf)
    ok += 1
    console.log('wrote', name)
  } catch (err) {
    console.warn('fail', name, err instanceof Error ? err.message : err)
    fail += 1
  }
  await sleep(80)
}

console.log(`done ok=${ok} skip=${skip} fail=${fail} dir=${outDir}`)
