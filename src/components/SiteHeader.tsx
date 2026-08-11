import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitch } from './LanguageSwitch'
import { PackDrawButton } from './PackDrawButton'
import { ReferencesButton } from './ReferencesButton'
import { assetUrl } from '../utils/assetUrl'

export function SiteHeader() {
  const { t } = useTranslation()

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand-lockup">
          <img
            className="brand-logo"
            src={assetUrl('mtg-logo.svg')}
            alt={t('app.brand')}
            width={210}
            height={48}
          />
          <span className="brand-solo">
            <strong>{t('app.brand')}</strong>
            <em>{t('app.tagline')}</em>
          </span>
        </Link>
        <div className="site-header-actions">
          <PackDrawButton />
          <ReferencesButton />
          <LanguageSwitch />
        </div>
      </div>
    </header>
  )
}
