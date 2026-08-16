import { describe, expect, it } from 'vitest'
import { resolvePrimaryAction } from '../primaryAction'

const base = {
  activeSide: 'player' as const,
  over: false,
  awaitingAdvance: false,
  playerPhase: 'main' as const,
  attackableCount: 0,
  selectedAttackerCount: 0,
  allAttackersAimed: true,
  code: 'tfth' as const,
  pendingCast: false,
}

describe('resolvePrimaryAction', () => {
  it('prefers advance while awaiting challenge cast', () => {
    const r = resolvePrimaryAction({ ...base, awaitingAdvance: true })
    expect(r.kind).toBe('advance')
    expect(r.labelKey).toBe('challenge.castContinue')
  })

  it('offers enter combat then end turn on main with attackers', () => {
    const r = resolvePrimaryAction({ ...base, attackableCount: 2 })
    expect(r.kind).toBe('enter_combat')
    expect(r.secondaries).toContain('end_turn')
  })

  it('resolves combat with cancel secondary', () => {
    const r = resolvePrimaryAction({
      ...base,
      playerPhase: 'combat',
      selectedAttackerCount: 1,
      allAttackersAimed: true,
    })
    expect(r.kind).toBe('resolve_combat')
    expect(r.disabled).toBe(false)
    expect(r.secondaries).toContain('cancel_combat')
  })

  it('disables resolve when aims missing', () => {
    const r = resolvePrimaryAction({
      ...base,
      playerPhase: 'combat',
      selectedAttackerCount: 2,
      allAttackersAimed: false,
    })
    expect(r.disabled).toBe(true)
  })

  it('defaults to end turn', () => {
    expect(resolvePrimaryAction(base).kind).toBe('end_turn')
  })

  it('hides primary on challenge side', () => {
    expect(resolvePrimaryAction({ ...base, activeSide: 'challenge' }).kind).toBe('none')
  })
})
