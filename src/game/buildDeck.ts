import { shuffle } from './shuffle'
import type { CardDef, CardInstance } from './types'

let seq = 0

export function nextId(prefix = 'c'): string {
  seq += 1
  return `${prefix}-${seq}-${Math.random().toString(36).slice(2, 7)}`
}

export function resetIdSeq(): void {
  seq = 0
}

/** Raise the module counter so future nextId() values stay above restored ids. */
export function ensureIdSeqAtLeast(n: number): void {
  if (n > seq) seq = n
}

/** Parse numeric seq from ids shaped like `prefix-123-abcde` or `seat-12`. */
export function maxSeqFromIds(ids: Iterable<string>): number {
  let max = 0
  for (const id of ids) {
    const parts = id.split('-')
    if (parts.length < 2) continue
    const n = Number(parts[1])
    if (Number.isFinite(n) && n > max) max = n
  }
  return max
}

export function makeInstance(def: CardDef): CardInstance {
  const type = def.typeLine.toLowerCase()
  return {
    instanceId: nextId('ch'),
    defId: def.id,
    name: def.name,
    typeLine: def.typeLine,
    oracleText: def.oracleText,
    power: def.power,
    toughness: def.toughness,
    markedDamage: 0,
    tapped: false,
    skipUntap: false,
    indestructible: false,
    keywords: [...def.keywords],
    image: def.image,
    isHead: /\bhead\b/i.test(def.typeLine) || /head$/i.test(def.name),
    isElite: /\belite\b/i.test(def.typeLine),
    isMinotaur: /\bminotaur\b/i.test(def.typeLine),
    isReveler: /\breveler\b/i.test(def.typeLine),
    isArtifact: type.startsWith('artifact'),
    isEnchantment: type.includes('enchantment') && !type.includes('creature'),
    isGod: /\bgod\b/i.test(def.typeLine),
  }
}

export function expandLibrary(defs: CardDef[]): CardInstance[] {
  const cards: CardInstance[] = []
  for (const def of defs) {
    for (let i = 0; i < def.quantity; i += 1) {
      cards.push(makeInstance(def))
    }
  }
  return shuffle(cards)
}

export function cloneInstance(card: CardInstance): CardInstance {
  return {
    ...card,
    instanceId: nextId('ch'),
    markedDamage: 0,
    tapped: false,
    skipUntap: false,
    indestructible: false,
  }
}
