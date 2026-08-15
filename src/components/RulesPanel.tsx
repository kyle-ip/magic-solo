import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DeckRules } from '../types'
import { chatCompletion, LlmError } from '../llm/client'
import { rulesBrief } from '../llm/context/rulesBrief'
import { rulesQaSystemPrompt } from '../llm/prompts'
import { useHasLlmApiKey } from '../hooks/useLlmSettings'
import { LlmRichText } from './LlmRichText'
import '../styles/llm.css'

interface RulesPanelProps {
  rules: DeckRules
}

export function RulesPanel({ rules }: RulesPanelProps) {
  const { t, i18n } = useTranslation()
  const hasKey = useHasLlmApiKey()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    setAnswer('')
    setError(false)
    setQuestion('')
  }, [rules.code])

  const ask = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || !hasKey || loading) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setError(false)
    setAnswer('')
    try {
      const brief = rulesBrief(rules)
      const text = await chatCompletion({
        signal: ac.signal,
        maxTokens: 500,
        temperature: 0.4,
        messages: [
          { role: 'system', content: rulesQaSystemPrompt(i18n.language) },
          {
            role: 'user',
            content: `Rules JSON:\n${JSON.stringify(brief)}\n\nQuestion: ${trimmed}`,
          },
        ],
        cache: {
          scope: 'rules.qa',
          payload: {
            lang: i18n.language,
            code: rules.code,
            question: trimmed,
            brief,
          },
          ttlMs: null,
        },
      })
      setAnswer(text)
    } catch (err) {
      if (err instanceof LlmError && err.code === 'aborted') return
      setError(true)
      setAnswer(err instanceof Error ? err.message : t('llm.errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

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

      {hasKey ? (
        <div className="llm-rules-panel">
          <h3>{t('llm.rulesTitle')}</h3>
          <p className="llm-rules-lead">{t('llm.rulesLead')}</p>
          <div className="llm-rules-row">
            <button
              type="button"
              className="btn ghost"
              disabled={loading}
              onClick={() => void ask(t('llm.rulesExplain'))}
            >
              {t('llm.rulesExplain')}
            </button>
          </div>
          <form
            className="llm-rules-ask"
            onSubmit={(e) => {
              e.preventDefault()
              void ask(question)
            }}
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('llm.rulesAskPlaceholder')}
              disabled={loading}
              aria-label={t('llm.rulesAskPlaceholder')}
            />
            <button
              type="submit"
              className="btn primary"
              disabled={loading || !question.trim()}
            >
              {loading ? t('llm.rulesLoading') : t('llm.rulesAsk')}
            </button>
          </form>
          {answer ? (
            <div
              className={`llm-rules-answer ${error ? 'is-error' : ''}`}
              role="status"
            >
              <LlmRichText text={answer} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
