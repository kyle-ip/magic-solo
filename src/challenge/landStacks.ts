export interface LandLike {
  instanceId: string
  defId: string
  name: string
  tapped: boolean
  image: string
  typeLine?: string
  produces?: Array<'W' | 'U' | 'B' | 'R' | 'G' | 'C'>
}

export interface LandStackGroup {
  key: string
  defId: string
  name: string
  image: string
  typeLine: string
  produces: Array<'W' | 'U' | 'B' | 'R' | 'G' | 'C'>
  count: number
  tappedCount: number
  /** Representative instance for preview / focus (prefer untapped) */
  top: LandLike
  lands: LandLike[]
}

/** Group identical lands into Arena-style stacks (×N). */
export function groupLandStacks(lands: LandLike[]): LandStackGroup[] {
  const map = new Map<string, LandStackGroup>()
  for (const land of lands) {
    const key = `${land.defId}|${land.name}|${land.image}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        key,
        defId: land.defId,
        name: land.name,
        image: land.image,
        typeLine: land.typeLine ?? '',
        produces: land.produces ? [...land.produces] : [],
        count: 1,
        tappedCount: land.tapped ? 1 : 0,
        top: land,
        lands: [land],
      })
      continue
    }
    existing.count += 1
    if (land.tapped) existing.tappedCount += 1
    existing.lands.push(land)
    // Prefer an untapped land as the visible top card
    if (existing.top.tapped && !land.tapped) existing.top = land
  }
  return [...map.values()]
}
