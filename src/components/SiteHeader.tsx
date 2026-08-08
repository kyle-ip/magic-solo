import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitch } from './LanguageSwitch'

export function SiteHeader() {
  const { t } = useTranslation()

  return (
    <header className="site-header">
      <Link to="/" className="brand-lockup">
        <span className="brand-mark" aria-hidden="true" />
        <span>
          <strong>{t('app.brand')}</strong>
          <em>{t('app.tagline')}</em>
        </span>
      </Link>
      <LanguageSwitch />
    </header>
  )
}
