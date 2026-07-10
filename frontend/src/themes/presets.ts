import type { BuiltinThemeId, ThemeDefinition, ThemeTokens } from './types'
import { createThemeFromTokens } from './apply'

const darkTokens: ThemeTokens = {
  'bg-primary': '#1a1a2e',
  'bg-secondary': '#16213e',
  'bg-tertiary': '#0f3460',
  'bg-card': '#1f2937',
  'text-primary': '#f8fafc',
  'text-secondary': '#94a3b8',
  'text-tertiary': '#64748b',
  'accent': '#3b82f6',
  'accent-hover': '#2563eb',
  'success': '#22c55e',
  'warning': '#f59e0b',
  'danger': '#ef4444',
  'border': '#334155',
  'border-light': '#475569',
}

const lightTokens: ThemeTokens = {
  'bg-primary': '#f1f5f9',
  'bg-secondary': '#ffffff',
  'bg-tertiary': '#e2e8f0',
  'bg-card': '#ffffff',
  'text-primary': '#0f172a',
  'text-secondary': '#475569',
  'text-tertiary': '#94a3b8',
  'accent': '#2563eb',
  'accent-hover': '#1d4ed8',
  'success': '#16a34a',
  'warning': '#d97706',
  'danger': '#dc2626',
  'border': '#cbd5e1',
  'border-light': '#94a3b8',
}

/** Neutral placeholder for locked Pro theme cards — real Pro palettes are not shipped. */
const proLockedPlaceholder: ThemeTokens = {
  'bg-primary': '#1e1e1e',
  'bg-secondary': '#2a2a2a',
  'bg-tertiary': '#333333',
  'bg-card': '#2a2a2a',
  'text-primary': '#e5e5e5',
  'text-secondary': '#a3a3a3',
  'text-tertiary': '#737373',
  'accent': '#737373',
  'accent-hover': '#525252',
  'success': '#737373',
  'warning': '#737373',
  'danger': '#737373',
  'border': '#404040',
  'border-light': '#525252',
}

const FREE_THEMES: ThemeDefinition[] = [
  createThemeFromTokens('dark', 'Dark', 'free', darkTokens),
  createThemeFromTokens('light', 'Light', 'free', lightTokens),
]

/** Pro theme menu/picker entries (UI upsell only; no curated palettes). */
export const PRO_PRESET_THEMES: ThemeDefinition[] = [
  createThemeFromTokens('midnight', 'Midnight blue', 'pro', proLockedPlaceholder),
  createThemeFromTokens('forest', 'Forest green', 'pro', proLockedPlaceholder),
  createThemeFromTokens('dracula', 'Dracula', 'pro', proLockedPlaceholder),
  createThemeFromTokens('nord', 'Nord', 'pro', proLockedPlaceholder),
  createThemeFromTokens('rose', 'Rose pink', 'pro', proLockedPlaceholder),
  createThemeFromTokens('solarized', 'Solarized', 'pro', proLockedPlaceholder),
  createThemeFromTokens('high-contrast', 'High contrast', 'pro', proLockedPlaceholder),
  createThemeFromTokens('retro', 'Terminal green', 'pro', proLockedPlaceholder),
]

export const BUILTIN_THEMES: ThemeDefinition[] = [...FREE_THEMES, ...PRO_PRESET_THEMES]

export const BUILTIN_THEME_MAP = new Map(
  BUILTIN_THEMES.map((theme) => [theme.id as BuiltinThemeId, theme]),
)

export function getBuiltinTheme(id: BuiltinThemeId): ThemeDefinition {
  return BUILTIN_THEME_MAP.get(id) ?? BUILTIN_THEME_MAP.get('dark')!
}
