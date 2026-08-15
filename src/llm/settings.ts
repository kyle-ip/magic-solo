export const LLM_SETTINGS_KEY = 'magic-solo:llm-settings'

export interface LlmSettings {
  /** OpenAI-compatible API base, e.g. https://api.openai.com/v1 */
  baseUrl: string
  apiKey: string
  model: string
}

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
}

type Listener = () => void

let cached: LlmSettings | null = null
const listeners = new Set<Listener>()

function normalize(raw: Partial<LlmSettings> | null | undefined): LlmSettings {
  return {
    baseUrl: (raw?.baseUrl ?? DEFAULT_LLM_SETTINGS.baseUrl).trim().replace(/\/+$/, ''),
    apiKey: (raw?.apiKey ?? '').trim(),
    model: (raw?.model ?? DEFAULT_LLM_SETTINGS.model).trim() || DEFAULT_LLM_SETTINGS.model,
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
  const merged = normalize({ ...readLlmSettings(), ...next })
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
  return writeLlmSettings({ apiKey: '' })
}

export function hasLlmApiKey(settings: LlmSettings = readLlmSettings()): boolean {
  return settings.apiKey.length > 0
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
