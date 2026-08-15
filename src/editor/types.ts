import type { ManaColor } from '../game/mana'
import type {
  FlashbackSpec,
  PlayerCardKind,
  PlayerEffect,
} from '../game/playerDecks'

export type EditorCardLanguage = 'en' | 'zh'

export type EditorFrameId =
  | 'auto'
  | 'white'
  | 'blue'
  | 'black'
  | 'red'
  | 'green'
  | 'gold'
  | 'artifact'
  | 'colorless'
  | 'land'

export type EditorRarity = 'common' | 'uncommon' | 'rare' | 'mythic'

export interface ArtCrop {
  /** Horizontal pan in art window, 0.5 = centered. */
  x: number
  /** Vertical pan in art window, 0.5 = centered. */
  y: number
  /** Zoom relative to cover-fit (1 = cover). */
  zoom: number
}

export interface EditorCardDocument {
  id: string
  language: EditorCardLanguage
  name: string
  nameZh: string
  manaCost: string
  typeLine: string
  typeLineZh: string
  oracleText: string
  oracleTextZh: string
  power: string | null
  toughness: string | null
  frame: EditorFrameId
  rarity: EditorRarity
  artUrl: string
  artCrop: ArtCrop
  setCode: string
  collectorNumber: string
  artist: string
  kind: PlayerCardKind
  keywords: string[]
  quantity: number
  effect: PlayerEffect
  produces?: ManaColor[]
  flashback?: FlashbackSpec
}

export type EditorCardPatch = Partial<EditorCardDocument>
