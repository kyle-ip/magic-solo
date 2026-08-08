import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import zh from './zh.json'
import logMsgEn from './logMsg.en.json'
import logMsgZh from './logMsg.zh.json'

const saved =
  typeof localStorage !== 'undefined' ? localStorage.getItem('magic-solo-lang') : null

const enMerged = {
  ...en,
  challenge: { ...en.challenge, logMsg: logMsgEn },
}
const zhMerged = {
  ...zh,
  challenge: { ...zh.challenge, logMsg: logMsgZh },
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enMerged },
    zh: { translation: zhMerged },
  },
  lng: saved === 'zh' || saved === 'en' ? saved : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('magic-solo-lang', lng.startsWith('zh') ? 'zh' : 'en')
    document.documentElement.lang = lng.startsWith('zh') ? 'zh-CN' : 'en'
  } catch {
    /* ignore */
  }
})

document.documentElement.lang = i18n.language.startsWith('zh') ? 'zh-CN' : 'en'

export default i18n
