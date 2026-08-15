import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChallengeCode } from '../game/types'
import { getDeckRules } from '../data/deckRegistry'
import { HERO_DEFS, maxHeroesFor } from '../game/heroes'
import { getDeckHint, getPlayerDeck, type PlayerDeckId } from '../game/playerDecks'
import { chatCompletion, LlmError } from '../llm/client'
import { rulesBrief } from '../llm/context/rulesBrief'
import { setupAdviceSystemPrompt } from '../llm/prompts'
import { useHasLlmApiKey } from '../hooks/useLlmSettings'
import { LlmRichText } from './LlmRichText'
import '../styles/llm.css'

interface SetupLlmAdvisorProps {
  code: ChallengeCode
  heads: number
  hordeDelay: number
  heroIds: string[]
  playerDeckId: PlayerDeckId
}

export function SetupLlmAdvisor({
  code,
  heads,
  hordeDelay,
  heroIds,
  playerDeckId,
}: SetupLlmAdvisorProps) {
  const { t, i18n } = useTranslation()
  const hasKey = useHasLlmApiKey()
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const zh = i18n.language.startsWith('zh')

  useEffect(() => () => abortRef.current?.abort(), [])

  if (!hasKey) return null

  const run = async () => {
    if (loading) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setError(false)
    setAnswer('')
    try {
      const rules = getDeckRules(code, i18n.language)
      const deck = getPlayerDeck(playerDeckId)
      const heroes = heroIds
        .map((id) => HERO_DEFS.find((h) => h.id === id)?.name)
        .filter(Boolean)
      const setup = {
        code,
        startingHeads: code === 'tfth' ? heads : undefined,
        hordeDelay: code === 'tbth' ? hordeDelay : undefined,
        maxHeroes: maxHeroesFor(code),
        selectedHeroes: heroes,
        playerDeck: zh ? deck.nameZh : deck.name,
        playerDeckId: deck.id,
        colors: deck.colors,
        archetype: deck.archetype,
        deckHint: getDeckHint(playerDeckId, code, zh),
      }
      const brief = rules ? rulesBrief(rules, 4) : null
      const text = await chatCompletion({
        signal: ac.signal,
        maxTokens: 360,
        temperature: 0.45,
        messages: [
          { role: 'system', content: setupAdviceSystemPrompt(i18n.language) },
          {
            role: 'user',
            content: [
              `Setup JSON:\n${JSON.stringify(setup)}`,
              `Rules summary:\n${JSON.stringify(brief)}`,
              'Task: advise these setup choices for a casual first play.',
            ].join('\n\n'),
          },
        ],
        cache: {
          scope: 'challenge.setup',
          payload: { lang: i18n.language, setup, brief },
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
        {loading ? t('llm.rulesLoading') : t('llm.setupAdvise')}
      </button>
      {answer ? (
        <div
          className={`llm-setup-answer ${error ? 'is-error' : ''}`}
          role="status"
        >
          <LlmRichText text={answer} />
        </div>
      ) : null}
    </>
  )
}
