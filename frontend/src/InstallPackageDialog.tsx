import { useTranslation } from 'react-i18next'
import type { main } from '../wailsjs/go/models'
import ModalCloseButton from './ModalCloseButton'
import ModalOverlay from './ModalOverlay'
import './InstallPackageDialog.css'

export type PendingInstallPlan = {
  name: string
  plan: main.InstallPlan
  force: boolean
  selectedArchitecture: string
  installMode: 'silent' | 'interactive'
  intent: 'install' | 'upgrade'
}

interface InstallPackageDialogProps {
  pending: PendingInstallPlan
  onClose: () => void
  onConfirm: () => void
  onArchitectureChange: (arch: string) => void
  onInstallModeChange: (mode: 'silent' | 'interactive') => void
  onForceChange: (force: boolean) => void
}

function installArchLabel(arch: string, t: ReturnType<typeof useTranslation>['t']) {
  switch (arch) {
    case 'arm64':
      return t('appExt.installDialog.archArm64')
    case '64bit':
      return t('appExt.installDialog.arch64bit')
    case '32bit':
      return t('appExt.installDialog.arch32bit')
    default:
      return arch
  }
}

export default function InstallPackageDialog({
  pending,
  onClose,
  onConfirm,
  onArchitectureChange,
  onInstallModeChange,
  onForceChange,
}: InstallPackageDialogProps) {
  const { t } = useTranslation()
  const { plan, force, selectedArchitecture, installMode, intent } = pending
  const isUpgrade = intent === 'upgrade'
  const manifest = plan.manifest
  const packageRef = plan.package || pending.name
  const archs = manifest?.availableArchitectures ?? []
  const hasInstallerScript = manifest?.hasInstallerScript ?? false
  const displayArch = selectedArchitecture || manifest?.architecture

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="modal install-package-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-package-dialog-title"
      >
        <div className="modal-header install-package-dialog-header">
          <h2 id="install-package-dialog-title">
            {isUpgrade ? t('appExt.installDialog.upgradeTitle') : t('appExt.installDialog.title')}
          </h2>
          <ModalCloseButton onClick={onClose} ariaLabel={t('app.cancel')} />
        </div>

        <div className="modal-body install-package-dialog-body">
          <div className="install-package-summary">
            <p className="install-package-name">{packageRef}</p>
            {(manifest?.version || displayArch) && (
              <div className="install-package-meta">
                {manifest?.version ? <span className="pill">{manifest.version}</span> : null}
                {displayArch ? <span className="pill">{installArchLabel(displayArch, t)}</span> : null}
              </div>
            )}
          </div>

          {plan.depends.length > 0 && (
            <section className="install-dialog-section">
              <h3 className="install-dialog-section-title">{t('appExt.installDialog.depsIntro')}</h3>
              <ul className="install-dialog-deps">
                {plan.depends.map((d) => (
                  <li key={d.ref}>{d.ref}</li>
                ))}
              </ul>
            </section>
          )}

          {archs.length > 1 && (
            <section className="install-dialog-section">
              <h3 className="install-dialog-section-title">{t('appExt.installDialog.archLabel')}</h3>
              <div className="install-arch-options" role="radiogroup" aria-label={t('appExt.installDialog.archLabel')}>
                {archs.map((arch) => (
                  <label key={arch} className="install-arch-option">
                    <input
                      type="radio"
                      name="install-architecture"
                      value={arch}
                      checked={selectedArchitecture === arch}
                      onChange={() => onArchitectureChange(arch)}
                    />
                    <span>{installArchLabel(arch, t)}</span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {hasInstallerScript && (
            <section className="install-dialog-section">
              <h3 className="install-dialog-section-title">{t('appExt.installDialog.installModeLabel')}</h3>
              <div
                className="install-arch-options"
                role="radiogroup"
                aria-label={t('appExt.installDialog.installModeLabel')}
              >
                <label className="install-arch-option">
                  <input
                    type="radio"
                    name="install-mode"
                    value="silent"
                    checked={installMode === 'silent'}
                    onChange={() => onInstallModeChange('silent')}
                  />
                  <span>{t('appExt.installDialog.installModeSilent')}</span>
                </label>
                <label className="install-arch-option">
                  <input
                    type="radio"
                    name="install-mode"
                    value="interactive"
                    checked={installMode === 'interactive'}
                    onChange={() => onInstallModeChange('interactive')}
                  />
                  <span>{t('appExt.installDialog.installModeInteractive')}</span>
                </label>
              </div>
              <p className="install-dialog-section-hint">
                {installMode === 'interactive'
                  ? t('appExt.installDialog.installModeInteractiveHint')
                  : t('appExt.installDialog.installModeSilentHint')}
              </p>
            </section>
          )}

          <section className="install-dialog-section">
            <label className="install-dialog-force-option">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => onForceChange(e.target.checked)}
              />
              <span>
                {isUpgrade
                  ? t('appExt.installDialog.forceUpgradeLabel')
                  : t('appExt.installDialog.forceLabel')}
              </span>
            </label>
            {force ? (
              <p className="install-dialog-section-hint">{t('appExt.installDialog.forceHint')}</p>
            ) : null}
          </section>

          {plan.suggestions?.some((s) => !s.installed) && (
            <div className="install-dialog-notices">
              <p className="install-dialog-notice">{t('appExt.installDialog.suggestHint')}</p>
            </div>
          )}
        </div>

        <div className="install-package-dialog-footer">
          {archs.length > 1 ? (
            <span
              className="install-arch-notice"
              tabIndex={0}
              aria-label={t('appExt.installDialog.archHint')}
            >
              <svg className="install-arch-notice-icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 10v6M12 7h.01"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span>{t('appExt.installDialog.archHintShort')}</span>
              <span className="install-arch-notice-tooltip" role="tooltip">
                {t('appExt.installDialog.archHint')}
              </span>
            </span>
          ) : null}
          <div className="install-package-dialog-footer-actions">
            <button type="button" className="secondary" onClick={onClose}>
              {t('app.cancel')}
            </button>
            <button type="button" className="primary" onClick={onConfirm}>
              {isUpgrade ? t('appExt.installDialog.confirmUpgrade') : t('appExt.installDialog.confirm')}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  )
}
