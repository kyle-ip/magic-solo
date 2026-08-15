import { useEffect, useState } from 'react'
import { PageChatModal } from './PageChatModal'
import { subscribeOpenPageChat } from '../llm/openPageChat'

export function PageChatHost() {
  const [open, setOpen] = useState(false)
  useEffect(() => subscribeOpenPageChat(() => setOpen(true)), [])
  return <PageChatModal open={open} onClose={() => setOpen(false)} />
}
