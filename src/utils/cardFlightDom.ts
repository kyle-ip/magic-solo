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

export function handDockFallbackRect(): FlightRect | null {
  return rectFromElement(document.querySelector('.hand-dock .hand-fan'))
}
