import { useTranslation } from 'react-i18next'

export function SiteFooter() {
  const { t } = useTranslation()

  return (
    <footer className="site-footer">
      <p>
        <a href="https://scryfall.com" target="_blank" rel="noreferrer">
          {t('app.attribution')}
        </a>
      </p>
      <p>{t('app.rulesAttribution')}</p>
    </footer>
  )
}
