import type { ThemeDefinition, ThemeId } from './types'
import { isValidThemeTokens } from './apply'
import { getBuiltinTheme } from './presets'
import type { BuiltinThemeId } from './types'

export const THEME_STORAGE_KEY = 'gluestick-desktop-theme'
export const CUSTOM_THEMES_STORAGE_KEY = 'gluestick-desktop-custom-themes'

const BUILTIN_IDS = new Set<string>([
  'dark', 'light', 'midnight', 'forest', 'dracula', 'nord', 'rose', 'solarized',
  'high-contrast', 'retro',
])

export function isProLicensed(): boolean {
  return false
}

export function canUseTheme(id: ThemeId, isPro: boolean): boolean {
  if (id === 'dark' || id === 'light') return true
  return isPro
}

export function loadCustomThemes(): ThemeDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is ThemeDefinition => {
      if (!item || typeof item !== 'object') return false
      const t = item as ThemeDefinition
      return (
        typeof t.id === 'string' &&
        t.id.startsWith('custom:') &&
        typeof t.name === 'string' &&
        t.tier === 'pro' &&
        isValidThemeTokens(t.tokens)
      )
    })
  } catch {
    return []
  }
}

export function saveCustomThemes(themes: ThemeDefinition[]): void {
  localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(themes))
}

export function loadStoredThemeId(): ThemeId {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (!stored) return 'dark'
  if (stored === 'light' || BUILTIN_IDS.has(stored)) return stored as ThemeId
  if (stored.startsWith('custom:')) return stored as ThemeId
  return 'dark'
}

export function saveThemeId(id: ThemeId): void {
  localStorage.setItem(THEME_STORAGE_KEY, id)
}

export function resolveTheme(id: ThemeId, customThemes: ThemeDefinition[]): ThemeDefinition | null {
  if (id.startsWith('custom:')) {
    return customThemes.find((t) => t.id === id) ?? null
  }
  if (BUILTIN_IDS.has(id)) {
    return getBuiltinTheme(id as BuiltinThemeId)
  }
  return null
}

export function sanitizeThemeIdOnLoad(
  id: ThemeId,
  customThemes: ThemeDefinition[],
  isPro: boolean,
): ThemeId {
  const theme = resolveTheme(id, customThemes)
  if (!theme) return 'dark'
  if (!canUseTheme(id, isPro)) return 'dark'
  return id
}
