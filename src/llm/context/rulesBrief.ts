import type { DeckRules } from '../../types'

/** Truncate rules for prompt budgets while keeping structure. */
export function rulesBrief(rules: DeckRules, maxBulletsPerSection = 8) {
  return {
    code: rules.code,
    title: rules.title,
    intro: rules.intro,
    sections: rules.sections.map((s) => ({
      id: s.id,
      title: s.title,
      bullets: s.bullets.slice(0, maxBulletsPerSection),
    })),
  }
}
