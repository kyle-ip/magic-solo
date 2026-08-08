import { useTranslation } from 'react-i18next'

export function LanguageSwitch() {
  const { t, i18n } = useTranslation()

  return (
    <label className="lang-switch">
      <span className="sr-only">{t('app.language')}</span>
      <select
        value={i18n.language.startsWith('zh') ? 'zh' : 'en'}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        aria-label={t('app.language')}
      >
        <option value="en">{t('app.english')}</option>
        <option value="zh">{t('app.chinese')}</option>
      </select>
    </label>
  )
}
