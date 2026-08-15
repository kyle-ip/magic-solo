import { Fragment, type ReactNode } from 'react'

/**
 * Lightweight, XSS-safe rendering for LLM replies.
 * Supports: paragraphs, line breaks, **bold**, *italic*, `code`,
 * unordered (- / *) and ordered (1.) lists.
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

function renderBlock(block: string, bi: number): ReactNode {
  const lines = block.split('\n').filter((l, idx, arr) => {
    // keep empty lines only if not collapsing entire block
    return !(l.trim() === '' && (idx === 0 || idx === arr.length - 1))
  })
  if (lines.length === 0) return null

  const allUl = lines.every((l) => !l.trim() || isUlLine(l))
  const allOl = lines.every((l) => !l.trim() || isOlLine(l))
  const listLines = lines.filter((l) => l.trim())

  if (listLines.length > 0 && allUl && listLines.every(isUlLine)) {
    return (
      <ul key={`ul-${bi}`} className="llm-md-list">
        {listLines.map((line, li) => (
          <li key={`uli-${bi}-${li}`}>
            {renderInline(stripListMarker(line), `uli-${bi}-${li}`)}
          </li>
        ))}
      </ul>
    )
  }

  if (listLines.length > 0 && allOl && listLines.every(isOlLine)) {
    return (
      <ol key={`ol-${bi}`} className="llm-md-list">
        {listLines.map((line, li) => (
          <li key={`oli-${bi}-${li}`}>
            {renderInline(stripListMarker(line), `oli-${bi}-${li}`)}
          </li>
        ))}
      </ol>
    )
  }

  // Paragraph with soft line breaks
  const parts: ReactNode[] = []
  lines.forEach((line, li) => {
    if (li > 0) parts.push(<br key={`br-${bi}-${li}`} />)
    parts.push(...renderInline(line, `p-${bi}-${li}`))
  })
  return (
    <p key={`p-${bi}`} className="llm-md-p">
      {parts}
    </p>
  )
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

  const blocks = normalized.split(/\n{2,}/)
  return (
    <div className={className ? `llm-md ${className}` : 'llm-md'}>
      {blocks.map((block, i) => renderBlock(block.trim(), i))}
    </div>
  )
}
