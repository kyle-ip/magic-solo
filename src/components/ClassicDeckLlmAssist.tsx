import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ClassicDeck } from '../types'
import { getClassicDeckIndex, getClassicDeckText, loadClassicDeck } from '../data/classicDeckRegistry'
import { chatCompletion, LlmError } from '../llm/client'
import { classicDeckBrief } from '../llm/context/classicDeckBrief'
import {
  classicDeckCompareSystemPrompt,
  classicDeckExplainSystemPrompt,
} from '../llm/prompts'
import { useHasLlmApiKey } from '../hooks/useLlmSettings'
import { LlmRichText } from './LlmRichText'
import '../styles/llm.css'

interface ClassicDeckLlmAssistProps {
  deck: ClassicDeck
}

export function ClassicDeckLlmAssist({ deck }: ClassicDeckLlmAssistProps) {
  const { t, i18n } = useTranslation()
  const hasKey = useHasLlmApiKey()
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState(false)
  const [compareId, setCompareId] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const others = useMemo(
    () => getClassicDeckIndex().filter((d) => d.id !== deck.id),
    [deck.id],
  )

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    setAnswer('')
    setError(false)
    setCompareId('')
  }, [deck.id])

  if (!hasKey) return null

  const runExplain = async () => {
    if (loading) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setError(false)
    setAnswer('')
    try {
      const brief = classicDeckBrief(deck, i18n.language)
      const text = await chatCompletion({
        signal: ac.signal,
        maxTokens: 480,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: classicDeckExplainSystemPrompt(i18n.language),
          },
          {
            role: 'user',
            content: `Deck JSON:\n${JSON.stringify(brief)}`,
          },
        ],
        cache: {
          scope: 'classic.explain',
          payload: { lang: i18n.language, deckId: deck.id, brief },
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

  const runCompare = async () => {
    if (loading || !compareId) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setError(false)
    setAnswer('')
    try {
      const other = await loadClassicDeck(compareId)
      if (!other) throw new Error(t('llm.errorGeneric'))
      const briefA = classicDeckBrief(deck, i18n.language)
      const briefB = classicDeckBrief(other, i18n.language)
      const text = await chatCompletion({
        signal: ac.signal,
        maxTokens: 480,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: classicDeckCompareSystemPrompt(i18n.language),
          },
          {
            role: 'user',
            content: [
              `Deck A:\n${JSON.stringify(briefA)}`,
              `Deck B:\n${JSON.stringify(briefB)}`,
            ].join('\n\n'),
          },
        ],
        cache: {
          scope: 'classic.compare',
          payload: {
            lang: i18n.language,
            a: deck.id,
            b: compareId,
            briefA,
            briefB,
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
    <div className="llm-classic-assist">
      <div className="llm-classic-actions">
        <button
          type="button"
          className="btn ghost"
          disabled={loading}
          onClick={() => void runExplain()}
        >
          {loading ? t('llm.rulesLoading') : t('llm.classicExplain')}
        </button>
        <label className="llm-classic-compare">
          <select
            value={compareId}
            onChange={(e) => setCompareId(e.target.value)}
            disabled={loading}
            aria-label={t('llm.classicComparePick')}
          >
            <option value="">{t('llm.classicComparePick')}</option>
            {others.map((d) => (
              <option key={d.id} value={d.id}>
                {getClassicDeckText(d.name, i18n.language)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn ghost"
            disabled={loading || !compareId}
            onClick={() => void runCompare()}
          >
            {t('llm.classicCompare')}
          </button>
        </label>
      </div>
      {answer ? (
        <div
          className={`llm-classic-answer ${error ? 'is-error' : ''}`}
          role="status"
        >
          <LlmRichText text={answer} />
        </div>
      ) : null}
    </div>
  )
}
