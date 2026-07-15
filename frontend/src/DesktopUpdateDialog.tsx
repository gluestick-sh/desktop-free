import { useTranslation } from 'react-i18next'
import type { main } from '../wailsjs/go/models'
import ModalCloseButton from './ModalCloseButton'
import ModalOverlay from './ModalOverlay'
import './DesktopUpdateDialog.css'

interface DesktopUpdateDialogProps {
  info: main.DesktopUpdateInfo
  onDownload: () => void
  onRemindLater: () => void
  onSkip: () => void
  onClose: () => void
}

export default function DesktopUpdateDialog({
  info,
  onDownload,
  onRemindLater,
  onSkip,
  onClose,
}: DesktopUpdateDialogProps) {
  const { t } = useTranslation()

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="modal desktop-update-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="desktop-update-dialog-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="desktop-update-dialog-title">{t('desktopUpdate.title')}</h2>
          <ModalCloseButton onClick={onClose} ariaLabel={t('app.close')} />
        </div>
        <div className="modal-body desktop-update-dialog-body">
          <p className="desktop-update-dialog-summary">
            {t('desktopUpdate.summary', {
              current: info.currentVersion,
              latest: info.latestVersion,
            })}
          </p>
          {info.releaseNotes ? (
            <pre className="desktop-update-dialog-notes">{info.releaseNotes}</pre>
          ) : null}
          <p className="desktop-update-dialog-hint">{t('desktopUpdate.downloadHint')}</p>
        </div>
        <div className="desktop-update-dialog-footer">
          <button type="button" className="primary" onClick={onDownload}>
            {t('desktopUpdate.download')}
          </button>
          <button type="button" onClick={onRemindLater}>
            {t('desktopUpdate.remindLater')}
          </button>
          <button type="button" onClick={onSkip}>
            {t('desktopUpdate.skipVersion')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
