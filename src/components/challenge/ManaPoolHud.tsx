import type { ManaPool } from '../../game/mana'
import { poolTotal } from '../../game/mana'
import { ManaSymbol } from '../ManaCost'

const ORDER = ['W', 'U', 'B', 'R', 'G', 'C'] as const

/** Compact floating mana pool readout for the player dock. */
export function ManaPoolHud({ pool }: { pool: ManaPool }) {
  const total = poolTotal(pool)
  if (total <= 0) {
    return (
      <div className="mana-pool-hud is-empty" aria-label="Mana pool empty">
        <span className="mana-pool-hud-label">0</span>
      </div>
    )
  }

  return (
    <div className="mana-pool-hud" aria-label={`Mana pool ${total}`}>
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
