import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { APP_LOCALES, isAppLocale, type AppLocale } from './locales'
import enUS from './locales/en-US.json'
import zhCN from './locales/zh-CN.json'
import zhTW from './locales/zh-TW.json'
import jaJP from './locales/ja-JP.json'
import koKR from './locales/ko-KR.json'
import viVN from './locales/vi-VN.json'
import frFR from './locales/fr-FR.json'
import deDE from './locales/de-DE.json'
import esES from './locales/es-ES.json'

const LOCALE_STORAGE_KEY = 'glue.locale'

const LOCALE_RESOURCES: Record<AppLocale, object> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'vi-VN': viVN,
  'fr-FR': frFR,
  'de-DE': deDE,
  'es-ES': esES,
}

const BROWSER_LOCALE_MAP: Record<string, AppLocale> = {
  en: 'en-US',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  vi: 'vi-VN',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
}

function detectLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && isAppLocale(stored)) {
      return stored
    }
  } catch {
    /* ignore */
  }
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const raw of langs) {
      if (!raw) continue
      if (isAppLocale(raw)) return raw
      const lower = raw.toLowerCase()
      if (lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.startsWith('zh-hant')) {
        return 'zh-TW'
      }
      if (lower.startsWith('zh-cn') || lower.startsWith('zh-hans') || lower === 'zh') {
        return 'zh-CN'
      }
      const base = lower.split('-')[0]
      const mapped = BROWSER_LOCALE_MAP[base]
      if (mapped) return mapped
    }
  } catch {
    /* ignore */
  }
  return 'en-US'
}

void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    APP_LOCALES.map((code) => [code, { translation: LOCALE_RESOURCES[code] }]),
  ),
  lng: detectLocale(),
  fallbackLng: 'en-US',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})

export function setAppLocale(locale: AppLocale) {
  void i18n.changeLanguage(locale)
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
}

export function getAppLocale(): AppLocale {
  return isAppLocale(i18n.language) ? i18n.language : 'en-US'
}

export { APP_LOCALES, isAppLocale, type AppLocale } from './locales'
export default i18n
