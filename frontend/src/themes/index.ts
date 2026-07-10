export * from './types'
export * from './apply'
export * from './presets'
export * from './storage'

import type { TFunction } from 'i18next'
import type { ThemeDefinition } from './types'
import { BUILTIN_THEMES, PRO_PRESET_THEMES } from './presets'
import { canUseTheme } from './storage'
import { formatThemeLabel } from './i18n'

export { formatThemeLabel } from './i18n'

export function buildThemeMenuEntries(
  t: TFunction,
  customThemes: ThemeDefinition[],
  isPro: boolean,
): Array<{ label: string; action: string; locked: boolean; pro: boolean }> {
  const free = BUILTIN_THEMES.filter((t) => t.tier === 'free')
  const proPresets = PRO_PRESET_THEMES

  const entries: Array<{ label: string; action: string; locked: boolean; pro: boolean }> = []

  for (const theme of free) {
    entries.push({
      label: formatThemeLabel(theme, t),
      action: `theme:${theme.id}`,
      locked: false,
      pro: false,
    })
  }

  entries.push({ label: '---', action: 'separator', locked: false, pro: false })

  const proSuffix = t('theme.menu.proSuffix')
  for (const theme of proPresets) {
    const locked = !canUseTheme(theme.id, isPro)
    const name = formatThemeLabel(theme, t)
    entries.push({
      label: locked ? `${name}${proSuffix}` : name,
      action: `theme:${theme.id}`,
      locked,
      pro: true,
    })
  }

  if (customThemes.length > 0) {
    entries.push({ label: '---', action: 'separator', locked: false, pro: false })
    for (const theme of customThemes) {
      const locked = !isPro
      const name = formatThemeLabel(theme, t)
      entries.push({
        label: locked ? `${name}${proSuffix}` : name,
        action: `theme:${theme.id}`,
        locked,
        pro: true,
      })
    }
  }

  entries.push({ label: '---', action: 'separator', locked: false, pro: false })
  entries.push({
    label: t('theme.menu.browse'),
    action: 'theme:browse',
    locked: false,
    pro: false,
  })
  entries.push({
    label: isPro ? t('theme.menu.custom') : t('theme.menu.customPro'),
    action: 'theme:custom-edit',
    locked: !isPro,
    pro: true,
  })

  return entries
}
