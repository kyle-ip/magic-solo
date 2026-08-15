import { useEffect, useState } from 'react'
import { LlmSettingsModal } from './LlmSettingsModal'
import { subscribeOpenLlmSettings } from '../llm/openSettings'

/** Always-mounted host so footer (and others) can open settings even with no floating button. */
export function LlmSettingsHost() {
  const [open, setOpen] = useState(false)
  useEffect(() => subscribeOpenLlmSettings(() => setOpen(true)), [])
  return <LlmSettingsModal open={open} onClose={() => setOpen(false)} />
}
