import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  easeOutCubic,
  type ActiveCardFlight,
} from '../hooks/useCardFlight'
import '../styles/flight.css'

type Props = {
  flights: ActiveCardFlight[]
}

function FlightGhost({ flight }: { flight: ActiveCardFlight }) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const trailRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const { from, to, durationMs, settleScale, trail } = flight
    const t0 = performance.now()
    let raf = 0

    const apply = (u: number) => {
      const e = easeOutCubic(u)
      const left = from.left + (to.left - from.left) * e
      const top = from.top + (to.top - from.top) * e
      const w = from.width + (to.width - from.width) * e
      const h = from.height + (to.height - from.height) * e
      const scale = 1 + (settleScale - 1) * e
      // Slight arc so flights read as tosses, not linear slides.
      const arc = Math.sin(e * Math.PI) * Math.min(36, Math.abs(to.top - from.top) * 0.12 + 18)
      el.style.transform = `translate3d(${left}px, ${top - arc}px, 0) scale(${scale})`
      el.style.width = `${w}px`
      el.style.height = `${h}px`
      el.style.opacity = String(0.92 + 0.08 * e)

      if (trail && trailRef.current) {
        const te = easeOutCubic(Math.max(0, u - 0.08))
        const tl = from.left + (to.left - from.left) * te
        const tt = from.top + (to.top - from.top) * te
        const tw = from.width + (to.width - from.width) * te
        const th = from.height + (to.height - from.height) * te
        const tArc =
          Math.sin(te * Math.PI) *
          Math.min(36, Math.abs(to.top - from.top) * 0.12 + 18)
        trailRef.current.style.transform = `translate3d(${tl}px, ${tt - tArc}px, 0)`
        trailRef.current.style.width = `${tw}px`
        trailRef.current.style.height = `${th}px`
        trailRef.current.style.opacity = String(0.28 * (1 - u))
      }
    }

    apply(0)
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / durationMs)
      apply(u)
      if (u < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [flight])

  return (
    <>
      {flight.trail ? (
        <div
          ref={trailRef}
          className="card-flight-trail"
          aria-hidden
          style={{
            backgroundImage: `url(${flight.imageUrl})`,
          }}
        />
      ) : null}
      <div
        ref={elRef}
        className="card-flight-ghost"
        aria-hidden
        style={{
          backgroundImage: `url(${flight.imageUrl})`,
        }}
      />
    </>
  )
}

export function CardFlightLayer({ flights }: Props) {
  if (typeof document === 'undefined' || flights.length === 0) return null
  return createPortal(
    <div className="card-flight-layer" aria-hidden>
      {flights.map((f) => (
        <FlightGhost key={f.id} flight={f} />
      ))}
    </div>,
    document.body,
  )
}
