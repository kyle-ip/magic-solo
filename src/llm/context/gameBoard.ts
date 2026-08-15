import type { GameState } from '../../game/types'

function creatureLine(c: {
  name: string
  power: number
  toughness: number
  markedDamage: number
  tapped: boolean
  keywords?: string[]
}): string {
  const dmg = c.markedDamage > 0 ? ` dmg=${c.markedDamage}` : ''
  const tap = c.tapped ? ' tapped' : ''
  const kw = c.keywords?.length ? ` [${c.keywords.slice(0, 4).join(',')}]` : ''
  return `${c.name} ${c.power}/${c.toughness}${dmg}${tap}${kw}`
}

function challengePermanent(c: {
  name: string
  power: number | null
  toughness: number | null
  markedDamage: number
  tapped: boolean
  isHead?: boolean
  isElite?: boolean
  isGod?: boolean
  isReveler?: boolean
}): string {
  const pt =
    c.power != null && c.toughness != null ? ` ${c.power}/${c.toughness}` : ''
  const flags = [
    c.isHead ? 'Head' : null,
    c.isElite ? 'elite' : null,
    c.isGod ? 'God' : null,
    c.isReveler ? 'Reveler' : null,
    c.tapped ? 'tapped' : null,
    c.markedDamage > 0 ? `dmg=${c.markedDamage}` : null,
  ]
    .filter(Boolean)
    .join(',')
  return `${c.name}${pt}${flags ? ` (${flags})` : ''}`
}

/** Compact board snapshot for coach prompts — no library order. */
export function summarizeGameBoard(state: GameState) {
  return {
    challenge: state.code,
    status: state.status,
    turn: state.turnNumber,
    activeSide: state.activeSide,
    playerPhase: state.playerPhase,
    challengePhase: state.challengePhase,
    awaitingAdvance: state.awaitingAdvance,
    pendingCast: state.pendingCast
      ? { mode: state.pendingCast.mode }
      : null,
    player: {
      life: state.player.life,
      hand: state.player.hand.map((c) => `${c.name} (${c.manaCost || c.kind})`),
      creatures: state.player.creatures.map(creatureLine),
      lands: state.player.lands.map((l) => `${l.name}${l.tapped ? ' (tapped)' : ''}`),
      landDropsLeft: state.player.landsPlayedThisTurn === 0 ? 1 : 0,
      heroes: state.player.heroes.map((h) => h.name),
      gyCount: state.player.graveyard.length,
      libraryCount: state.player.library.length,
    },
    challengeSide: {
      battlefield: state.challenge.battlefield.map(challengePermanent),
      libraryCount: state.challenge.library.length,
      gyCount: state.challenge.graveyard.length,
    },
    combat: {
      selectedAttackers: state.selectedAttackers.length,
      assignments: Object.keys(state.attackAssignments).length,
    },
    prompt: state.prompt
      ? { kind: state.prompt.kind, titleKey: state.prompt.titleKey }
      : null,
  }
}
