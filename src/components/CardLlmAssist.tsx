import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { wantsZh, type DrawnCard } from '../data/randomCard'
import { chatCompletion, LlmError } from '../llm/client'
import { officialGlossBlock } from '../llm/authority'
import { cardBrief } from '../llm/context/cardBrief'
import {
  cardAskSystemPrompt,
  cardKeywordsSystemPrompt,
  cardPlainExplainSystemPrompt,
  cardSynergySystemPrompt,
  cardTerminologySystemPrompt,
} from '../llm/prompts'
import { useHasLlmApiKey } from '../hooks/useLlmSettings'
import { LlmRichText } from './LlmRichText'
import '../styles/llm.css'

type AssistMode = 'plain' | 'keywords' | 'ask' | 'synergy' | 'terms'

interface CardLlmAssistProps {
  card: DrawnCard
  /** Other unique card names from the open collection (optional). */
  collectionPeers?: string[]
}

export function CardLlmAssist({ card, collectionPeers }: CardLlmAssistProps) {
  const { t, i18n } = useTranslation()
  const hasKey = useHasLlmApiKey()
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState<AssistMode | null>(null)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState(false)
  const [question, setQuestion] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const hasKeywords = (card.keywords?.length ?? 0) > 0
  const peers = collectionPeers?.filter(Boolean) ?? []
  const showSynergy = peers.length > 0
  const showTerms = wantsZh(i18n.language)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    abortRef.current?.abort()
    setAnswer('')
    setError(false)
    setActive(null)
    setLoading(false)
    setQuestion('')
  }, [card.id])

  if (!hasKey) return null

  const run = async (mode: AssistMode, askText?: string) => {
    if (loading) return
    if (mode === 'ask') {
      const q = (askText ?? question).trim()
      if (!q) return
    }

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setActive(mode)
    setError(false)
    setAnswer('')

    const brief = cardBrief(card)
    const gloss = officialGlossBlock(card.keywords, i18n.language)
    const glossSuffix = gloss ? `\n\n${gloss}` : ''
    let system = cardPlainExplainSystemPrompt(i18n.language)
    let user = `Card JSON:\n${JSON.stringify(brief)}${glossSuffix}\n\nTask: plain-language explanation.`

    if (mode === 'keywords') {
      system = cardKeywordsSystemPrompt(i18n.language)
      user = `Card JSON:\n${JSON.stringify(brief)}${glossSuffix}\n\nTask: explain listed keywords only.`
    } else if (mode === 'ask') {
      const q = (askText ?? question).trim()
      system = cardAskSystemPrompt(i18n.language)
      user = `Card JSON:\n${JSON.stringify(brief)}${glossSuffix}\n\nQuestion: ${q}`
    } else if (mode === 'synergy') {
      system = cardSynergySystemPrompt(i18n.language)
      user = [
        `Focus card JSON:\n${JSON.stringify(brief)}`,
        `Collection peer names:\n${JSON.stringify(peers)}`,
        'Task: casual synergy ideas with peers only.',
      ].join('\n\n')
    } else if (mode === 'terms') {
      system = cardTerminologySystemPrompt(i18n.language)
      user = `Card JSON:\n${JSON.stringify(brief)}${glossSuffix}\n\nTask: terminology bridge (EN oracle ↔ official Simplified Chinese Magic terms).`
    }

    const askQ = mode === 'ask' ? (askText ?? question).trim() : ''
    try {
      const text = await chatCompletion({
        signal: ac.signal,
        maxTokens: 400,
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        cache: {
          scope: `card.${mode}`,
          payload: {
            lang: i18n.language,
            cardId: card.id,
            brief,
            gloss,
            peers: mode === 'synergy' ? peers : undefined,
            question: mode === 'ask' ? askQ : undefined,
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
    <div className="llm-card-assist">
      <div className="llm-card-assist-actions">
        <button
          type="button"
          className="btn ghost"
          disabled={loading}
          onClick={() => void run('plain')}
        >
          {loading && active === 'plain'
            ? t('llm.rulesLoading')
            : t('llm.cardPlain')}
        </button>
        {hasKeywords ? (
          <button
            type="button"
            className="btn ghost"
            disabled={loading}
            onClick={() => void run('keywords')}
          >
            {loading && active === 'keywords'
              ? t('llm.rulesLoading')
              : t('llm.cardKeywords')}
          </button>
        ) : null}
        {showTerms ? (
          <button
            type="button"
            className="btn ghost"
            disabled={loading}
            onClick={() => void run('terms')}
          >
            {loading && active === 'terms'
              ? t('llm.rulesLoading')
              : t('llm.cardTerms')}
          </button>
        ) : null}
        {showSynergy ? (
          <button
            type="button"
            className="btn ghost"
            disabled={loading}
            onClick={() => void run('synergy')}
          >
            {loading && active === 'synergy'
              ? t('llm.rulesLoading')
              : t('llm.cardSynergy')}
          </button>
        ) : null}
      </div>
      <form
        className="llm-card-assist-ask"
        onSubmit={(e) => {
          e.preventDefault()
          void run('ask')
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('llm.cardAskPlaceholder')}
          disabled={loading}
          aria-label={t('llm.cardAskPlaceholder')}
        />
        <button
          type="submit"
          className="btn primary"
          disabled={loading || !question.trim()}
        >
          {loading && active === 'ask'
            ? t('llm.rulesLoading')
            : t('llm.cardAsk')}
        </button>
      </form>
      {answer ? (
        <div
          className={`llm-card-assist-answer ${error ? 'is-error' : ''}`}
          role="status"
        >
          <LlmRichText text={answer} />
        </div>
      ) : null}
    </div>
  )
}
