/** Evergreen keyword ids shown as board-token icons. */
export type BoardKeywordId =
  | 'flying'
  | 'reach'
  | 'trample'
  | 'haste'
  | 'vigilance'
  | 'deathtouch'
  | 'lifelink'
  | 'first_strike'
  | 'double_strike'
  | 'hexproof'
  | 'indestructible'
  | 'menace'
  | 'defender'
  | 'ward'

const KEYWORD_ALIASES: Array<{ id: BoardKeywordId; re: RegExp }> = [
  { id: 'double_strike', re: /double\s*strike|连击/i },
  { id: 'first_strike', re: /first\s*strike|先攻/i },
  { id: 'flying', re: /^flying$|飞行/i },
  { id: 'reach', re: /^reach$|延势/i },
  { id: 'trample', re: /^trample$|践踏/i },
  { id: 'haste', re: /^haste$|敏捷/i },
  { id: 'vigilance', re: /^vigilance$|警戒/i },
  { id: 'deathtouch', re: /^deathtouch$|死触/i },
  { id: 'lifelink', re: /^lifelink$|系命/i },
  { id: 'hexproof', re: /^hexproof$|辟邪/i },
  { id: 'indestructible', re: /^indestructible$|不灭/i },
  { id: 'menace', re: /^menace$|威慑/i },
  { id: 'defender', re: /^defender$|守军/i },
  { id: 'ward', re: /^ward\b|守护/i },
]

const KEYWORD_LABELS: Record<BoardKeywordId, { en: string; zh: string }> = {
  flying: { en: 'Flying', zh: '飞行' },
  reach: { en: 'Reach', zh: '延势' },
  trample: { en: 'Trample', zh: '践踏' },
  haste: { en: 'Haste', zh: '敏捷' },
  vigilance: { en: 'Vigilance', zh: '警戒' },
  deathtouch: { en: 'Deathtouch', zh: '死触' },
  lifelink: { en: 'Lifelink', zh: '系命' },
  first_strike: { en: 'First strike', zh: '先攻' },
  double_strike: { en: 'Double strike', zh: '连击' },
  hexproof: { en: 'Hexproof', zh: '辟邪' },
  indestructible: { en: 'Indestructible', zh: '不灭' },
  menace: { en: 'Menace', zh: '威慑' },
  defender: { en: 'Defender', zh: '守军' },
  ward: { en: 'Ward', zh: '守护' },
}

const MAX_ICONS = 4

export function normalizeBoardKeywords(
  keywords: ReadonlyArray<string> | null | undefined,
): BoardKeywordId[] {
  if (!keywords?.length) return []
  const seen = new Set<BoardKeywordId>()
  const out: BoardKeywordId[] = []
  for (const raw of keywords) {
    const text = String(raw).trim()
    if (!text) continue
    for (const { id, re } of KEYWORD_ALIASES) {
      if (!re.test(text)) continue
      if (seen.has(id)) break
      seen.add(id)
      out.push(id)
      break
    }
    if (out.length >= MAX_ICONS) break
  }
  return out
}

export function keywordLabel(id: BoardKeywordId, zh: boolean): string {
  return zh ? KEYWORD_LABELS[id].zh : KEYWORD_LABELS[id].en
}

/** Compact monochrome glyphs for board chrome. */
export function KeywordGlyph({ id }: { id: BoardKeywordId }) {
  const common = {
    viewBox: '0 0 16 16',
    width: '1em',
    height: '1em',
    'aria-hidden': true as const,
    focusable: false as const,
  }
  switch (id) {
    case 'flying':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M8 2c2.2 1.6 3.8 3.4 4.5 5.2-.7.4-1.6.7-2.5.9L8 5.8 6 8.1c-.9-.2-1.8-.5-2.5-.9C4.2 5.4 5.8 3.6 8 2zm0 6.2 1.6 5.3H6.4L8 8.2z"
          />
        </svg>
      )
    case 'reach':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M8 1.5 9.2 5H13l-3.2 2.3L11 11.5 8 9.2 5 11.5l1.2-4.2L3 5h3.8L8 1.5z"
          />
        </svg>
      )
    case 'trample':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M2 8.5h7.2l-1.4 1.4 1.1 1.1L13 8 8.9 3.9 7.8 5l1.4 1.4H2v2.1z"
          />
        </svg>
      )
    case 'haste':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M9.5 1.5 4 9h3.2L6.5 14.5 12 7H8.8L9.5 1.5z" />
        </svg>
      )
    case 'vigilance':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M8 2c2.8 1.6 4.5 3.4 4.5 5.5S10.2 12.2 8 14C5.8 12.2 3.5 9.6 3.5 7.5S5.2 3.6 8 2zm0 2.2c-1.6 1-2.5 2.2-2.5 3.3S6.4 10 8 11.2c1.6-1.2 2.5-2.4 2.5-3.7S9.6 5.2 8 4.2z"
          />
        </svg>
      )
    case 'deathtouch':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M8 1.8c2.4 2.2 3.8 4 3.8 6.1A3.8 3.8 0 0 1 8 14.6a3.8 3.8 0 0 1-3.8-6.7C4.2 5.8 5.6 4 8 1.8z"
          />
        </svg>
      )
    case 'lifelink':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M8 13.2 3.2 8.2A3.1 3.1 0 0 1 8 4.2a3.1 3.1 0 0 1 4.8 4L8 13.2z"
          />
        </svg>
      )
    case 'first_strike':
      return (
        <svg {...common}>
          <path fill="currentColor" d="M8 1.5 9.4 6H14l-3.7 2.7L11.7 14 8 11.2 4.3 14l1.4-5.3L2 6h4.6L8 1.5z" />
        </svg>
      )
    case 'double_strike':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M5.2 1.8 6.2 5H9L6.5 6.8 7.5 10 5.2 8.2 2.9 10l1-3.2L1.4 5h2.8l1-3.2zm5.6 4L12 9h2.8l-2.5 1.8 1 3.2-2.3-1.8-2.3 1.8 1-3.2L7.2 9h2.8l1-3.2z"
          />
        </svg>
      )
    case 'hexproof':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M8 1.5 13 4v4.2c0 3.2-2.1 5.4-5 6.3-2.9-.9-5-3.1-5-6.3V4l5-2.5zm0 2.2L5 5v3.2c0 2 1.3 3.5 3 4.2 1.7-.7 3-2.2 3-4.2V5L8 3.7z"
          />
        </svg>
      )
    case 'indestructible':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M8 1.8 13.2 4v3.4c0 3.4-2.2 5.8-5.2 6.8C5 13.2 2.8 10.8 2.8 7.4V4L8 1.8zm-3.2 5.4h6.4v1.6H4.8V7.2z"
          />
        </svg>
      )
    case 'menace':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M3 4.5h4.2v7H3V4.5zm5.8 0H13v7H8.8V4.5zM4.2 6.2v3.6h1.8V6.2H4.2zm5.8 0v3.6H12V6.2H10z"
          />
        </svg>
      )
    case 'defender':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M8 1.5 13.5 4v4.5c0 3.5-2.4 5.9-5.5 6.8C5 14.4 2.5 12 2.5 8.5V4L8 1.5z"
          />
        </svg>
      )
    case 'ward':
      return (
        <svg {...common}>
          <path
            fill="currentColor"
            d="M8 2 12.5 4v3.8c0 2.8-1.8 4.8-4.5 5.7-2.7-.9-4.5-2.9-4.5-5.7V4L8 2zm0 3.2-1.6 1.6L8 10l1.6-3.2L8 5.2z"
          />
        </svg>
      )
    default:
      return null
  }
}
