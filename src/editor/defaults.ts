import { costTotal, parseManaCost } from '../game/mana'
import type { PlayerCardKind } from '../game/playerDecks'
import type { EditorCardDocument, EditorRarity } from './types'

export function newEditorId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `editor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function blankEditorCard(): EditorCardDocument {
  return {
    id: newEditorId(),
    language: 'en',
    name: 'Tornado Elemental',
    nameZh: '龙卷元素',
    manaCost: '{5}{G}{G}',
    typeLine: 'Creature — Elemental',
    typeLineZh: '生物 ～ 元素',
    oracleText:
      'When Tornado Elemental enters, it deals 6 damage to each creature with flying.\n\n{G}: Tornado Elemental deals 1 damage to each creature with flying.',
    oracleTextZh:
      '当龙卷元素进战场时，它对每个具飞行异能的生物各造成6点伤害。\n\n{G}：龙卷元素对每个具飞行异能的生物各造成1点伤害。',
    power: '6',
    toughness: '6',
    frame: 'auto',
    rarity: 'rare',
    artUrl: '',
    artCrop: { x: 0.5, y: 0.5, zoom: 1 },
    setCode: '5DN',
    collectorNumber: '97',
    artist: 'Alex Horley-Orlandelli',
    kind: 'creature',
    keywords: [],
    quantity: 1,
    effect: { type: 'none' },
  }
}

export function computeCmc(manaCost: string): number {
  return costTotal(parseManaCost(manaCost))
}

export function inferKind(typeLine: string, power: string | null): PlayerCardKind {
  const t = typeLine.toLowerCase()
  if (/\bland\b/.test(t)) return 'land'
  if (/\bplaneswalker\b/.test(t)) return 'planeswalker'
  if (/\bcreature\b/.test(t) || power != null) return 'creature'
  if (/\benchantment\b/.test(t)) return 'enchantment'
  if (/\bartifact\b/.test(t)) return 'artifact'
  if (/\binstant\b/.test(t)) return 'instant'
  if (/\bsorcery\b/.test(t)) return 'sorcery'
  return 'instant'
}

export function normalizeRarity(raw: string | undefined): EditorRarity {
  const r = (raw || 'common').toLowerCase()
  if (r === 'mythic' || r === 'rare' || r === 'uncommon') return r
  return 'common'
}

export function displayName(doc: EditorCardDocument): string {
  return doc.language === 'zh' && doc.nameZh ? doc.nameZh : doc.name
}

export function displayTypeLine(doc: EditorCardDocument): string {
  return doc.language === 'zh' && doc.typeLineZh ? doc.typeLineZh : doc.typeLine
}

export function displayOracle(doc: EditorCardDocument): string {
  return doc.language === 'zh' && doc.oracleTextZh
    ? doc.oracleTextZh
    : doc.oracleText
}
