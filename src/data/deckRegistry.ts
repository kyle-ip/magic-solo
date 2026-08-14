import type { DeckIndexEntry, DeckRules, SharedRules } from '../types'
import deckIndex from './decks/index.json'
import sharedRulesEn from './rules/shared.json'
import tfthRulesEn from './rules/tfth.json'
import tbthRulesEn from './rules/tbth.json'
import tdagRulesEn from './rules/tdag.json'
import sharedRulesZh from './rules/zh/shared.json'
import tfthRulesZh from './rules/zh/tfth.json'
import tbthRulesZh from './rules/zh/tbth.json'
import tdagRulesZh from './rules/zh/tdag.json'

const rulesEn: Record<string, DeckRules> = {
  tfth: tfthRulesEn as DeckRules,
  tbth: tbthRulesEn as DeckRules,
  tdag: tdagRulesEn as DeckRules,
}

const rulesZh: Record<string, DeckRules> = {
  tfth: tfthRulesZh as DeckRules,
  tbth: tbthRulesZh as DeckRules,
  tdag: tdagRulesZh as DeckRules,
}

export function getDeckIndex(): DeckIndexEntry[] {
  return (deckIndex as { decks: DeckIndexEntry[] }).decks
}

export function getDeckRules(code: string, lang = 'en'): DeckRules | undefined {
  const table = lang.startsWith('zh') ? rulesZh : rulesEn
  return table[code]
}

export function getSharedRules(lang = 'en'): SharedRules {
  return (lang.startsWith('zh') ? sharedRulesZh : sharedRulesEn) as SharedRules
}
