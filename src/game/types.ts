import type { DeckCard, DeckTheme } from '../types'
import type { HeroInstance } from './heroes'
import type { ManaPool } from './mana'
import type { PlayerCardKind, PlayerEffect } from './playerDecks'

export type { HeroInstance } from './heroes'
export type { ManaPool } from './mana'

export type ChallengeCode = 'tfth' | 'tbth' | 'tdag'

export interface CardDef {
  id: string
  name: string
  typeLine: string
  oracleText: string
  power: number | null
  toughness: number | null
  keywords: string[]
  quantity: number
  image: string
  artCrop: string | null
}

export interface CardInstance {
  instanceId: string
  defId: string
  name: string
  typeLine: string
  oracleText: string
  power: number | null
  toughness: number | null
  markedDamage: number
  tapped: boolean
  skipUntap: boolean
  indestructible: boolean
  keywords: string[]
  image: string
  /** Challenge-side creature flags */
  isHead: boolean
  isElite: boolean
  isMinotaur: boolean
  isReveler: boolean
  isArtifact: boolean
  isEnchantment: boolean
  isGod: boolean
}

export interface PlayerCardInstance {
  instanceId: string
  defId: string
  name: string
  nameZh: string
  typeLine: string
  typeLineZh: string
  oracleText: string
  oracleTextZh: string
  manaCost: string
  cmc: number
  power: number | null
  toughness: number | null
  keywords: string[]
  kind: PlayerCardKind
  produces?: Array<'W' | 'U' | 'B' | 'R' | 'G' | 'C'>
  effect: PlayerEffect
  image: string
}

export interface PlayerCreature {
  instanceId: string
  defId: string
  /** @deprecated alias of defId for older call sites */
  templateId?: string
  name: string
  power: number
  toughness: number
  markedDamage: number
  tapped: boolean
  summoningSickness: boolean
  keywords: string[]
  image: string
  produces?: Array<'W' | 'U' | 'B' | 'R' | 'G' | 'C'>
  /** Until-EOT pumps to clear on turn begin */
  tempPower?: number
  tempToughness?: number
}

export interface PlayerLand {
  instanceId: string
  defId: string
  name: string
  typeLine: string
  tapped: boolean
  produces: Array<'W' | 'U' | 'B' | 'R' | 'G' | 'C'>
  image: string
  isLand: true
}

export type PendingCast =
  | { handInstanceId: string; mode: 'damage' | 'pump' | 'destroy' | 'fangs' | 'fight_mine' }
  | {
      handInstanceId: string
      mode: 'fight_theirs'
      fighterId: string
    }

export interface PlayerTemplate {
  id: string
  name: string
  nameZh: string
  typeLine: string
  typeLineZh: string
  oracleText: string
  oracleTextZh: string
  power: number
  toughness: number
  cost: number
  keywords: string[]
  image: string
}

export type PromptKind =
  | 'choose_head_damage'
  | 'choose_strike_head'
  | 'choose_distract_creature'
  | 'choose_distract_head'
  | 'distract_choice'
  | 'noxious_mode'
  | 'choose_exile_creature'
  | 'choose_blockers'
  | 'impulsive_destruction'
  | 'vitality_return'
  | 'confirm_continue'

export type LogTone = 'info' | 'good' | 'bad' | 'cast'

export type LogParams = Record<string, string | number>

export interface PromptOption {
  id: string
  /** i18n key under challenge.prompt.* */
  labelKey: string
  labelParams?: LogParams
  /** English card/creature name — localized in UI when present */
  name?: string
}

export interface PromptState {
  id: string
  kind: PromptKind
  /** i18n keys under challenge.prompt.* */
  titleKey: string
  messageKey: string
  messageParams?: LogParams
  /** For choose_head_damage */
  amount?: number
  /** Resume token after answer */
  resume: string
  options?: PromptOption[]
}

export interface LogEntry {
  id: string
  /** i18n key under challenge.logMsg.* */
  key: string
  params?: LogParams
  tone?: LogTone
}

