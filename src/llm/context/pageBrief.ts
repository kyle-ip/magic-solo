export type PageChatKind =
  | 'home'
  | 'sets'
  | 'set-gallery'
  | 'deck'
  | 'challenge'
  | 'assistant'
  | 'classic-decks'
  | 'classic-deck'
  | 'help'
  | 'other'

export interface PageBrief {
  path: string
  kind: PageChatKind
  /** Challenge Experience / Game Assistant routes use simplified site rules. */
  challengeMode: boolean
  params: Record<string, string>
  title: string
  headline?: string
  lead?: string
  /** Visible card names currently on screen (capped). */
  visibleCards?: string[]
}

function textOf(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function classify(pathname: string): {
  kind: PageChatKind
  challengeMode: boolean
  params: Record<string, string>
} {
  const parts = pathname.split('/').filter(Boolean)
  if (pathname === '/' || pathname === '') {
    return { kind: 'home', challengeMode: false, params: {} }
  }
  if (pathname === '/sets') {
    return { kind: 'sets', challengeMode: false, params: {} }
  }
  if (parts[0] === 'sets' && parts[1]) {
    return {
      kind: 'set-gallery',
      challengeMode: false,
      params: { setCode: parts[1].toLowerCase() },
    }
  }
  if (parts[0] === 'decks' && parts[1]) {
    return {
      kind: 'deck',
      challengeMode: true,
      params: { setCode: parts[1] },
    }
  }
  if (parts[0] === 'challenge' && parts[1]) {
    return {
      kind: 'challenge',
      challengeMode: true,
      params: { setCode: parts[1] },
    }
  }
  if (parts[0] === 'assistant' && parts[1]) {
    return {
      kind: 'assistant',
      challengeMode: true,
      params: { setCode: parts[1] },
    }
  }
  if (pathname === '/classic-decks') {
    return { kind: 'classic-decks', challengeMode: false, params: {} }
  }
  if (parts[0] === 'classic-decks' && parts[1]) {
    return {
      kind: 'classic-deck',
      challengeMode: false,
      params: { id: parts[1] },
    }
  }
  if (pathname === '/help') {
    return { kind: 'help', challengeMode: false, params: {} }
  }
  return { kind: 'other', challengeMode: false, params: {} }
}

function collectVisibleCards(limit = 24): string[] {
  if (typeof document === 'undefined') return []
  const names: string[] = []
  const seen = new Set<string>()
  const nodes = document.querySelectorAll(
    '.card-tile-meta > strong, .pack-collection-tile > span:not(.pack-rarity-chip), .llm-nl-result-tile > span',
  )
  for (const node of nodes) {
    const name = textOf(node)
    if (!name || seen.has(name)) continue
    seen.add(name)
    names.push(name)
    if (names.length >= limit) break
  }
  return names
}

/** Snapshot of the current route + on-screen copy for page chat grounding. */
export function buildPageBrief(pathname: string): PageBrief {
  const { kind, challengeMode, params } = classify(pathname)
  const main =
    typeof document !== 'undefined'
      ? document.querySelector('main')
      : null
  const headline = textOf(main?.querySelector('h1'))
  const lead = textOf(main?.querySelector('p.lede'))
  const title =
    (typeof document !== 'undefined' ? document.title : '') ||
    headline ||
    pathname

  const brief: PageBrief = {
    path: pathname,
    kind,
    challengeMode,
    params,
    title,
  }
  if (headline) brief.headline = headline
  if (lead) brief.lead = lead

  const cards = collectVisibleCards()
  if (cards.length > 0) brief.visibleCards = cards

  return brief
}
