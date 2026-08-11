import type { DrawnCard } from './randomCard'

const STORAGE_KEY = 'magic-solo:pack-collection'

export interface CollectedCard extends DrawnCard {
  collectedAt: string
}

function readRaw(): CollectedCard[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CollectedCard[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRaw(items: CollectedCard[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    /* quota / private mode */
  }
}

export function listCollected(): CollectedCard[] {
  return readRaw().slice().sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
}

export function isCollected(id: string): boolean {
  return readRaw().some((c) => c.id === id)
}

export function addCollected(card: DrawnCard): CollectedCard[] {
  const existing = readRaw()
  if (existing.some((c) => c.id === card.id)) return listCollected()
  const next: CollectedCard[] = [
    { ...card, collectedAt: new Date().toISOString() },
    ...existing,
  ]
  writeRaw(next)
  return listCollected()
}

export function removeCollected(id: string): CollectedCard[] {
  const next = readRaw().filter((c) => c.id !== id)
  writeRaw(next)
  return listCollected()
}

export function toggleCollected(card: DrawnCard): { collected: boolean; items: CollectedCard[] } {
  if (isCollected(card.id)) {
    return { collected: false, items: removeCollected(card.id) }
  }
  return { collected: true, items: addCollected(card) }
}
