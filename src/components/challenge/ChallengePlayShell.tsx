import type { CSSProperties, ReactNode, Ref } from 'react'

/**
 * Challenge play root shell — fit-to-viewport chrome + shared theme class.
 * Landmark regression uses {@link ChallengePlayLandmarkTree}.
 */
export function ChallengePlayShell({
  theme,
  rootRef,
  style,
  children,
}: {
  theme: string
  rootRef?: Ref<HTMLElement>
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <main
      ref={rootRef}
      className={`arena-root is-playing is-challenge-fit theme-${theme}`}
      style={style}
    >
      {children}
    </main>
  )
}

/** Minimal chrome tree for structural regression tests (no game state). */
export function ChallengePlayLandmarkTree({ theme = 'hydra' }: { theme?: string }) {
  return (
    <ChallengePlayShell theme={theme}>
      <div className="arena-board-stage">
        <div className="arena-board-pan">
          <div className="arena-battlefield">
            <section className="bf-half bf-half-opponent bf-row opponent-row">
              <div className="bf-board">
                <div className="bf-creatures is-dense is-crowded" />
                <div className="bf-lands is-dense is-crowded" />
                <div className="land-stack" />
              </div>
            </section>
            <div className="bf-half-divider" aria-hidden="true" />
            <section className="bf-half bf-half-player bf-row player-row">
              <div className="bf-board">
                <div className="bf-creatures is-dense is-crowded" />
                <div className="bf-lands is-dense is-crowded" />
              </div>
            </section>
          </div>
        </div>
      </div>
      <div className="arena-chrome-layer">
        <div className="arena-topbar-shell">
          <header className="arena-topbar" />
        </div>
        <div className="arena-opponent-rail">
          <div className="life-orb is-opponent" />
        </div>
        <div className="player-dock">
          <div className="player-life-stack">
            <div className="player-phase-mark is-active" />
            <div className="life-orb is-you" />
          </div>
          <div className="hand-dock-shell">
            <div className="hand-dock-hotzone" aria-hidden="true" />
            <div className="hand-dock">
              <button type="button" className="hand-pin-btn" />
            </div>
          </div>
          <div className="mana-pool-hud" />
          <div className="arena-play-actions">
            <p className="arena-action-hint">Hint</p>
            <button type="button" className="arena-secondary-action">
              Cancel
            </button>
            <button type="button" className="arena-primary-action">
              End turn
            </button>
          </div>
          <button type="button" className="hand-card is-playable" />
          <div className="challenge-result-overlay">
            <div className="settlement-panel" />
          </div>
        </div>
      </div>
    </ChallengePlayShell>
  )
}
