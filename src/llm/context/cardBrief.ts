import type { DrawnCard } from '../../data/randomCard'

export function cardBrief(card: DrawnCard) {
  return {
    name: card.name,
    nameZh: card.nameZh,
    typeLine: card.typeLine,
    typeLineZh: card.typeLineZh,
    manaCost: card.manaCost,
    power: card.power,
    toughness: card.toughness,
    oracleText: card.oracleText,
    oracleTextZh: card.oracleTextZh,
    keywords: card.keywords,
    setCode: card.setCode,
    rarity: card.rarity,
    otherFaces: (card.otherFaces ?? []).map((f) => ({
      name: f.name,
      typeLine: f.typeLine,
      oracleText: f.oracleText,
      oracleTextZh: f.oracleTextZh,
    })),
  }
}

/** Unique peer card names from a collection view (excludes the open card). */
export function collectionPeerNames(
  cards: Array<{ id: string; name: string }>,
  currentId: string,
  max = 24,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of cards) {
    if (c.id === currentId) continue
    if (seen.has(c.name)) continue
    seen.add(c.name)
    out.push(c.name)
    if (out.length >= max) break
  }
  return out
}
