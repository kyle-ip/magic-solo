import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <main className="not-found-page">
      <p className="not-found-code" aria-hidden="true">
        404
      </p>
      <h1>{t('notFound.title')}</h1>
      <p className="not-found-lead">{t('notFound.lead')}</p>
      <Link to="/" className="btn">
        {t('notFound.home')}
      </Link>
    </main>
  )
}
