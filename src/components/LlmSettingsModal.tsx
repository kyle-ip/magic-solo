import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { LlmError, testLlmConnection } from '../llm/client'
import { clearLlmCache, llmCacheStats } from '../llm/cache'
import {
  clearLlmApiKey,
  DEFAULT_LLM_SETTINGS,
  maskApiKey,
  writeLlmSettings,
  type LlmSettings,
} from '../llm/settings'
import { useLlmSettings } from '../hooks/useLlmSettings'
import '../styles/llm.css'

interface LlmSettingsModalProps {
  open: boolean
  onClose: () => void
}

export function LlmSettingsModal({ open, onClose }: LlmSettingsModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const stored = useLlmSettings()
  const [baseUrl, setBaseUrl] = useState(stored.baseUrl)
  const [apiKey, setApiKey] = useState(stored.apiKey)
  const [model, setModel] = useState(stored.model)
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [cacheCount, setCacheCount] = useState(() => llmCacheStats().entries)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) return
    setBaseUrl(stored.baseUrl)
    setApiKey(stored.apiKey)
    setModel(stored.model)
    setShowKey(false)
    setStatus('idle')
    setStatusMsg('')
    setSavedFlash(false)
    setCacheCount(llmCacheStats().entries)
  }, [open, stored.baseUrl, stored.apiKey, stored.model])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  if (!open) return null

  const draft = (): LlmSettings => ({
    baseUrl: baseUrl.trim() || DEFAULT_LLM_SETTINGS.baseUrl,
    apiKey: apiKey.trim(),
    model: model.trim() || DEFAULT_LLM_SETTINGS.model,
  })

  const save = () => {
    writeLlmSettings(draft())
    setSavedFlash(true)
    setStatus('idle')
    setStatusMsg(t('llm.saved'))
    window.setTimeout(() => setSavedFlash(false), 1600)
  }

  const clearKey = () => {
    setApiKey('')
    clearLlmApiKey()
    setStatus('idle')
    setStatusMsg(t('llm.keyCleared'))
  }

  const clearCache = () => {
    const n = clearLlmCache()
    setCacheCount(0)
    setStatus('idle')
    setStatusMsg(t('llm.cacheCleared', { n }))
  }

  const test = async () => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    const next = draft()
    writeLlmSettings(next)
    setStatus('testing')
    setStatusMsg(t('llm.testing'))
    try {
      await testLlmConnection(next, ac.signal)
      setStatus('ok')
      setStatusMsg(t('llm.testOk'))
    } catch (err) {
      if (err instanceof LlmError && err.code === 'aborted') return
      setStatus('error')
      setStatusMsg(
        err instanceof Error ? err.message : t('llm.testFail'),
      )
    }
  }

  return createPortal(
    <div
      className="llm-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="llm-modal-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="llm-modal-close"
          onClick={onClose}
          aria-label={t('llm.close')}
        >
          ×
        </button>
        <header className="llm-modal-head">
          <p className="eyebrow">{t('llm.eyebrow')}</p>
          <h2 id={titleId}>{t('llm.title')}</h2>
          <p className="llm-modal-lead">{t('llm.lead')}</p>
        </header>

        <form
          className="llm-form"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <label className="llm-field">
            <span>{t('llm.baseUrl')}</span>
            <input
              type="url"
              name="baseUrl"
              autoComplete="off"
              spellCheck={false}
              placeholder={DEFAULT_LLM_SETTINGS.baseUrl}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </label>

          <label className="llm-field">
            <span>{t('llm.apiKey')}</span>
            <div className="llm-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                name="apiKey"
                autoComplete="off"
                spellCheck={false}
                placeholder={t('llm.apiKeyPlaceholder')}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                type="button"
                className="btn ghost llm-inline-btn"
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? t('llm.hideKey') : t('llm.showKey')}
              </button>
            </div>
            {stored.apiKey ? (
              <span className="llm-field-hint">
                {t('llm.storedHint', { masked: maskApiKey(stored.apiKey) })}
              </span>
            ) : null}
          </label>

          <label className="llm-field">
            <span>{t('llm.model')}</span>
            <input
              type="text"
              name="model"
              autoComplete="off"
              spellCheck={false}
              placeholder={DEFAULT_LLM_SETTINGS.model}
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </label>

          <p className="llm-warning">{t('llm.warning')}</p>

          <div className="llm-actions">
            <button type="submit" className="btn primary">
              {t('llm.save')}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => void test()}
              disabled={status === 'testing' || !apiKey.trim()}
            >
              {t('llm.test')}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={clearKey}
              disabled={!apiKey && !stored.apiKey}
            >
              {t('llm.clearKey')}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={clearCache}
              disabled={cacheCount === 0}
            >
              {t('llm.clearCache', { n: cacheCount })}
            </button>
          </div>

          <p className="llm-field-hint">{t('llm.cacheHint')}</p>

          {statusMsg ? (
            <p
              className={`llm-status ${status === 'error' ? 'is-error' : ''} ${
                status === 'ok' || savedFlash ? 'is-ok' : ''
              }`}
              role="status"
            >
              {statusMsg}
            </p>
          ) : null}
        </form>
      </div>
    </div>,
    document.body,
  )
}
