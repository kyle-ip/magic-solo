import { useTranslation } from 'react-i18next'

type LanguageSwitchProps = {
  /** Shorter option labels (EN / 中文) for tight toolbars. */
  compact?: boolean
}

export function LanguageSwitch({ compact = false }: LanguageSwitchProps) {
  const { t, i18n } = useTranslation()

  return (
    <label className={`lang-switch${compact ? ' is-compact' : ''}`}>
      <span className="sr-only">{t('app.language')}</span>
      <select
        value={i18n.language.startsWith('zh') ? 'zh' : 'en'}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        aria-label={t('app.language')}
      >
        <option value="en">{compact ? 'EN' : t('app.english')}</option>
        <option value="zh">{compact ? '中文' : t('app.chinese')}</option>
      </select>
    </label>
  )
}
