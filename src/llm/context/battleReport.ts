import type { GameState, LogEntry } from '../../game/types'
import { getPlayerDeck } from '../../game/playerDecks'

export function battleReportContext(
  state: GameState,
  formatLog: (entry: LogEntry) => string,
  maxLogLines = 72,
) {
  const recent = state.log.slice(-maxLogLines).map(formatLog)
  const heroNames = state.player.heroes.map((h) => h.name)
  const playerDeck = getPlayerDeck(state.playerDeckId)

  const challengeCreatures = state.challenge.battlefield.filter(
    (c) => c.power != null || c.isHead || c.isGod || c.isElite,
  )
  const playerCreatures = state.player.creatures

  return {
    /** Bump when prompt/structure changes so cached reports refresh. */
    reportSchema: 3,
    challenge: state.code,
    outcome: state.status,
    resultKey: state.resultKey,
    turnNumber: state.turnNumber,
    playerLife: state.player.life,
    playerDeck: {
      id: playerDeck.id,
      name: playerDeck.name,
    },
    heroes: heroNames,
    playerCreaturesAlive: playerCreatures.map((c) => ({
      name: c.name,
      power: c.power,
      toughness: c.toughness,
    })),
    playerGraveyardCount: state.player.graveyard.length,
    playerGraveyardSample: state.player.graveyard.slice(-8).map((c) => c.name),
    challengeBattlefield: state.challenge.battlefield.map((c) => c.name),
    challengeThreats: challengeCreatures.map((c) => ({
      name: c.name,
      power: c.power,
      toughness: c.toughness,
      isHead: Boolean(c.isHead),
      isGod: Boolean(c.isGod),
      isElite: Boolean(c.isElite),
    })),
    challengeLibraryLeft: state.challenge.library.length,
    challengeGraveyardCount: state.challenge.graveyard.length,
    preventCombatDamageThisTurn: Boolean(
      state.flags.preventCombatDamageThisTurn,
    ),
    hideExpiresInHydraEnds: state.flags.hideExpiresInHydraEnds ?? 0,
    recentLog: recent,
  }
}
