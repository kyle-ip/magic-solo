import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { getDeckIndex, getDeckRules, getSharedRules } from '../data/deckRegistry'

export function ReferencesButton() {
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
    return links
  }, [decks, i18n.language, shared.sources])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const dialog =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="references-backdrop"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false)
            }}
          >
            <div
              className="references-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="references-modal-title"
            >
              <header className="references-modal-head">
                <div>
                  <p className="eyebrow">{t('deck.sources')}</p>
                  <h2 id="references-modal-title">{t('home.references')}</h2>
                  <p className="references-modal-lead">{t('home.referencesLead')}</p>
                </div>
                <button
                  type="button"
                  className="btn ghost tiny"
                  onClick={() => setOpen(false)}
                >
                  {t('deck.close')}
                </button>
              </header>
              <ul className="reference-list">
                {referenceLinks.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <button
        type="button"
        className="btn ghost tiny references-trigger"
        onClick={() => setOpen(true)}
      >
        {t('home.references')}
      </button>
      {dialog}
    </>
  )
}
