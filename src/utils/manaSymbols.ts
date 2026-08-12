/** Scryfall card-symbol SVGs: https://svgs.scryfall.io/card-symbols/{CODE}.svg */

const SYMBOL_BASE = 'https://svgs.scryfall.io/card-symbols'

export function manaSymbolUrl(braceContent: string): string {
  const code = braceContent.replace(/\//g, '').toUpperCase()
  return `${SYMBOL_BASE}/${encodeURIComponent(code)}.svg`
}

/** Split text into plain runs and `{W}`-style mana tokens. */
export function splitManaTokens(text: string): Array<{ type: 'text' | 'mana'; value: string }> {
  if (!text) return []
  const out: Array<{ type: 'text' | 'mana'; value: string }> = []
  const re = /\{([^}]+)\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) {
      out.push({ type: 'text', value: text.slice(last, m.index) })
    }
    out.push({ type: 'mana', value: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) {
    out.push({ type: 'text', value: text.slice(last) })
  }
  return out
}
