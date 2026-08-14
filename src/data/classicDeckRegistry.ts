import type { ClassicDeck, ClassicDeckIndexEntry } from '../types'
import indexJson from './classic-decks/index.json'

const deckLoaders = import.meta.glob([
  './classic-decks/*.json',
  '!./classic-decks/index.json',
]) as Record<string, () => Promise<{ default: ClassicDeck }>>

const decksById: Record<string, ClassicDeck> = {}
const inflight = new Map<string, Promise<ClassicDeck | undefined>>()

function pathForId(id: string): string | undefined {
  const direct = `./classic-decks/${id}.json`
  if (deckLoaders[direct]) return direct
  return Object.keys(deckLoaders).find(
    (p) => p.endsWith(`/${id}.json`) && !p.endsWith('/index.json'),
  )
}

export function getClassicDeckIndex(): ClassicDeckIndexEntry[] {
  return (indexJson as { decks: ClassicDeckIndexEntry[] }).decks
}

/** Sync peek — only returns decks already loaded into the session cache. */
export function getClassicDeck(id: string): ClassicDeck | undefined {
  return decksById[id]
}

/** Load a classic deck JSON chunk (cached). */
export async function loadClassicDeck(
  id: string,
): Promise<ClassicDeck | undefined> {
  if (decksById[id]) return decksById[id]
  const pending = inflight.get(id)
  if (pending) return pending

  const path = pathForId(id)
  if (!path) return undefined

  const task = deckLoaders[path]!()
    .then((mod) => {
      const deck = mod.default
      if (deck?.id) decksById[deck.id] = deck
      inflight.delete(id)
      return decksById[id]
    })
    .catch(() => {
      inflight.delete(id)
      return undefined
    })

  inflight.set(id, task)
  return task
}

/** Warm all classic deck modules (list page summaries). */
export async function loadAllClassicDecks(): Promise<ClassicDeck[]> {
  const ids = getClassicDeckIndex().map((d) => d.id)
  const decks = await Promise.all(ids.map((id) => loadClassicDeck(id)))
  return decks.filter((d): d is ClassicDeck => !!d)
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
