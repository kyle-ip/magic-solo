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
      <div className="arena-topbar-shell">
        <header className="arena-topbar" />
      </div>
      <div className="arena-opponent-rail">
        <div className="life-orb is-opponent" />
      </div>
      <div className="arena-battlefield">
        <div className="phase-strip" />
        <div className="bf-creatures is-dense is-crowded" />
        <div className="bf-lands is-dense is-crowded" />
        <div className="land-stack" />
      </div>
      <div className="player-dock">
        <div className="life-orb is-you" />
        <div className="hand-dock" />
        <div className="mana-pool-hud" />
        <div className="arena-play-actions">
          <button type="button" className="arena-primary-action">
            End turn
          </button>
        </div>
      </div>
    </ChallengePlayShell>
  )
}
