import { useTranslation } from 'react-i18next'
import type { main } from '../wailsjs/go/models'
import ModalCloseButton from './ModalCloseButton'
import PackageManifestPanel from './PackageManifestPanel'
import './BrowseManifestPanel.css'

interface BrowseManifestPanelProps {
  packageRef: string
  manifest: main.InstallManifestInfo
  onClose: () => void
  onManifestUpdated?: () => void | Promise<void>
}

export default function BrowseManifestPanel({
  packageRef,
  manifest,
  onClose,
  onManifestUpdated,
}: BrowseManifestPanelProps) {
  const { t } = useTranslation()

  return (
    <section className="browse-manifest-panel" aria-label={t('package.manifest.viewTitle')}>
      <div className="browse-manifest-panel-header">
        <div className="browse-manifest-panel-heading">
          <h3 className="browse-manifest-panel-title">{t('package.manifest.viewTitle')}</h3>
          <p className="browse-manifest-panel-ref">{packageRef}</p>
        </div>
        <ModalCloseButton onClick={onClose} ariaLabel={t('common.dismiss')} />
      </div>
      <div className="browse-manifest-panel-body">
        <PackageManifestPanel
          manifest={manifest}
          packageRef={packageRef}
          alwaysExpanded
          editable
          onManifestUpdated={onManifestUpdated}
        />
      </div>
    </section>
  )
}
