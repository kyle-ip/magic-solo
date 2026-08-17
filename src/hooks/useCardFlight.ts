import { useCallback, useEffect, useRef, useState } from 'react'
import {
  flightConcurrencyLimit,
  isCoarsePointer,
  prefersReducedMotion,
} from '../utils/motionPrefs'

export type FlightRect = {
  left: number
  top: number
  width: number
  height: number
}

export type CardFlightRequest = {
  id?: string
  imageUrl: string
  alt?: string
  from: FlightRect | (() => FlightRect | null)
  to: FlightRect | (() => FlightRect | null)
  durationMs?: number
  trail?: boolean
  settleScale?: number
  onComplete?: () => void
}

export type ActiveCardFlight = {
  id: string
  imageUrl: string
  alt: string
  from: FlightRect
  to: FlightRect
  durationMs: number
  trail: boolean
  settleScale: number
  startedAt: number
  onComplete?: () => void
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function resolveRect(
  value: FlightRect | (() => FlightRect | null),
): FlightRect | null {
  if (typeof value === 'function') return value()
  return value
}

export function rectFromElement(el: Element | null | undefined): FlightRect | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) return null
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}

export function useCardFlight() {
  const [flights, setFlights] = useState<ActiveCardFlight[]>([])
  const queueRef = useRef<CardFlightRequest[]>([])
  const activeRef = useRef<ActiveCardFlight[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())
  const idRef = useRef(0)
  const drainingRef = useRef(false)

  const sync = useCallback(() => {
    setFlights(activeRef.current.slice())
  }, [])

  const drain = useCallback(() => {
    if (drainingRef.current) return
    drainingRef.current = true
    try {
      const limit = flightConcurrencyLimit()
      while (activeRef.current.length < limit && queueRef.current.length > 0) {
        const next = queueRef.current.shift()!
        const from = resolveRect(next.from)
        const to = resolveRect(next.to)
        if (!from || !to) {
          try {
            next.onComplete?.()
          } catch {
            /* ignore */
          }
          continue
        }

        const reduced = prefersReducedMotion()
        const coarse = isCoarsePointer()
        const durationMs = reduced
          ? 0
          : (next.durationMs ?? (coarse ? 320 : 420))
        const trail = reduced ? false : Boolean(next.trail ?? !coarse)
        const id = next.id ?? `flight-${++idRef.current}`

        if (durationMs <= 0) {
          try {
            next.onComplete?.()
          } catch {
            /* ignore */
          }
          continue
        }

        const active: ActiveCardFlight = {
          id,
          imageUrl: next.imageUrl,
          alt: next.alt ?? '',
          from,
          to,
          durationMs,
          trail,
          settleScale: next.settleScale ?? 1,
          startedAt: performance.now(),
          onComplete: next.onComplete,
        }
        activeRef.current.push(active)
        sync()

        const timer = window.setTimeout(() => {
          timersRef.current.delete(id)
          const idx = activeRef.current.findIndex((f) => f.id === id)
          if (idx >= 0) {
            const [done] = activeRef.current.splice(idx, 1)
            sync()
            try {
              done.onComplete?.()
            } catch {
              /* ignore */
            }
          }
          drain()
        }, durationMs + 24)
        timersRef.current.set(id, timer)
      }
    } finally {
      drainingRef.current = false
    }
  }, [sync])

  const enqueue = useCallback(
    (request: CardFlightRequest) => {
      if (prefersReducedMotion()) {
        try {
          request.onComplete?.()
        } catch {
          /* ignore */
        }
        return
      }
      queueRef.current.push(request)
      drain()
    },
    [drain],
  )

  useEffect(() => {
    return () => {
      for (const t of timersRef.current.values()) window.clearTimeout(t)
      timersRef.current.clear()
      queueRef.current = []
      activeRef.current = []
    }
  }, [])

  return { flights, enqueue }
}
