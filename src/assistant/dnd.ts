import type { AssistantZone, LibraryPlacement } from './types'

export type DragSource =
  | { zone: 'staging' }
  | { zone: 'battlefield'; index: number }
  | { zone: 'graveyard'; index: number }
  | { zone: 'exile'; index: number }
  | { zone: 'library'; index: number }
  | { zone: 'search'; index: number }

export type DropTarget =
  | { zone: 'battlefield'; index?: number }
  | { zone: 'graveyard' }
  | { zone: 'exile' }
  | { zone: 'library'; placement: LibraryPlacement }
  | { zone: 'search'; index: number }

export type DragPayload = {
  instanceId: string
  source: DragSource
}

export function zoneAcceptsDrop(zone: AssistantZone): boolean {
  return zone === 'battlefield' || zone === 'graveyard' || zone === 'exile' || zone === 'library'
}
