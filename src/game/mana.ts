export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C'

export type ManaPool = Record<ManaColor, number>

export function emptyManaPool(): ManaPool {
  return { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }
}

export function poolTotal(pool: ManaPool): number {
  return pool.W + pool.U + pool.B + pool.R + pool.G + pool.C
}

export interface ManaCost {
  generic: number
  W: number
  U: number
  B: number
  R: number
  G: number
  C: number
}

export function parseManaCost(cost: string): ManaCost {
  const result: ManaCost = { generic: 0, W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 }
  if (!cost) return result
  const re = /\{([^}]+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(cost))) {
    const sym = m[1]
    if (/^\d+$/.test(sym)) result.generic += Number(sym)
    else if (sym === 'W') result.W += 1
    else if (sym === 'U') result.U += 1
    else if (sym === 'B') result.B += 1
    else if (sym === 'R') result.R += 1
    else if (sym === 'G') result.G += 1
    else if (sym === 'C') result.C += 1
  }
  return result
}

export function costTotal(cost: ManaCost): number {
  return cost.generic + cost.W + cost.U + cost.B + cost.R + cost.G + cost.C
}

/** Try to pay `need` from `pool`. Returns new pool or null if unpaid. */
export function tryPayFromPool(pool: ManaPool, need: ManaCost): ManaPool | null {
  const next = { ...pool }
  const colors: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C']
  for (const c of colors) {
    if (c === 'C') continue
    const req = need[c]
    if (next[c] < req) return null
    next[c] -= req
  }
  if (next.C < need.C) return null
  next.C -= need.C

  let generic = need.generic
  // Spend leftover colored then colorless
  for (const c of colors) {
    if (generic <= 0) break
    const use = Math.min(generic, next[c])
    next[c] -= use
    generic -= use
  }
  if (generic > 0) return null
  return next
}
