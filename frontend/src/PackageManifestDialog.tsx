import { useTranslation } from 'react-i18next'
import type { main } from '../wailsjs/go/models'
import ModalCloseButton from './ModalCloseButton'
import ModalOverlay from './ModalOverlay'
import PackageManifestPanel from './PackageManifestPanel'
import './PackageManifestPanel.css'

interface PackageManifestDialogProps {
  packageRef: string
  manifest: main.InstallManifestInfo
  onClose: () => void
}

export default function PackageManifestDialog({
  packageRef,
  manifest,
  onClose,
}: PackageManifestDialogProps) {
  const { t } = useTranslation()
  const version = manifest.version
  const architecture = manifest.architecture

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="modal package-manifest-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="package-manifest-dialog-title"
      >
        <div className="modal-header package-manifest-dialog-header">
          <div className="package-manifest-dialog-title-row">
            <h2 id="package-manifest-dialog-title">{t('package.manifest.viewTitle')}</h2>
            <ModalCloseButton onClick={onClose} ariaLabel={t('common.dismiss')} />
          </div>
          <div className="package-manifest-dialog-ref-row">
            <p className="package-manifest-dialog-ref">{packageRef}</p>
            {(version || architecture) && (
              <div className="package-manifest-dialog-badges">
                {version ? <span className="pill">{version}</span> : null}
                {architecture ? <span className="pill">{architecture}</span> : null}
              </div>
            )}
          </div>
        </div>
        <div className="modal-body package-manifest-dialog-body">
          <PackageManifestPanel
            manifest={manifest}
            packageRef={packageRef}
            alwaysExpanded
          />
        </div>
        <div className="package-manifest-dialog-footer">
          <button type="button" className="primary" onClick={onClose}>
            {t('app.close')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
