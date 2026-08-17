import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getDeckIndex, getDeckRules, getSharedRules } from '../data/deckRegistry'
import { PackHeadIconButton } from './PackHeadIconButton'
import { AppOverlay } from './ui'

export function ReferencesButton({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const decks = getDeckIndex()
  const shared = getSharedRules(i18n.language)

  const referenceLinks = useMemo(() => {
    const seen = new Set<string>()
    const links: { label: string; url: string }[] = []
    const push = (label: string, url: string) => {
      if (seen.has(url)) return
      seen.add(url)
      links.push({ label, url })
    }
    for (const source of shared.sources) push(source.label, source.url)
    for (const entry of decks) {
      const rules = getDeckRules(entry.code, i18n.language)
      for (const source of rules?.sources ?? []) push(source.label, source.url)
    }
    const siteKey = (url: string) => {
      try {
        return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
      } catch {
        return url
      }
    }
    return links.sort((a, b) => {
      const bySite = siteKey(a.url).localeCompare(siteKey(b.url))
      if (bySite !== 0) return bySite
      return a.label.localeCompare(b.label, i18n.language)
    })
  }, [decks, i18n.language, shared.sources])

  return (
    <>
      <button
        type="button"
        className={className ?? 'references-text-btn'}
        onClick={() => setOpen(true)}
      >
        {t('home.references')}
      </button>
      <AppOverlay
        open={open}
        onClose={() => setOpen(false)}
        title={t('home.references')}
        titleId="references-modal-title"
        className="references-backdrop"
        shellClassName="references-modal"
        size="narrow"
        headerActions={
          <PackHeadIconButton
            icon="close"
            label={t('deck.close')}
            onClick={() => setOpen(false)}
          />
        }
      >
        <ul className="reference-list">
          {referenceLinks.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
      </AppOverlay>
    </>
  )
}
