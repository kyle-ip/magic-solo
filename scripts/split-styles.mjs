/**
 * Re-split monolithic styles if needed. Keep global chrome in base:
 * site header/footer, home, floating-nav, shared buttons, phone chrome.
 *
 * Current layout (manual after fixups):
 * - base.css   — chrome + home + floating-nav
 * - pack.css   — pack draw only
 * - deck.css   — deck gallery / rules / card tiles / modal flip
 * - arena.css  — challenge + assistant
 * - classic.css — classic decks
 */
console.log('See src/styles/*.css — prefer editing those files directly.')
