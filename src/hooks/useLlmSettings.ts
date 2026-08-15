import { useSyncExternalStore } from 'react'
import {
  getLlmSettingsSnapshot,
  hasLlmApiKey,
  isLlmReady,
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

export function useLlmReady(): boolean {
  const settings = useLlmSettings()
  return isLlmReady(settings)
}
