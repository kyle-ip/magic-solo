import { describe, expect, it } from 'vitest'
import { blankEditorCard } from '../defaults'
import {
  suggestedPlayerImagePath,
  toConstructedCardDef,
} from '../exportConstructed'
import { resolveFrameId, colorsFromMana } from '../framePalette'
import { CARD_H, CARD_W, M15, insetRect } from '../layoutM15'
import { tokenizeOracle } from '../oracleLayout'

describe('layoutM15', () => {
  it('uses Scryfall PNG dimensions', () => {
    expect(CARD_W).toBe(745)
    expect(CARD_H).toBe(1040)
  })

  it('keeps regions inside the card', () => {
    for (const r of [M15.titleBar, M15.art, M15.typeBar, M15.textBox, M15.ptBox]) {
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.x + r.w).toBeLessThanOrEqual(CARD_W)
      expect(r.y + r.h).toBeLessThanOrEqual(CARD_H)
    }
  })

  it('insets rectangles', () => {
    const r = insetRect({ x: 10, y: 20, w: 100, h: 80 }, 5)
    expect(r).toEqual({ x: 15, y: 25, w: 90, h: 70 })
  })
})

describe('framePalette', () => {
  it('extracts colors from mana cost', () => {
    expect(colorsFromMana('{2}{R}{R}')).toEqual(['R'])
    expect(colorsFromMana('{W}{U}{B}')).toEqual(['W', 'U', 'B'])
  })

  it('resolves auto frames', () => {
    expect(resolveFrameId('auto', '{1}{G}', 'Creature — Elf')).toBe('green')
    expect(resolveFrameId('auto', '{R}{G}', 'Creature — Beast')).toBe('gold')
    expect(resolveFrameId('auto', '', 'Basic Land — Forest')).toBe('land')
    expect(resolveFrameId('auto', '{2}', 'Artifact')).toBe('artifact')
    expect(resolveFrameId('blue', '{R}', 'Instant')).toBe('blue')
  })
})

describe('oracleLayout', () => {
  it('tokenizes mana symbols and newlines', () => {
    const tokens = tokenizeOracle('Deal {3} damage.\nDraw a card.')
    expect(tokens).toEqual([
      { kind: 'text', value: 'Deal ' },
      { kind: 'symbol', code: '3' },
      { kind: 'text', value: ' damage.' },
      { kind: 'newline' },
      { kind: 'text', value: 'Draw a card.' },
    ])
  })
})

describe('exportConstructed', () => {
  it('maps editor document to ConstructedCardDef', () => {
    const doc = blankEditorCard()
    doc.name = 'Spark'
    doc.nameZh = '火花'
    doc.manaCost = '{R}'
    doc.power = '1'
    doc.toughness = '1'
    doc.quantity = 4
    doc.effect = { type: 'damage_any', amount: 1 }
    const def = toConstructedCardDef(doc)
    expect(def.name).toBe('Spark')
    expect(def.nameZh).toBe('火花')
    expect(def.cmc).toBe(1)
    expect(def.power).toBe(1)
    expect(def.toughness).toBe(1)
    expect(def.quantity).toBe(4)
    expect(def.kind).toBe('creature')
    expect(def.effect).toEqual({ type: 'damage_any', amount: 1 })
    expect(def.image).toBe(suggestedPlayerImagePath(doc))
  })
})
