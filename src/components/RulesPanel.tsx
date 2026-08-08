import { useTranslation } from 'react-i18next'
import type { DeckRules } from '../types'

interface RulesPanelProps {
  rules: DeckRules
}

export function RulesPanel({ rules }: RulesPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="rules-panel">
      <header className="section-head">
        <p className="eyebrow">{t('deck.rules')}</p>
        <h2>{rules.title}</h2>
        <p className="lede">{rules.intro}</p>
      </header>

      <div className="rules-sections">
        {rules.sections.map((section) => (
          <details key={section.id} className="rules-block">
            <summary>{section.title}</summary>
            <ul>
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <div className="rules-sources">
        <h3>{t('deck.sources')}</h3>
        <ul>
          {rules.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
