export * from './types'
export * from './apply'
export * from './presets'
export * from './storage'

import type { TFunction } from 'i18next'
import type { ThemeDefinition } from './types'
import { BUILTIN_THEMES } from './presets'
import { formatThemeLabel } from './i18n'

export { formatThemeLabel } from './i18n'

export function buildThemeMenuEntries(
  t: TFunction,
  customThemes: ThemeDefinition[],
): Array<{ label: string; action: string; locked: boolean }> {
  const entries: Array<{ label: string; action: string; locked: boolean }> = []

  for (const theme of BUILTIN_THEMES) {
    entries.push({
      label: formatThemeLabel(theme, t),
      action: `theme:${theme.id}`,
      locked: false,
    })
  }

  if (customThemes.length > 0) {
    entries.push({ label: '---', action: 'separator', locked: false })
    for (const theme of customThemes) {
      entries.push({
        label: formatThemeLabel(theme, t),
        action: `theme:${theme.id}`,
        locked: false,
      })
    }
  }

  entries.push({ label: '---', action: 'separator', locked: false })
  entries.push({
    label: t('theme.menu.browse'),
    action: 'theme:browse',
    locked: false,
  })
  entries.push({
    label: t('theme.menu.custom'),
    action: 'theme:custom-edit',
    locked: false,
  })

  return entries
}
