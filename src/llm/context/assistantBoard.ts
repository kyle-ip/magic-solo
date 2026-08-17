import type { AssistantState } from '../../assistant/types'

/** Compact assistant board for coach prompts. */
export function summarizeAssistantBoard(state: AssistantState) {
  const battlefield = state.battlefield
    .map((c, i) => {
      if (!c) return null
      const cell = state.boardCells[i]
      return {
        name: c.name,
        power: c.power,
        toughness: c.toughness,
        markedDamage: c.markedDamage || undefined,
        keywords: c.keywords?.length ? c.keywords : undefined,
        note: c.note || undefined,
        tapped: c.tapped,
        row: cell?.row,
        col: cell?.col,
        flags: [
          c.isHead ? 'Head' : null,
          c.isElite ? 'elite' : null,
          c.isGod ? 'God' : null,
          c.isReveler ? 'Reveler' : null,
        ].filter(Boolean),
      }
    })
    .filter(Boolean)

  return {
    challenge: state.code,
    setupKind: state.setupKind,
    libraryCount: state.library.length,
    staging: state.staging?.name ?? null,
    battlefield,
    graveyard: state.graveyard.map((c) => c.name).slice(0, 20),
    exile: state.exile.map((c) => c.name).slice(0, 12),
    playerValues: state.playerValues,
  }
}
