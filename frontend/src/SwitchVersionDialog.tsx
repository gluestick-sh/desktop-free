import { Trans, useTranslation } from 'react-i18next'
import ModalCloseButton from './ModalCloseButton'
import ModalOverlay from './ModalOverlay'

interface SwitchVersionDialogProps {
  packageName: string
  version: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function SwitchVersionDialog({
  packageName,
  version,
  busy = false,
  onClose,
  onConfirm,
}: SwitchVersionDialogProps) {
  const { t } = useTranslation()

  return (
    <ModalOverlay onClose={onClose} disabled={busy}>
      <div
        className="modal activity-delete-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="switch-version-dialog-title"
      >
        <div className="modal-header">
          <h2 id="switch-version-dialog-title">{t('installedExt.versions.switchDialogTitle')}</h2>
          <ModalCloseButton onClick={onClose} ariaLabel={t('app.cancel')} disabled={busy} />
        </div>
        <div className="modal-body">
          <p>
            <Trans
              i18nKey="installedExt.versions.switchConfirm"
              values={{ name: packageName, version }}
              components={{ strong: <strong /> }}
            />
          </p>
          <p className="installed-version-switch-note">{t('installedExt.versions.switchNote')}</p>
        </div>
        <div className="activity-delete-dialog-footer">
          <button type="button" className="secondary" disabled={busy} onClick={onClose}>
            {t('app.cancel')}
          </button>
          <button type="button" className="primary" disabled={busy} onClick={onConfirm}>
            {busy ? t('installedExt.versions.switching') : t('installedExt.versions.confirmSwitch')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
