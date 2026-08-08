import type { DeckCard } from '../../types'
import tfth from './challenge/tfth.json'
import tbth from './challenge/tbth.json'
import tdag from './challenge/tdag.json'

type LocalizedField = { en: string; zh: string }

type ChallengeCardJson = {
  id: string
  collectorNumber: string
  quantity: number
  name: LocalizedField
  typeLine: LocalizedField
  oracleText: LocalizedField
  power: string | null
  toughness: string | null
  manaCost: string
  cmc: number
  keywords: string[]
  artist: string
  rarity: string
  layout: string
  scryfallUri: string
  images: {
    front: string
    back: string
    display?: string
    artCrop: string | null
  }
}

type ChallengeDeckJson = {
  cards: ChallengeCardJson[]
}

const catalogs: Record<string, ChallengeDeckJson> = {
  tfth: tfth as ChallengeDeckJson,
  tbth: tbth as ChallengeDeckJson,
  tdag: tdag as ChallengeDeckJson,
}

/** Flatten bilingual catalog entries into the DeckCard shape used by the app. */
export function loadChallengeCards(code: string): DeckCard[] | undefined {
  const catalog = catalogs[code]
  if (!catalog) return undefined
  return catalog.cards.map((c) => ({
    id: c.id,
    name: c.name.en,
    collectorNumber: c.collectorNumber,
    typeLine: c.typeLine.en,
    oracleText: c.oracleText.en,
    power: c.power,
    toughness: c.toughness,
    manaCost: c.manaCost,
    cmc: c.cmc,
    keywords: c.keywords,
    artist: c.artist,
    rarity: c.rarity,
    layout: c.layout,
    highresImage: true,
    imageStatus: 'highres_scan',
    scryfallUri: c.scryfallUri,
    quantity: c.quantity,
    images: {
      front: c.images.front,
      back: c.images.back,
      ...(c.images.display ? { display: c.images.display } : {}),
      artCrop: c.images.artCrop,
    },
  }))
}
