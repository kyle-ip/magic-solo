/**
 * Normalize curly single quotes to ASCII apostrophes (for Scryfall card names).
 * Do NOT convert curly double quotes — that breaks JSON string literals.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/data/classic-decks',
)

let n = 0
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.json')) continue
  const p = path.join(dir, f)
  const s = fs.readFileSync(p, 'utf8')
  const next = s.replace(/[\u2018\u2019]/g, "'")
  if (next !== s) {
    JSON.parse(next)
    fs.writeFileSync(p, next)
    n += 1
    console.log('fixed', f)
  } else {
    JSON.parse(s)
  }
}
console.log('files', n)
