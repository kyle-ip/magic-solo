/**
 * Oracle text layout with auto font shrink and inline {mana} tokens.
 */

export type OracleToken =
  | { kind: 'text'; value: string }
  | { kind: 'symbol'; code: string }
  | { kind: 'newline' }

export function tokenizeOracle(text: string): OracleToken[] {
  const tokens: OracleToken[] = []
  const parts = text.split('\n')
  for (let pi = 0; pi < parts.length; pi += 1) {
    const line = parts[pi]
    const re = /\{([^}]+)\}/g
    let last = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(line))) {
      if (m.index > last) {
        tokens.push({ kind: 'text', value: line.slice(last, m.index) })
      }
      tokens.push({ kind: 'symbol', code: m[1] })
      last = m.index + m[0].length
    }
    if (last < line.length) {
      tokens.push({ kind: 'text', value: line.slice(last) })
    }
    if (pi < parts.length - 1) tokens.push({ kind: 'newline' })
  }
  return tokens
}

export interface OracleLayoutLine {
  tokens: Array<
    | { kind: 'text'; value: string; width: number }
    | { kind: 'symbol'; code: string; width: number }
  >
  width: number
}

export interface OracleLayoutResult {
  fontSize: number
  lineHeight: number
  lines: OracleLayoutLine[]
}

function measureText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSize: number,
  fontFamily: string,
): number {
  ctx.font = `${fontSize}px ${fontFamily}`
  return ctx.measureText(text).width
}

function wrapTokens(
  ctx: CanvasRenderingContext2D,
  tokens: OracleToken[],
  maxWidth: number,
  fontSize: number,
  symbolSize: number,
  fontFamily: string,
): OracleLayoutLine[] {
  const lines: OracleLayoutLine[] = []
  let current: OracleLayoutLine = { tokens: [], width: 0 }

  const pushLine = () => {
    lines.push(current)
    current = { tokens: [], width: 0 }
  }

  for (const tok of tokens) {
    if (tok.kind === 'newline') {
      pushLine()
      continue
    }
    if (tok.kind === 'symbol') {
      const w = symbolSize
      if (current.width + w > maxWidth && current.tokens.length > 0) {
        pushLine()
      }
      current.tokens.push({ kind: 'symbol', code: tok.code, width: w })
      current.width += w + 2
      continue
    }

    // Split text into words while preserving CJK runs as single units.
    const chunks = tok.value.match(/[\u4e00-\u9fff]|[^\s\u4e00-\u9fff]+|\s+/g) ?? [
      tok.value,
    ]
    for (const chunk of chunks) {
      const w = measureText(ctx, chunk, fontSize, fontFamily)
      if (
        current.width + w > maxWidth &&
        current.tokens.length > 0 &&
        !/^\s+$/.test(chunk)
      ) {
        pushLine()
      }
      if (/^\s+$/.test(chunk) && current.tokens.length === 0) continue
      current.tokens.push({ kind: 'text', value: chunk, width: w })
      current.width += w
    }
  }

  if (current.tokens.length > 0 || lines.length === 0) pushLine()
  return lines
}

/**
 * Fit oracle text into a box by shrinking font until lines fit height.
 */
export function layoutOracleText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  opts?: {
    maxFont?: number
    minFont?: number
    fontFamily?: string
  },
): OracleLayoutResult {
  const maxFont = opts?.maxFont ?? 28
  const minFont = opts?.minFont ?? 12
  const fontFamily =
    opts?.fontFamily ??
    '"Source Serif 4", "Noto Serif SC", "Libre Baskerville", "Times New Roman", serif'
  const tokens = tokenizeOracle(text.trim())

  for (let fontSize = maxFont; fontSize >= minFont; fontSize -= 1) {
    const lineHeight = fontSize * 1.28
    const symbolSize = fontSize * 0.95
    const lines = wrapTokens(
      ctx,
      tokens,
      maxWidth,
      fontSize,
      symbolSize,
      fontFamily,
    )
    if (lines.length * lineHeight <= maxHeight) {
      return { fontSize, lineHeight, lines }
    }
  }

  const fontSize = minFont
  const lineHeight = fontSize * 1.28
  const lines = wrapTokens(
    ctx,
    tokens,
    maxWidth,
    fontSize,
    fontSize * 0.95,
    fontFamily,
  )
  return { fontSize, lineHeight, lines }
}
