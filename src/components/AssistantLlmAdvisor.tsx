import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AssistantState } from '../assistant/types'
import { getDeckRules } from '../data/deckRegistry'
import { chatCompletion, LlmError } from '../llm/client'
import { summarizeAssistantBoard } from '../llm/context/assistantBoard'
import { rulesBrief } from '../llm/context/rulesBrief'
import { assistantAdvisorSystemPrompt } from '../llm/prompts'
import { useHasLlmApiKey } from '../hooks/useLlmSettings'
import { LlmRichText } from './LlmRichText'
import '../styles/llm.css'

interface AssistantLlmAdvisorProps {
  state: AssistantState
}

export function AssistantLlmAdvisor({ state }: AssistantLlmAdvisorProps) {
  const { t, i18n } = useTranslation()
  const hasKey = useHasLlmApiKey()
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState(false)
  const [open, setOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    setAnswer('')
    setError(false)
  }, [state.code, state.library.length, state.graveyard.length, state.exile.length, state.staging?.instanceId])

  if (!hasKey || state.status !== 'playing') return null

  const advise = async () => {
    if (loading) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setOpen(true)
    setLoading(true)
    setError(false)
    setAnswer('')
    try {
      const rules = getDeckRules(state.code, i18n.language)
      const board = summarizeAssistantBoard(state)
      const brief = rules ? rulesBrief(rules, 5) : null
      const text = await chatCompletion({
        signal: ac.signal,
        maxTokens: 360,
        temperature: 0.45,
        messages: [
          {
            role: 'system',
            content: assistantAdvisorSystemPrompt(i18n.language),
          },
          {
            role: 'user',
            content: [
              `Board JSON:\n${JSON.stringify(board)}`,
              `Rules JSON:\n${JSON.stringify(brief)}`,
              'Task: suggest the usual next challenge-side action.',
            ].join('\n\n'),
          },
        ],
        cache: {
          scope: 'assistant.advise',
          payload: { lang: i18n.language, board, brief },
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
    <div className="llm-assistant-advisor">
      <button
        type="button"
        className="btn ghost"
        disabled={loading}
        onClick={() => void advise()}
      >
        {loading ? t('llm.rulesLoading') : t('llm.assistantAdvise')}
      </button>
      {open && answer ? (
        <div
          className={`llm-assistant-answer ${error ? 'is-error' : ''}`}
          role="status"
        >
          <LlmRichText text={answer} />
        </div>
      ) : null}
    </div>
  )
}
