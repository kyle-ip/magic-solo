import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { requestOpenLlmSettings } from '../llm/openSettings'
import { useHasLlmApiKey } from '../hooks/useLlmSettings'

export function SiteFooter() {
  const { t } = useTranslation()
  const hasKey = useHasLlmApiKey()

  return (
    <footer className="site-footer">
      <p>
        <a href="https://scryfall.com" target="_blank" rel="noreferrer">
          {t('app.attribution')}
        </a>
        {' · '}
        <Link to="/help" className="site-footer-llm-link">
          {t('app.help')}
        </Link>
        {' · '}
        <button
          type="button"
          className="site-footer-llm-link"
          onClick={() => requestOpenLlmSettings()}
        >
          {hasKey ? t('llm.footerConfigured') : t('llm.footerLink')}
        </button>
      </p>
      <p>{t('app.rulesAttribution')}</p>
    </footer>
  )
}
