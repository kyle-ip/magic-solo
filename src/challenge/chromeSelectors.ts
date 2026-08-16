/**
 * Critical Challenge chrome selectors that must remain styled in arena.css.
 * Used by CSS contract regression tests.
 */
export const CHALLENGE_CHROME_SELECTORS = [
  '.arena-root.is-playing.is-challenge-fit',
  '.arena-topbar',
  '.arena-opponent-rail',
  '.life-orb',
  '.arena-battlefield',
  '.phase-strip',
  '.player-dock',
  '.hand-dock',
  '.arena-play-actions',
  '.arena-primary-action',
  '.mana-pool-hud',
  '.land-stack',
  '.bf-creatures.is-dense',
  '.bf-creatures.is-crowded',
  '.bf-lands.is-dense',
  '.bf-lands.is-crowded',
  '.arena-setup',
  '.setup-section-title',
  '.setup-section-meta',
  '.setup-hero-grid',
  '.setup-deck-grid',
  '.setup-cta-row',
] as const
