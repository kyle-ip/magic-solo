/**
 * Escape bare double-quotes that appear inside JSON string values.
 * Caused by converting curly quotes to ASCII " inside already-quoted strings.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/data/classic-decks',
)

function escapeInnerQuotes(src) {
  let out = ''
  let i = 0
  let inString = false
  while (i < src.length) {
    const ch = src[i]
    if (!inString) {
      out += ch
      if (ch === '"') inString = true
      i += 1
      continue
    }
    // in string
    if (ch === '\\') {
      out += ch + (src[i + 1] ?? '')
      i += 2
      continue
    }
    if (ch === '"') {
      // Lookahead: end of string if next non-ws is : , } ] or end
      let j = i + 1
      while (j < src.length && /[ \t\r\n]/.test(src[j])) j += 1
      const next = src[j] ?? ''
      if (next === '' || next === ':' || next === ',' || next === '}' || next === ']') {
        out += '"'
        inString = false
        i += 1
        continue
      }
      // Otherwise this is an inner quote — escape it
      out += '\\"'
      i += 1
      continue
    }
    out += ch
    i += 1
  }
  return out
}

let fixed = 0
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.json')) continue
  const p = path.join(dir, f)
  const src = fs.readFileSync(p, 'utf8')
  try {
    JSON.parse(src)
    continue
  } catch {
    const next = escapeInnerQuotes(src)
    JSON.parse(next) // throw if still broken
    fs.writeFileSync(p, next)
    fixed += 1
    console.log('fixed', f)
  }
}
console.log('fixed count', fixed)
