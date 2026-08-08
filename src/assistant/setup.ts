import { expandLibrary, makeInstance, resetIdSeq } from '../game/buildDeck'
import type { CardDef, ChallengeCode } from '../game/types'
import type { DeckTheme } from '../types'
import {
  emptyBattlefield,
  placeFeaturedOnBattlefield,
  placeOnBattlefield,
  type AssistantCard,
  type AssistantSetupKind,
  type AssistantState,
  type NamedValue,
} from './types'

let valueSeq = 0

export function nextValueId(prefix = 'v'): string {
  valueSeq += 1
  return `${prefix}-${valueSeq}-${Math.random().toString(36).slice(2, 6)}`
}

export function withNote(card: ReturnType<typeof makeInstance>): AssistantCard {
  return { ...card, note: '' }
}

export function defaultPlayerValues(lifeLabel: string): NamedValue[] {
  return [{ id: nextValueId('pv'), label: lifeLabel, value: 20 }]
}

export function createInitialSetup(
  code: ChallengeCode,
  theme: DeckTheme,
  lifeLabel: string,
): AssistantState {
  return {
    code,
    theme,
    status: 'setup',
    setupKind: 'blank',
    startingHeads: 2,
    library: [],
    staging: null,
    battlefield: emptyBattlefield(code, 'blank'),
    graveyard: [],
    exile: [],
    playerValues: defaultPlayerValues(lifeLabel),
  }
}

export function buildAssistantStart(
  defs: CardDef[],
  code: ChallengeCode,
  theme: DeckTheme,
  setupKind: AssistantSetupKind,
  startingHeads: number,
  lifeLabel: string,
): AssistantState {
  resetIdSeq()
  valueSeq = 0
  const base = createInitialSetup(code, theme, lifeLabel)
  base.status = 'playing'
  base.setupKind = setupKind
  base.startingHeads = startingHeads

  if (setupKind === 'blank') {
    return {
      ...base,
      library: expandLibrary(defs).map(withNote),
      battlefield: emptyBattlefield(code, 'blank'),
    }
  }

  if (code === 'tfth') {
    const headDef = defs.find((d) => d.name === 'Hydra Head')
    if (!headDef) throw new Error('Hydra Head missing')
    const starting = Math.min(4, Math.max(1, startingHeads))
    const heads: AssistantCard[] = []
    for (let i = 0; i < starting; i += 1) heads.push(withNote(makeInstance(headDef)))

    const library = expandLibrary(defs)
    let removed = 0
    const filtered = library.filter((c) => {
      if (c.name === 'Hydra Head' && removed < starting) {
        removed += 1
        return false
      }
      return true
    })

    return {
      ...base,
      startingHeads: starting,
      library: filtered.map(withNote),
      battlefield: placeOnBattlefield(code, heads, 'rules'),
    }
  }

  if (code === 'tdag') {
    const xenagosDef = defs.find((d) => d.name === 'Xenagos Ascended')
    const throngDef = defs.find((d) => d.name === 'Rollicking Throng')
    if (!xenagosDef || !throngDef) throw new Error('TDAG cards missing')

    const xenagos = withNote(makeInstance(xenagosDef))
    const throngs = [withNote(makeInstance(throngDef)), withNote(makeInstance(throngDef))]

    let library = expandLibrary(defs)
    let removeX = 1
    let removeT = 2
    library = library.filter((c) => {
      if (c.name === 'Xenagos Ascended' && removeX > 0) {
        removeX -= 1
        return false
      }
      if (c.name === 'Rollicking Throng' && removeT > 0) {
        removeT -= 1
        return false
      }
      return true
    })

    return {
      ...base,
      library: library.map(withNote),
      battlefield: placeFeaturedOnBattlefield(code, xenagos, throngs, 'rules'),
    }
  }

  // Horde: empty board, full shuffled library
  return {
    ...base,
    library: expandLibrary(defs).map(withNote),
    battlefield: emptyBattlefield(code, 'rules'),
  }
}
