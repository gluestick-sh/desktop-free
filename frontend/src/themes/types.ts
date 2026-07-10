export const THEME_TOKEN_KEYS = [
  'bg-primary',
  'bg-secondary',
  'bg-tertiary',
  'bg-card',
  'text-primary',
  'text-secondary',
  'text-tertiary',
  'accent',
  'accent-hover',
  'success',
  'warning',
  'danger',
  'border',
  'border-light',
] as const

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number]

export type ThemeTokens = Record<ThemeTokenKey, string>

export type BuiltinThemeId =
  | 'dark'
  | 'light'
  | 'midnight'
  | 'forest'
  | 'dracula'
  | 'nord'
  | 'rose'
  | 'solarized'
  | 'high-contrast'
  | 'retro'

export type ThemeId = BuiltinThemeId | `custom:${string}`

export interface ThemeDefinition {
  id: ThemeId
  name: string
  tier: 'free' | 'pro'
  tokens: ThemeTokens
}

export const MAX_CUSTOM_THEMES = 5
