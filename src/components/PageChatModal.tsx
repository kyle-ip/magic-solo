import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { chatCompletion, LlmError, type ChatMessage } from '../llm/client'
import { buildPageBrief } from '../llm/context/pageBrief'
import { pageChatSystemPrompt } from '../llm/prompts'
import { useHasLlmApiKey } from '../hooks/useLlmSettings'
import { LlmRichText } from './LlmRichText'
import { PackHeadIconButton } from './PackHeadIconButton'
import { AppOverlay, UiButton } from './ui'
import '../styles/llm.css'

type Turn = { role: 'user' | 'assistant'; content: string }

interface PageChatModalProps {
  open: boolean
  onClose: () => void
}

export function PageChatModal({ open, onClose }: PageChatModalProps) {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()
  const titleId = useId()
  const hasKey = useHasLlmApiKey()
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const briefRef = useRef(buildPageBrief(pathname))

  useEffect(() => {
    if (!open) return
    briefRef.current = buildPageBrief(pathname)
    setDraft('')
    setTurns([])
    setError(false)
    setLoading(false)
    abortRef.current?.abort()
    const id = window.setTimeout(() => inputRef.current?.focus(), 40)
    return () => window.clearTimeout(id)
  }, [open, pathname])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [turns, loading, open])

  const brief = briefRef.current

  const send = async () => {
    const text = draft.trim()
    if (!text || !hasKey || loading) return

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    const nextTurns: Turn[] = [...turns, { role: 'user', content: text }]
    setTurns(nextTurns)
    setDraft('')
    setLoading(true)
    setError(false)

    const history: ChatMessage[] = [
      {
        role: 'system',
        content: pageChatSystemPrompt(i18n.language, {
          challengeMode: brief.challengeMode,
        }),
      },
      {
        role: 'user',
        content: `Page context JSON (refresh when the dialog opens):\n${JSON.stringify(brief)}`,
      },
      {
        role: 'assistant',
        content:
          'Understood. I will use that page context for this conversation.',
      },
      ...nextTurns.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
    ]

    try {
      const reply = await chatCompletion({
        signal: ac.signal,
        maxTokens: 700,
        temperature: 0.55,
        messages: history,
      })
      setTurns((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      if (err instanceof LlmError && err.code === 'aborted') return
      setError(true)
      setTurns((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            err instanceof Error ? err.message : t('llm.errorGeneric'),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppOverlay
      open={open}
      onClose={onClose}
      title={t('llm.chatTitle')}
      titleId={titleId}
      className="llm-modal-backdrop"
      shellClassName="llm-modal-shell llm-page-chat-shell"
      headerActions={
        <PackHeadIconButton
          icon="close"
          label={t('llm.close')}
          onClick={onClose}
        />
      }
    >
      <p className="llm-modal-lead">{t('llm.chatLead')}</p>

      <div className="llm-page-chat-thread" ref={listRef} role="log">
        {turns.length === 0 && !loading ? (
          <p className="llm-page-chat-empty">{t('llm.chatEmpty')}</p>
        ) : null}
        {turns.map((turn, i) => (
          <div
            key={`${turn.role}-${i}`}
            className={`llm-page-chat-bubble is-${turn.role}${
              error && i === turns.length - 1 && turn.role === 'assistant'
                ? ' is-error'
                : ''
            }`}
          >
            {turn.role === 'assistant' ? (
              <LlmRichText text={turn.content} />
            ) : (
              <p>{turn.content}</p>
            )}
          </div>
        ))}
        {loading ? (
          <p className="llm-page-chat-status" role="status">
            {t('llm.rulesLoading')}
          </p>
        ) : null}
      </div>

      <form
        className="llm-page-chat-form"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('llm.chatPlaceholder')}
          disabled={loading || !hasKey}
          aria-label={t('llm.chatPlaceholder')}
          autoComplete="off"
        />
        <UiButton
          type="submit"
          variant="primary"
          disabled={loading || !hasKey || !draft.trim()}
        >
          {t('llm.chatSend')}
        </UiButton>
      </form>
      {!hasKey ? (
        <p className="llm-page-chat-need-key">{t('llm.needKey')}</p>
      ) : null}
    </AppOverlay>
  )
}
