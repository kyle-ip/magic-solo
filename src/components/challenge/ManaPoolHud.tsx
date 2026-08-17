import type { ManaPool } from '../../game/mana'
import { poolTotal } from '../../game/mana'
import { ManaSymbol } from '../ManaCost'

const ORDER = ['W', 'U', 'B', 'R', 'G', 'C'] as const

/** Compact floating mana pool readout for the player dock. */
export function ManaPoolHud({
  pool,
  emptyLabel = '0',
}: {
  pool: ManaPool
  /** Shown when the pool is empty so it is not mistaken for another zone count. */
  emptyLabel?: string
}) {
  const total = poolTotal(pool)
  if (total <= 0) {
    return (
      <div
        className="mana-pool-hud is-empty"
        aria-label={emptyLabel}
        title={emptyLabel}
      >
        <span className="mana-pool-hud-label">{emptyLabel}</span>
      </div>
    )
  }

  return (
    <div className="mana-pool-hud" aria-label={`Mana pool ${total}`} title={`Mana pool ${total}`}>
      {ORDER.map((c) =>
        pool[c] > 0 ? (
          <span key={c} className={`mana-pool-pip is-${c}`}>
            <ManaSymbol code={c} className="mana-symbol mana-pool-sym" />
            <span className="mana-pool-n">{pool[c]}</span>
          </span>
        ) : null,
      )}
    </div>
  )
}
