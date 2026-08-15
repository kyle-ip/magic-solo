import type { ConstructedCardDef } from '../game/playerDecks'
import { computeCmc, inferKind } from './defaults'
import type { EditorCardDocument } from './types'

/** Suggested public path for a downloaded face PNG. */
export function suggestedPlayerImagePath(doc: EditorCardDocument): string {
  const safe = (doc.id || 'card').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 64)
  return `assets/cards/player/${safe}-normal.jpg`
}

export function toConstructedCardDef(
  doc: EditorCardDocument,
  imagePath?: string,
): ConstructedCardDef {
  const power =
    doc.power != null && doc.power !== '' ? Number(doc.power) : null
  const toughness =
    doc.toughness != null && doc.toughness !== ''
      ? Number(doc.toughness)
      : null
  const kind = doc.kind || inferKind(doc.typeLine, doc.power)

  const def: ConstructedCardDef = {
    id: doc.id,
    quantity: Math.max(1, doc.quantity || 1),
    name: doc.name,
    nameZh: doc.nameZh || doc.name,
    typeLine: doc.typeLine,
    typeLineZh: doc.typeLineZh || doc.typeLine,
    oracleText: doc.oracleText,
    oracleTextZh: doc.oracleTextZh || doc.oracleText,
    manaCost: doc.manaCost,
    cmc: computeCmc(doc.manaCost),
    power: Number.isFinite(power as number) ? (power as number) : null,
    toughness: Number.isFinite(toughness as number)
      ? (toughness as number)
      : null,
    keywords: [...(doc.keywords || [])],
    kind,
    effect: doc.effect ?? { type: 'none' },
    image: imagePath || suggestedPlayerImagePath(doc),
  }

  if (doc.produces?.length) def.produces = [...doc.produces]
  if (doc.flashback) def.flashback = { ...doc.flashback }

  return def
}

export function parseEditorDocumentJson(raw: unknown): EditorCardDocument {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid editor JSON')
  }
  const o = raw as Record<string, unknown>
  if (typeof o.name !== 'string' || typeof o.typeLine !== 'string') {
    throw new Error('Editor JSON missing required fields')
  }
  return raw as EditorCardDocument
}
