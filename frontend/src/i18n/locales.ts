/** Supported UI locales (BCP 47). Keep in sync with src/i18n/locales/*.json. */
export const APP_LOCALES = [
  'en-US',
  'zh-CN',
  'zh-TW',
  'ja-JP',
  'ko-KR',   
  'de-DE',
  'es-ES', 
  'fr-FR',
  'vi-VN',
] as const

export type AppLocale = (typeof APP_LOCALES)[number]

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value)
}

/** Native language names shown in the Language menu (not translated). */
export const LOCALE_NATIVE_NAMES: Record<AppLocale, string> = { 
  'en-US': 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',  
  'ja-JP': '日本語',
  'ko-KR': '한국어',
  'de-DE': 'Deutsch', 
  'es-ES': 'Español',
  'fr-FR': 'Français',
  'vi-VN': 'Tiếng Việt',
}
