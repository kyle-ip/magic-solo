import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CHALLENGE_CHROME_SELECTORS } from '../chromeSelectors'
import { ChallengePlayLandmarkTree } from '../../components/challenge/ChallengePlayShell'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object') {
        return `${key}:${JSON.stringify(opts)}`
      }
      return key
    },
    i18n: { language: 'en' },
  }),
  I18nextProvider: ({ children }: { children: unknown }) => children,
}))

const here = dirname(fileURLToPath(import.meta.url))
const arenaCss = readFileSync(join(here, '../../styles/arena.css'), 'utf8')

describe('Challenge CSS chrome contract', () => {
  it('keeps required selectors styled in arena.css', () => {
    for (const sel of CHALLENGE_CHROME_SELECTORS) {
      expect(arenaCss.includes(sel), `missing CSS for ${sel}`).toBe(true)
    }
  })
})

describe('Challenge play landmarks', () => {
  it('renders fit shell chrome landmarks', () => {
    const html = renderToStaticMarkup(createElement(ChallengePlayLandmarkTree))
    expect(html).toContain('arena-root')
    expect(html).toContain('is-playing')
    expect(html).toContain('is-challenge-fit')
    expect(html).toContain('arena-topbar')
    expect(html).toContain('arena-opponent-rail')
    expect(html).toContain('life-orb')
    expect(html).toContain('arena-battlefield')
    expect(html).toContain('phase-strip')
    expect(html).toContain('player-dock')
    expect(html).toContain('hand-dock')
    expect(html).toContain('mana-pool-hud')
    expect(html).toContain('arena-play-actions')
    expect(html).toContain('arena-primary-action')
    expect(html).toContain('land-stack')
    expect(html).toContain('is-dense')
    expect(html).toContain('is-crowded')
  })
})

describe('Challenge setup landmarks', () => {
  beforeAll(async () => {
    // Ensure mock is applied before importing the setup view module.
  })

  it('renders setup layout landmarks', async () => {
    const { ChallengeSetupView } = await import(
      '../../components/challenge/ChallengeSetupView'
    )
    const html = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        { initialEntries: ['/challenge/tfth'] },
        createElement(ChallengeSetupView, {
          code: 'tfth',
          theme: 'hydra',
          title: 'Face the Hydra',
          zh: false,
          assetLoading: false,
          assetProgress: { done: 0, total: 0 },
          heads: 2,
          hordeDelay: 3,
          heroIds: [],
          playerDeckId: 'wildfire',
          onHeads: () => {},
          onHordeDelay: () => {},
          onToggleHero: () => {},
          onPickDeck: () => {},
          onViewRoster: () => {},
          onBegin: () => {},
        }),
      ),
    )
    expect(html).toContain('arena-setup')
    expect(html).toContain('setup-heroes')
    expect(html).toContain('setup-hero-grid')
    expect(html).toContain('setup-deck-grid')
    expect(html).toContain('setup-cta-row')
    expect(html).toContain('setup-field')
    expect(html).toContain('setup-section-title')
    expect(html).toContain('setup-section-meta')
    expect(html).toContain('setup-notes-block')
    expect(html).toContain('setup-selection-summary')
    expect(html).not.toContain('setup-deck-preview')
    expect(html).not.toContain('setup-decks-label')
  })
})
