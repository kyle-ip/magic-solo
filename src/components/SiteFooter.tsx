import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { requestOpenLlmSettings } from '../llm/openSettings'
import { requestOpenPageChat } from '../llm/openPageChat'
import { useHasLlmApiKey, useLlmReady } from '../hooks/useLlmSettings'
import { ReferencesButton } from './ReferencesButton'

export function SiteFooter() {
  const { t } = useTranslation()
  const hasKey = useHasLlmApiKey()
  const llmReady = useLlmReady()
  const rulesLine = t('app.rulesAttribution').trim()

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-links">
          <a href="https://mtg.wiki" target="_blank" rel="noreferrer">
            {t('app.wiki')}
          </a>
          {' · '}
          <a href="https://scryfall.com" target="_blank" rel="noreferrer">
            {t('app.attribution')}
          </a>
          {' · '}
          <Link to="/help" className="site-footer-llm-link">
            {t('app.help')}
          </Link>
          {' · '}
          <ReferencesButton className="site-footer-llm-link" />
          {' · '}
          <button
            type="button"
            className={`site-footer-llm-link${llmReady ? ' is-ready' : ''}`}
            onClick={() => requestOpenLlmSettings()}
          >
            {hasKey ? t('llm.footerConfigured') : t('llm.footerLink')}
          </button>
          {hasKey ? (
            <>
              {' · '}
              <button
                type="button"
                className={`site-footer-llm-link${llmReady ? ' is-ready' : ''}`}
                onClick={() => requestOpenPageChat()}
              >
                {t('llm.footerChat')}
              </button>
            </>
          ) : null}
        </p>
        {rulesLine ? <p className="site-footer-note">{rulesLine}</p> : null}
      </div>
    </footer>
  )
}
