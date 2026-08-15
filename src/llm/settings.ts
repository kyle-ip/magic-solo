export const LLM_SETTINGS_KEY = 'magic-solo:llm-settings'

export interface LlmSettings {
  /** OpenAI-compatible API base, e.g. https://api.openai.com/v1 */
  baseUrl: string
  apiKey: string
  model: string
  /** True after a successful connection test with the current credentials. */
  connectionOk: boolean
}

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'qwen3.7-flash',
  connectionOk: false,
}

type Listener = () => void

let cached: LlmSettings | null = null
const listeners = new Set<Listener>()

function normalize(raw: Partial<LlmSettings> | null | undefined): LlmSettings {
  const apiKey = (raw?.apiKey ?? '').trim()
  return {
    baseUrl: (raw?.baseUrl ?? DEFAULT_LLM_SETTINGS.baseUrl).trim().replace(/\/+$/, ''),
    apiKey,
    model: (raw?.model ?? DEFAULT_LLM_SETTINGS.model).trim() || DEFAULT_LLM_SETTINGS.model,
    connectionOk: Boolean(raw?.connectionOk) && apiKey.length > 0,
  }
}

export function readLlmSettings(): LlmSettings {
  if (cached) return cached
  if (typeof localStorage === 'undefined') {
    cached = { ...DEFAULT_LLM_SETTINGS }
    return cached
  }
  try {
    const raw = localStorage.getItem(LLM_SETTINGS_KEY)
    if (!raw) {
      cached = { ...DEFAULT_LLM_SETTINGS }
      return cached
    }
    cached = normalize(JSON.parse(raw) as Partial<LlmSettings>)
    return cached
  } catch {
    cached = { ...DEFAULT_LLM_SETTINGS }
    return cached
  }
}

export function writeLlmSettings(next: Partial<LlmSettings>): LlmSettings {
  const prev = readLlmSettings()
  const merged = normalize({ ...prev, ...next })
  // Changing credentials invalidates a prior successful test unless explicitly re-set.
  if (
    next.connectionOk === undefined &&
    (merged.apiKey !== prev.apiKey ||
      merged.baseUrl !== prev.baseUrl ||
      merged.model !== prev.model)
  ) {
    merged.connectionOk = false
  }
  cached = merged
  try {
    localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify(merged))
  } catch {
    /* ignore quota / private mode */
  }
  listeners.forEach((l) => l())
  return merged
}

export function clearLlmApiKey(): LlmSettings {
  return writeLlmSettings({ apiKey: '', connectionOk: false })
}

export function hasLlmApiKey(settings: LlmSettings = readLlmSettings()): boolean {
  return settings.apiKey.length > 0
}

/** API key present and last connection test succeeded for these settings. */
export function isLlmReady(settings: LlmSettings = readLlmSettings()): boolean {
  return hasLlmApiKey(settings) && settings.connectionOk
}

export function maskApiKey(key: string): string {
  const k = key.trim()
  if (k.length <= 8) return k ? '••••' : ''
  return `${k.slice(0, 4)}…${k.slice(-4)}`
}

export function subscribeLlmSettings(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getLlmSettingsSnapshot(): LlmSettings {
  return readLlmSettings()
}
