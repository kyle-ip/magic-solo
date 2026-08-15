import { useTranslation } from 'react-i18next'
import { ensureLocale } from '../i18n'

type LanguageSwitchProps = {
  /** Shorter option labels (EN / 中文) for tight toolbars. */
  compact?: boolean
  /**
   * Render as a ghost button that toggles locale (matches arena topbar `.btn` sizing).
   * Default is a native `<select>`.
   */
  asButton?: boolean
}

export function LanguageSwitch({
  compact = false,
  asButton = false,
}: LanguageSwitchProps) {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')

  const setLang = (next: string) => {
    void ensureLocale(next).then(() => i18n.changeLanguage(next))
  }

  if (asButton) {
    const label = isZh ? (compact ? '中文' : t('app.chinese')) : compact ? 'EN' : t('app.english')
    return (
      <button
        type="button"
        className="btn ghost lang-switch-btn"
        aria-label={t('app.language')}
        title={t('app.language')}
        onClick={() => setLang(isZh ? 'en' : 'zh')}
      >
        {label}
      </button>
    )
  }

  return (
    <label className={`lang-switch${compact ? ' is-compact' : ''}`}>
      <span className="sr-only">{t('app.language')}</span>
      <select
        value={isZh ? 'zh' : 'en'}
        onChange={(e) => setLang(e.target.value)}
        aria-label={t('app.language')}
      >
        <option value="en">{compact ? 'EN' : t('app.english')}</option>
        <option value="zh">{compact ? '中文' : t('app.chinese')}</option>
      </select>
    </label>
  )
}
