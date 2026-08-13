import type { ClassicDeck, ClassicDeckIndexEntry } from '../types'
import indexJson from './classic-decks/index.json'

const deckModules = import.meta.glob('./classic-decks/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, ClassicDeck>

const decksById: Record<string, ClassicDeck> = {}
for (const [path, deck] of Object.entries(deckModules)) {
  if (path.endsWith('/index.json')) continue
  if (deck?.id) decksById[deck.id] = deck
}

export function getClassicDeckIndex(): ClassicDeckIndexEntry[] {
  return (indexJson as { decks: ClassicDeckIndexEntry[] }).decks
}

export function getClassicDeck(id: string): ClassicDeck | undefined {
  return decksById[id]
}

export function getClassicDeckLocalizedName(
  deck: Pick<ClassicDeck, 'name'>,
  lang: string,
): string {
  return lang.startsWith('zh') ? deck.name.zh : deck.name.en
}

export function getClassicDeckText(
  text: { en: string; zh: string },
  lang: string,
): string {
  return lang.startsWith('zh') ? text.zh : text.en
}
