import { useEffect, useMemo, useRef, useState } from 'react'

export type BoardExitZone =
  | 'challenge-creatures'
  | 'challenge-others'
  | 'player-creatures'
  | 'player-lands'

export type BoardExitGhost = {
  id: string
  zone: BoardExitZone
  image: string
  name: string
  power?: number | null
  toughness?: number | null
  markedDamage?: number
  tapped?: boolean
  keywords?: string[]
  manaCost?: string | null
  colors?: ReadonlyArray<'W' | 'U' | 'B' | 'R' | 'G' | 'C'> | null
}

const EXIT_MS = 680

type Tracked = BoardExitGhost

/** Keep removed board cards visible briefly for a destroy / leave animation. */
export function useBoardExitGhosts(
  live: ReadonlyArray<Tracked>,
  enabled: boolean,
): BoardExitGhost[] {
  const [ghosts, setGhosts] = useState<BoardExitGhost[]>([])
  const prevRef = useRef<Map<string, Tracked>>(new Map())
  const timersRef = useRef<Map<string, number>>(new Map())
  const liveRef = useRef(live)
  liveRef.current = live

  const liveSig = useMemo(
    () => live.map((c) => c.id).join('\0'),
    [live],
  )

  useEffect(() => {
    if (!enabled) {
      prevRef.current = new Map()
      for (const t of timersRef.current.values()) window.clearTimeout(t)
      timersRef.current.clear()
      setGhosts([])
      return
    }

    const cards = liveRef.current
    const next = new Map<string, Tracked>()
    for (const card of cards) next.set(card.id, card)

    const gone: Tracked[] = []
    for (const [id, prev] of prevRef.current) {
      if (!next.has(id)) gone.push(prev)
    }
    prevRef.current = next

    if (!gone.length) return

    setGhosts((cur) => {
      const goneIds = new Set(gone.map((g) => g.id))
      return [...cur.filter((g) => !goneIds.has(g.id)), ...gone]
    })

    for (const card of gone) {
      const existing = timersRef.current.get(card.id)
      if (existing) window.clearTimeout(existing)
      const timer = window.setTimeout(() => {
        timersRef.current.delete(card.id)
        setGhosts((cur) => cur.filter((g) => g.id !== card.id))
      }, EXIT_MS)
      timersRef.current.set(card.id, timer)
    }
  }, [liveSig, enabled])

  useEffect(() => {
    return () => {
      for (const t of timersRef.current.values()) window.clearTimeout(t)
      timersRef.current.clear()
    }
  }, [])

  return ghosts
}

export const BOARD_EXIT_MS = EXIT_MS
