export type DeckTheme = 'hydra' | 'horde' | 'god'

export interface CardImages {
  front: string
  back: string
  /** Lighter JPG for smooth modal flip animations */
  display?: string
  artCrop: string | null
}

export interface DeckCard {
  id: string
  name: string
  collectorNumber: string
  typeLine: string
  oracleText: string
  power: string | null
  toughness: string | null
  manaCost: string
  cmc: number
  keywords: string[]
  artist: string
  rarity: string
  layout: string
  highresImage: boolean
  imageStatus: string
  scryfallUri: string
  quantity: number
  images: CardImages
}

export interface DeckData {
  code: string
  name: string
  challengeNumber: number
  setCode: string
  backColor: string
  theme: DeckTheme
  cardBackId: string
  wikiUrl: string
  scryfallSetUri: string
  heroArt: string | null
  coverImage?: string
  totalUniqueCards: number
  totalDeckSize: number
  cards: DeckCard[]
  fetchedAt: string
  attribution: string
}

export interface DeckIndexEntry {
  code: string
  name: string
  challengeNumber: number
  setCode: string
  backColor: string
  theme: DeckTheme
  wikiUrl: string
  scryfallSetUri: string
  heroArt: string | null
  coverImage?: string
  backImage: string
  totalUniqueCards: number
  totalDeckSize: number
}

export interface RuleSource {
  label: string
  url: string
}

export interface RuleSection {
  id: string
  title: string
  bullets: string[]
}

export interface DeckRules {
  code: string
  title: string
  intro: string
  sections: RuleSection[]
  sources: RuleSource[]
}

export interface SharedRules {
  title: string
  summary: string
  points: string[]
  sources: RuleSource[]
}

export type ClassicFormat =
  | 'modern'
  | 'legacy'
  | 'pioneer'
  | 'pauper'
  | 'vintage'
  | 'standard-classic'

export type ClassicPlaystyle =
  | 'aggro'
  | 'midrange'
  | 'control'
  | 'combo'
  | 'tempo'

export interface LocalizedText {
  en: string
  zh: string
}

export interface ClassicDeckListEntry {
  name: string
  qty: number
  board: 'main' | 'side'
}

export interface ClassicDeckLinks {
  wiki?: string
  scryfallQuery?: string
}

export interface ClassicDeck {
  id: string
  format: ClassicFormat
  name: LocalizedText
  colors: string[]
  playstyle: ClassicPlaystyle
  era: string
  summary: LocalizedText
  howItWins: LocalizedText
  keyCards: string[]
  coverCard: string
  sampleList: ClassicDeckListEntry[]
  links?: ClassicDeckLinks
}

export interface ClassicDeckIndexEntry {
  id: string
  format: ClassicFormat
  name: LocalizedText
  colors: string[]
  playstyle: ClassicPlaystyle
  era: string
  coverCard: string
}
