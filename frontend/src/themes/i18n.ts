import type { TFunction } from 'i18next'
import type { ThemeDefinition } from './types'

/** Display name for a theme; built-in presets use `theme.builtin.*` locale keys. */
export function formatThemeLabel(theme: ThemeDefinition, t: TFunction): string {
  if (theme.id.startsWith('custom:')) {
    return theme.name
  }
  const key = `theme.builtin.${theme.id}`
  return t(key, { defaultValue: theme.name })
}
