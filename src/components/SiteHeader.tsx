import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChallengeNavMenu } from './ChallengeNavMenu'
import { DrawNavMenu } from './DrawNavMenu'
import { LanguageSwitch } from './LanguageSwitch'
import { CARD_EDITOR_ENABLED } from '../features'
import { assetUrl } from '../utils/assetUrl'

export function SiteHeader() {
  const { t } = useTranslation()

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand-lockup">
          <img
            className="brand-logo"
            src={assetUrl('mtg-logo-mark.svg')}
            alt={t('app.brand')}
            width={56}
            height={56}
          />
          <span className="brand-solo">
            <strong>{t('app.brand')}</strong>
            <em>{t('app.tagline')}</em>
          </span>
        </Link>
        <div className="site-header-actions">
          <nav className="site-header-nav">
            <ChallengeNavMenu />
            <Link to="/classic-decks" className="references-text-btn">
              {t('classicDecks.open')}
            </Link>
            <Link to="/sets" className="references-text-btn">
              {t('sets.open')}
            </Link>
            {CARD_EDITOR_ENABLED ? (
              <Link to="/editor" className="references-text-btn">
                {t('cardEditor.open')}
              </Link>
            ) : (
              <span
                className="references-text-btn is-disabled"
                aria-disabled="true"
                title={t('cardEditor.comingSoon')}
              >
                {t('cardEditor.open')}
              </span>
            )}
            <DrawNavMenu />
          </nav>
          <LanguageSwitch />
        </div>
      </div>
    </header>
  )
}
