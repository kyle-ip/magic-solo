import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { chatCompletion, LlmError } from '../llm/client'
import { extractPlainQuery } from '../llm/extractPlainQuery'
import {
  nlScryfallQuerySystemPrompt,
  nlSetFilterSystemPrompt,
} from '../llm/prompts'
import { searchScryfallCards } from '../data/setApi'
import type { DrawnCard } from '../data/randomCard'
import { useHasLlmApiKey } from '../hooks/useLlmSettings'
import { DrawnCardModal } from './DrawnCardModal'
import '../styles/llm.css'

type Mode = 'sets-filter' | 'gallery-cards'

interface NlScryfallSearchProps {
  mode: Mode
  /** Current set code when searching within a gallery. */
  setCode?: string
  value: string
  onChange: (q: string) => void
  placeholder: string
  label: string
  /** Controlled AI mode (chip lives outside this component). */
  useAi: boolean
  onUseAiChange: (on: boolean) => void
}

/** Filter-style chip to toggle AI search (render next to set-type chips). */
export function NlAiFilterChip({
  active,
  disabled,
  onToggle,
}: {
  active: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const hasKey = useHasLlmApiKey()
  if (!hasKey) return null
  return (
    <button
      type="button"
      className={`sets-type-chip${active ? ' is-active' : ''}`}
      aria-pressed={active}
      disabled={disabled}
      onClick={onToggle}
    >
      {t('llm.nlToggle')}
    </button>
  )
}

export function NlScryfallSearch({
  mode,
  setCode,
  value,
  onChange,
  placeholder,
  label,
  useAi,
  onUseAiChange,
}: NlScryfallSearchProps) {
  const { t, i18n } = useTranslation()
  const hasKey = useHasLlmApiKey()
  const formId = useId()
  const [aiDraft, setAiDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedQuery, setGeneratedQuery] = useState('')
  const [results, setResults] = useState<DrawnCard[]>([])
  const [inspect, setInspect] = useState<DrawnCard | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (!hasKey && useAi) onUseAiChange(false)
  }, [hasKey, useAi, onUseAiChange])

  useEffect(() => {
    if (useAi) {
      setAiDraft(value)
      abortRef.current?.abort()
    } else {
      setAiDraft('')
      setError('')
      setGeneratedQuery('')
      setResults([])
    }
  }, [useAi]) // eslint-disable-line react-hooks/exhaustive-deps -- sync draft when mode flips

  const aiActive = hasKey && useAi
  const inputValue = aiActive ? aiDraft : value
  const inputPlaceholder = aiActive
    ? mode === 'sets-filter'
      ? t('llm.nlSetsPlaceholder')
      : t('llm.nlGalleryPlaceholder')
    : placeholder

  const runAi = async () => {
    const text = aiDraft.trim()
    if (!text || loading) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setError('')
    setResults([])
    setGeneratedQuery('')
    try {
      if (mode === 'sets-filter') {
        const raw = await chatCompletion({
          signal: ac.signal,
          maxTokens: 40,
          temperature: 0.2,
          messages: [
            { role: 'system', content: nlSetFilterSystemPrompt(i18n.language) },
            { role: 'user', content: text },
          ],
          cache: {
            scope: 'nl.setsFilter',
            payload: { lang: i18n.language, text },
            ttlMs: null,
          },
        })
        const q = extractPlainQuery(raw)
        setGeneratedQuery(q)
        onChange(q)
      } else {
        const raw = await chatCompletion({
          signal: ac.signal,
          maxTokens: 80,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content: nlScryfallQuerySystemPrompt(i18n.language),
            },
            {
              role: 'user',
              content: setCode
                ? `Set code context: ${setCode}\nRequest: ${text}`
                : `Request: ${text}`,
            },
          ],
          cache: {
            scope: 'nl.scryfallQuery',
            payload: { lang: i18n.language, setCode: setCode ?? null, text },
            ttlMs: null,
          },
        })
        const q = extractPlainQuery(raw)
        setGeneratedQuery(q)
        onChange(q)
        const page = await searchScryfallCards(q, { max: 24 })
        if (ac.signal.aborted) return
        setResults(page.cards)
        if (page.cards.length === 0) {
          setError(t('llm.nlNoResults', { query: q }))
        }
      }
    } catch (err) {
      if (err instanceof LlmError && err.code === 'aborted') return
      setError(err instanceof Error ? err.message : t('llm.errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`llm-nl-search${aiActive ? ' is-ai' : ''}`}>
      <form
        id={formId}
        className="sets-search llm-nl-search-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (aiActive) void runAi()
        }}
      >
        <span className="visually-hidden">{label}</span>
        <input
          type="search"
          value={inputValue}
          onChange={(e) => {
            const next = e.target.value
            if (aiActive) {
              setAiDraft(next)
              return
            }
            onChange(next)
          }}
          placeholder={inputPlaceholder}
          autoComplete="off"
          disabled={loading}
          aria-label={label}
        />
      </form>
      {aiActive ? (
        <button
          type="submit"
          form={formId}
          className="btn ghost llm-nl-submit"
          disabled={loading || !aiDraft.trim()}
        >
          {loading ? t('llm.rulesLoading') : t('llm.nlSearch')}
        </button>
      ) : null}
      {generatedQuery ? (
        <p className="llm-nl-query" role="status">
          {t('llm.nlQueryLabel', { query: generatedQuery })}
        </p>
      ) : null}
      {error ? (
        <p className="llm-nl-error" role="status">
          {error}
        </p>
      ) : null}
      {results.length > 0 ? (
        <ul className="llm-nl-results">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="llm-nl-result-tile"
                onClick={() => setInspect(c)}
              >
                <img src={c.frontImageUrl} alt={c.name} />
                <span>{c.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <DrawnCardModal
        card={inspect}
        cards={results}
        onSelect={setInspect}
        onClose={() => setInspect(null)}
      />
    </div>
  )
}
