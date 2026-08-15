import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  collectionRarityStats,
  type CollectedCard,
} from '../data/packCollection'
import { chatCompletion, LlmError } from '../llm/client'
import { collectionOverviewSystemPrompt } from '../llm/prompts'
import { useHasLlmApiKey } from '../hooks/useLlmSettings'
import { LlmRichText } from './LlmRichText'
import '../styles/llm.css'

interface CollectionLlmAdvisorProps {
  collection: CollectedCard[]
}

export function CollectionLlmAdvisor({ collection }: CollectionLlmAdvisorProps) {
  const { t, i18n } = useTranslation()
  const hasKey = useHasLlmApiKey()
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    setAnswer('')
    setError(false)
  }, [collection.length])

  if (!hasKey || collection.length === 0) return null

  const run = async () => {
    if (loading) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setError(false)
    setAnswer('')
    try {
      const names = [...new Set(collection.map((c) => c.name))].slice(0, 60)
      const rarity = collectionRarityStats(collection)
      const text = await chatCompletion({
        signal: ac.signal,
        maxTokens: 420,
        temperature: 0.55,
        messages: [
          {
            role: 'system',
            content: collectionOverviewSystemPrompt(i18n.language),
          },
          {
            role: 'user',
            content: `Collection names (${names.length}):\n${JSON.stringify(names)}\n\nRarity counts:\n${JSON.stringify(rarity)}`,
          },
        ],
        cache: {
          scope: 'collection.overview',
          payload: { lang: i18n.language, names, rarity },
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
    <>
      <button
        type="button"
        className="btn ghost"
        disabled={loading}
        onClick={() => void run()}
      >
        {loading ? t('llm.rulesLoading') : t('llm.collectionAdvise')}
      </button>
      {answer ? (
        <div
          className={`llm-collection-answer ${error ? 'is-error' : ''}`}
          role="status"
        >
          <LlmRichText text={answer} />
        </div>
      ) : null}
    </>
  )
}