export interface SetupConfig {
  code: ChallengeCode
  /** Hydra: starting Hydra Head count */
  startingHeads?: number
  /** Horde: player turns before Horde acts */
  playerTurnsBeforeHorde?: number
  /** Selected player constructed deck */
  playerDeckId?: string
  /** Selected Hero's Path hero def ids (unique; max 2 Hydra / 3 Horde&God) */
  heroIds?: string[]
}

export type PlayerPhase = 'main' | 'combat' | 'end'
export type ChallengePhase =
  | 'idle'
  | 'reveal'
  | 'resolve'
  | 'triggers'
  | 'combat'
  | 'breath'
  | 'done'

export type FxPopKind = 'damage' | 'attack' | 'heal' | 'mill'

/** Per-unit floater / hit cue tied to a battlefield or chrome target. */
export interface FxPop {
  id: string
  /** Card instanceId, or special ids like player-life / horde-library */
  targetId: string
  kind: FxPopKind
  amount?: number
}

export interface AttackLink {
  from: string
  to: string
  /** Visual tone for the arrow */
  tone?: 'player' | 'challenge' | 'block'
}

export interface FxPulse {
  id: string
  kind: 'damage' | 'heal' | 'mill' | 'cast' | 'enter' | 'attack'
  amount?: number
  label?: string
  pops?: FxPop[]
  /** Attack arrows to keep visible during resolve FX */
  links?: AttackLink[]
}

export interface GameState {
  code: ChallengeCode
  theme: DeckTheme
  status: 'setup' | 'playing' | 'won' | 'lost'
  turnNumber: number
  activeSide: 'player' | 'challenge'
  phase: string
  playerPhase: PlayerPhase
  challengePhase: ChallengePhase
  /** Selected player constructed deck id */
  playerDeckId: string
  /** Cards waiting to be revealed/cast one-by-one (for Arena-like pacing) */
  castQueue: CardInstance[]
  /** UI should play reveal animation then dispatch ADVANCE */
  awaitingAdvance: boolean
  /** Player spell awaiting a click target */
  pendingCast: PendingCast | null
  player: {
    life: number
    library: PlayerCardInstance[]
    hand: PlayerCardInstance[]
    lands: PlayerLand[]
    creatures: PlayerCreature[]
    graveyard: PlayerCardInstance[]
    exile: PlayerCreature[]
    heroes: HeroInstance[]
    landsPlayedThisTurn: number
    manaPool: ManaPool
  }
  challenge: {
    library: CardInstance[]
    battlefield: CardInstance[]
    graveyard: CardInstance[]
  }
  flags: {
    playerTurnsRemaining: number
    cannotCastSpells: boolean
    headsIndestructible: boolean
    /** Countdown: Hide expires after this many Hydra turn-ends (cast sets to 2). */
    hideExpiresInHydraEnds: number
    swallowExileActive: boolean
    extraChallengeTurn: boolean
    consumingRage: boolean
    descendPrey: boolean
    touchHorned: boolean
    unquenchable: boolean
    interventionDamage: boolean
    impulsiveCharge: boolean
    impulsiveReturnDamage: boolean
    ripToPieces: boolean
    xenagosMustAttack: boolean
    xenagosTrample: boolean
    danceOfFlame: boolean
    danceOfPanic: boolean
    hydraTriggersDone: boolean
    hydraBreathDone: boolean
    /** Fog: prevent combat damage this turn (incl. Hydra breath) */
    preventCombatDamageThisTurn: boolean
  }
  log: LogEntry[]
  prompt: PromptState | null
  selectedAttackers: string[]
  attackAssignments: Record<string, string>
  blockAssignments: Record<string, string>
  revealed: CardInstance[]
  fx: FxPulse | null
  /** i18n key under challenge.result.* */
  resultKey: string | null
}

export function defsFromDeck(cards: DeckCard[]): CardDef[] {
  return cards.map((c) => ({
    id: c.id,
    name: c.name,
    typeLine: c.typeLine,
    oracleText: c.oracleText,
    power: c.power != null ? Number(c.power) : null,
    toughness: c.toughness != null ? Number(c.toughness) : null,
    keywords: c.keywords,
    quantity: c.quantity,
    image: c.images.display || c.images.front,
    artCrop: c.images.artCrop,
  }))
}
