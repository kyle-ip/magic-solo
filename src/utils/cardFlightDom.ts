import { rectFromElement, type FlightRect } from '../hooks/useCardFlight'
import { preferredAssetUrl } from './remoteAsset'

export function flightImageUrl(localPath: string): string {
  return preferredAssetUrl(localPath, { kind: 'normal' })
}

export function zonePileRect(zone: string): FlightRect | null {
  return rectFromElement(
    document.querySelector(`[data-zone="${CSS.escape(zone)}"]`),
  )
}

export function instanceRect(instanceId: string): FlightRect | null {
  return rectFromElement(
    document.querySelector(`[data-instance-id="${CSS.escape(instanceId)}"]`),
  )
}

/** Arena land pile card face (not the tapped footprint box). */
export function landStackCardRect(stackKey: string): FlightRect | null {
  const stack = document.querySelector(
    `[data-land-stack-key="${CSS.escape(stackKey)}"]`,
  )
  if (!stack) return null
  return (
    rectFromElement(stack.querySelector('[data-instance-id]')) ??
    rectFromElement(stack.querySelector('.arena-card'))
  )
}

export function playerLandsRowRect(): FlightRect | null {
  return rectFromElement(document.querySelector('.bf-lands'))
}

export function handDockFallbackRect(): FlightRect | null {
  return rectFromElement(document.querySelector('.hand-dock .hand-fan'))
}
