import { hasLlmApiKey, readLlmSettings, type LlmSettings } from './settings'
import {
  buildLlmCacheKey,
  readLlmCache,
  writeLlmCache,
  type LlmCachePolicy,
} from './cache'

export class LlmError extends Error {
  constructor(
    message: string,
    readonly code: 'missing_key' | 'http' | 'parse' | 'empty' | 'aborted' = 'http',
  ) {
    super(message)
    this.name = 'LlmError'
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  messages: ChatMessage[]
  /** Override stored settings for this call */
  settings?: LlmSettings
  signal?: AbortSignal
  temperature?: number
  maxTokens?: number
  /**
   * When set, reuse a prior answer for the same scope+payload+model.
   * Omit for one-off calls (e.g. connection test).
   */
  cache?: LlmCachePolicy
  /** Force network even if a cache entry exists (e.g. regenerate). */
  skipCache?: boolean
}

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>
  error?: { message?: string }
}

function modelCacheKey(settings: LlmSettings): string {
  return `${settings.baseUrl}::${settings.model}`
}

export async function chatCompletion(opts: ChatCompletionOptions): Promise<string> {
  const settings = opts.settings ?? readLlmSettings()
  if (!hasLlmApiKey(settings)) {
    throw new LlmError('API key not set', 'missing_key')
  }

  let cacheKey: string | null = null
  if (opts.cache && !opts.skipCache) {
    cacheKey = buildLlmCacheKey(
      opts.cache.scope,
      opts.cache.payload,
      modelCacheKey(settings),
    )
    const hit = readLlmCache(cacheKey)
    if (hit != null) return hit
  }

  const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 600,
      }),
      signal: opts.signal,
    })
  } catch (err) {
    if (opts.signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
      throw new LlmError('Request aborted', 'aborted')
    }
    throw new LlmError(
      err instanceof Error ? err.message : 'Network error calling LLM API',
      'http',
    )
  }

  let data: OpenAiChatResponse
  try {
    data = (await res.json()) as OpenAiChatResponse
  } catch {
    throw new LlmError(`HTTP ${res.status}: invalid JSON response`, 'parse')
  }

  if (!res.ok) {
    throw new LlmError(
      data.error?.message || `HTTP ${res.status} from LLM API`,
      'http',
    )
  }

  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) {
    throw new LlmError('Empty response from model', 'empty')
  }

  if (opts.cache) {
    const key =
      cacheKey ??
      buildLlmCacheKey(
        opts.cache.scope,
        opts.cache.payload,
        modelCacheKey(settings),
      )
    writeLlmCache(key, opts.cache.scope, text, opts.cache.ttlMs ?? null)
  }

  return text
}

/** Quick connectivity check used by the settings modal. */
export async function testLlmConnection(
  settings: LlmSettings,
  signal?: AbortSignal,
): Promise<string> {
  return chatCompletion({
    settings,
    signal,
    maxTokens: 32,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: 'Reply with exactly: ok',
      },
    ],
  })
}
