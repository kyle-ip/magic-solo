import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import logMsgEn from './logMsg.en.json'

const saved =
  typeof localStorage !== 'undefined' ? localStorage.getItem('magic-solo-lang') : null

const initialLng = saved === 'zh' || saved === 'en' ? saved : 'en'

const enMerged = {
  ...en,
  challenge: { ...en.challenge, logMsg: logMsgEn },
}

const loaded = new Set<string>(['en'])

export async function ensureLocale(lng: string): Promise<void> {
  const code = lng.startsWith('zh') ? 'zh' : 'en'
  if (loaded.has(code)) return
  if (code === 'zh') {
    const [{ default: zh }, { default: logMsgZh }] = await Promise.all([
      import('./zh.json'),
      import('./logMsg.zh.json'),
    ])
    i18n.addResourceBundle(
      'zh',
      'translation',
      { ...zh, challenge: { ...zh.challenge, logMsg: logMsgZh } },
      true,
      true,
    )
  } else {
    i18n.addResourceBundle('en', 'translation', enMerged, true, true)
  }
  loaded.add(code)
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enMerged },
  },
  lng: initialLng === 'zh' ? 'en' : initialLng, // temporary if zh until loaded
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  partialBundledLanguages: true,
})

// If the user prefers Chinese, load it before first paint as much as possible.
if (initialLng === 'zh') {
  void ensureLocale('zh').then(() => {
    void i18n.changeLanguage('zh')
  })
} else {
  // Prefetch Chinese after idle so language switch is instant.
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
  ).requestIdleCallback
  const prefetch = () => {
    void ensureLocale('zh')
  }
  if (typeof ric === 'function') ric(prefetch, { timeout: 2500 })
  else setTimeout(prefetch, 800)
}

i18n.on('languageChanged', (lng) => {
  void ensureLocale(lng)
  try {
    localStorage.setItem('magic-solo-lang', lng.startsWith('zh') ? 'zh' : 'en')
    document.documentElement.lang = lng.startsWith('zh') ? 'zh-CN' : 'en'
  } catch {
    /* ignore */
  }
})

document.documentElement.lang = initialLng === 'zh' ? 'zh-CN' : 'en'

export default i18n
