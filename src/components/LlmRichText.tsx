import { Fragment, type ReactNode } from 'react'

/**
 * Lightweight, XSS-safe rendering for LLM replies.
 * Supports: headings (#–###), paragraphs, line breaks, **bold**, *italic*,
 * `code`, unordered (- / *) and ordered (1.) lists.
 */

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // **bold** | *italic* | `code` — non-greedy, no nesting
  const re = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t${i++}`}>
          {text.slice(last, m.index)}
        </Fragment>,
      )
    }
    const token = m[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i++}`}>{token.slice(2, -2)}</strong>,
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(<code key={`${keyPrefix}-c${i++}`}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(<em key={`${keyPrefix}-i${i++}`}>{token.slice(1, -1)}</em>)
    } else {
      nodes.push(<Fragment key={`${keyPrefix}-r${i++}`}>{token}</Fragment>)
    }
    last = m.index + token.length
  }
  if (last < text.length) {
    nodes.push(
      <Fragment key={`${keyPrefix}-t${i++}`}>{text.slice(last)}</Fragment>,
    )
  }
  return nodes
}

function isUlLine(line: string): boolean {
  return /^\s*[-*•]\s+/.test(line)
}

function isOlLine(line: string): boolean {
  return /^\s*\d+[.)]\s+/.test(line)
}

function stripListMarker(line: string): string {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')
}

function headingMatch(line: string): RegExpMatchArray | null {
  return /^(#{1,3})\s+(.+?)\s*$/.exec(line.trim())
}

function renderBlocks(text: string): ReactNode[] {
  const lines = text.split('\n')
  const nodes: ReactNode[] = []
  let i = 0
  let bi = 0

  while (i < lines.length) {
    const raw = lines[i]
    if (!raw.trim()) {
      i += 1
      continue
    }

    const hm = headingMatch(raw)
    if (hm) {
      const level = hm[1].length as 1 | 2 | 3
      const Tag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5'
      nodes.push(
        <Tag key={`h-${bi++}`} className={`llm-md-h llm-md-h${level}`}>
          {renderInline(hm[2], `h-${bi}`)}
        </Tag>,
      )
      i += 1
      continue
    }

    if (isUlLine(raw) || isOlLine(raw)) {
      const ordered = isOlLine(raw)
      const items: string[] = []
      while (i < lines.length) {
        const L = lines[i]
        if (!L.trim()) {
          // allow a blank line inside a list only if next line continues the list
          const next = lines[i + 1]
          if (next && (ordered ? isOlLine(next) : isUlLine(next))) {
            i += 1
            continue
          }
          break
        }
        if (ordered ? !isOlLine(L) : !isUlLine(L)) break
        items.push(stripListMarker(L))
        i += 1
      }
      const ListTag = ordered ? 'ol' : 'ul'
      nodes.push(
        <ListTag key={`list-${bi++}`} className="llm-md-list">
          {items.map((item, li) => (
            <li key={`li-${bi}-${li}`}>
              {renderInline(item, `li-${bi}-${li}`)}
            </li>
          ))}
        </ListTag>,
      )
      continue
    }

    const paraLines: string[] = []
    while (i < lines.length) {
      const L = lines[i]
      if (!L.trim()) break
      if (headingMatch(L) || isUlLine(L) || isOlLine(L)) break
      paraLines.push(L)
      i += 1
    }
    const parts: ReactNode[] = []
    paraLines.forEach((line, li) => {
      if (li > 0) parts.push(<br key={`br-${bi}-${li}`} />)
      parts.push(...renderInline(line, `p-${bi}-${li}`))
    })
    nodes.push(
      <p key={`p-${bi++}`} className="llm-md-p">
        {parts}
      </p>,
    )
  }

  return nodes
}

export function LlmRichText({
  text,
  className,
  inline = false,
}: {
  text: string
  className?: string
  /** Inline-only (bold/italic/code); no block wrappers — safe inside <p>. */
  inline?: boolean
}) {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return null

  if (inline) {
    return (
      <span className={className ? `llm-md llm-md-inline ${className}` : 'llm-md llm-md-inline'}>
        {renderInline(normalized.replace(/\n+/g, ' '), 'in')}
      </span>
    )
  }

  return (
    <div className={className ? `llm-md ${className}` : 'llm-md'}>
      {renderBlocks(normalized)}
    </div>
  )
}
