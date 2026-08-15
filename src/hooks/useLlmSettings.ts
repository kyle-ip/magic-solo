import { useSyncExternalStore } from 'react'
import {
  getLlmSettingsSnapshot,
  hasLlmApiKey,
  subscribeLlmSettings,
  type LlmSettings,
} from '../llm/settings'

export function useLlmSettings(): LlmSettings {
  return useSyncExternalStore(
    subscribeLlmSettings,
    getLlmSettingsSnapshot,
    getLlmSettingsSnapshot,
  )
}

export function useHasLlmApiKey(): boolean {
  const settings = useLlmSettings()
  return hasLlmApiKey(settings)
}
