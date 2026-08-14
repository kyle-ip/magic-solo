import { useTranslation } from 'react-i18next'
import { ensureLocale } from '../i18n'

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
        onChange={(e) => {
          const next = e.target.value
          void ensureLocale(next).then(() => i18n.changeLanguage(next))
        }}
        aria-label={t('app.language')}
      >
        <option value="en">{compact ? 'EN' : t('app.english')}</option>
        <option value="zh">{compact ? '中文' : t('app.chinese')}</option>
      </select>
    </label>
  )
}
