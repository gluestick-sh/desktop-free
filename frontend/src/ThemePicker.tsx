import { useTranslation } from 'react-i18next'
import ModalCloseButton from './ModalCloseButton'
import ModalOverlay from './ModalOverlay'
import {
  BUILTIN_THEMES,
  canUseTheme,
  formatThemeLabel,
  type ThemeDefinition,
  type ThemeId,
} from './themes'
import './ThemePicker.css'

interface ThemePickerProps {
  themeId: ThemeId
  isPro: boolean
  customThemes: ThemeDefinition[]
  onSelect: (id: ThemeId) => void
  onEditCustom: (theme: ThemeDefinition) => void
  onDeleteCustom: (id: ThemeId) => void
  onCreateCustom: () => void
  onUpgrade: () => void
  onClose: () => void
}

function ThemeSwatch({ theme }: { theme: ThemeDefinition }) {
  const { tokens } = theme
  return (
    <div className="theme-swatch" aria-hidden="true">
      <span style={{ background: tokens['bg-primary'] }} />
      <span style={{ background: tokens['bg-secondary'] }} />
      <span style={{ background: tokens.accent }} />
      <span style={{ background: tokens['text-primary'] }} />
    </div>
  )
}

function ThemeCard({
  theme,
  selected,
  locked,
  onSelect,
  onEdit,
  onDelete,
}: {
  theme: ThemeDefinition
  selected: boolean
  locked: boolean
  onSelect: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const isCustom = theme.id.startsWith('custom:')
  const label = formatThemeLabel(theme, t)

  return (
    <div className={`theme-card${selected ? ' selected' : ''}${locked ? ' locked' : ''}`}>
      <button
        type="button"
        className="theme-card-main"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={locked ? t('pro.themeExclusive', { name: label }) : label}
      >
        <ThemeSwatch theme={theme} />
        <span className="theme-card-name">{label}</span>
        {theme.tier === 'pro' && <span className="theme-card-pro">{t('pro.badge')}</span>}
        {selected && <span className="theme-card-check" aria-hidden="true">✓</span>}
        {locked && <span className="theme-card-lock" aria-hidden="true">🔒</span>}
      </button>
      {isCustom && !locked && (onEdit || onDelete) && (
        <div className="theme-card-actions">
          {onEdit && (
            <button type="button" className="ghost" onClick={onEdit}>{t('theme.picker.edit')}</button>
          )}
          {onDelete && (
            <button type="button" className="ghost theme-card-delete" onClick={onDelete}>{t('theme.picker.delete')}</button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ThemePicker({
  themeId,
  isPro,
  customThemes,
  onSelect,
  onEditCustom,
  onDeleteCustom,
  onCreateCustom,
  onUpgrade,
  onClose,
}: ThemePickerProps) {
  const { t } = useTranslation()
  const freeThemes = BUILTIN_THEMES.filter((th) => th.tier === 'free')
  const proThemes = BUILTIN_THEMES.filter((th) => th.tier === 'pro')

  const handleSelect = (theme: ThemeDefinition) => {
    if (!canUseTheme(theme.id, isPro)) {
      onUpgrade()
      return
    }
    onSelect(theme.id)
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="modal theme-picker-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="theme-picker-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="theme-picker-title">{t('theme.picker.title')}</h2>
          <ModalCloseButton onClick={onClose} ariaLabel={t('app.close')} />
        </div>
        <div className="modal-body theme-picker-body">
          <section className="theme-picker-section">
            <h3>{t('theme.picker.free')}</h3>
            <div className="theme-picker-grid">
              {freeThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  selected={themeId === theme.id}
                  locked={false}
                  onSelect={() => handleSelect(theme)}
                />
              ))}
            </div>
          </section>

          <section className="theme-picker-section">
            <h3>{t('theme.picker.pro')}</h3>
            <div className="theme-picker-grid">
              {proThemes.map((theme) => {
                const locked = !canUseTheme(theme.id, isPro)
                return (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    selected={themeId === theme.id}
                    locked={locked}
                    onSelect={() => handleSelect(theme)}
                  />
                )
              })}
            </div>
          </section>

          {(customThemes.length > 0 || isPro) && (
            <section className="theme-picker-section">
              <h3>{t('theme.picker.custom')}</h3>
              {customThemes.length === 0 ? (
                <p className="theme-picker-empty">{t('theme.picker.empty')}</p>
              ) : (
                <div className="theme-picker-grid">
                  {customThemes.map((theme) => {
                    const locked = !isPro
                    return (
                      <ThemeCard
                        key={theme.id}
                        theme={theme}
                        selected={themeId === theme.id}
                        locked={locked}
                        onSelect={() => handleSelect(theme)}
                        onEdit={locked ? undefined : () => onEditCustom(theme)}
                        onDelete={locked ? undefined : () => onDeleteCustom(theme.id)}
                      />
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </div>
        <div className="modal-footer">
          {isPro ? (
            <button type="button" className="primary" onClick={onCreateCustom}>
              {t('theme.picker.createCustom')}
            </button>
          ) : (
            <button type="button" className="primary" onClick={onUpgrade}>
              {t('theme.picker.upgradeUnlock')}
            </button>
          )}
          <button type="button" className="secondary" onClick={onClose}>{t('theme.picker.close')}</button>
        </div>
      </div>
    </ModalOverlay>
  )
}
