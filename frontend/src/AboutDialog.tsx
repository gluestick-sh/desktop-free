import { useTranslation } from 'react-i18next'
import type { main } from '../wailsjs/go/models'
import ModalCloseButton from './ModalCloseButton'
import ModalOverlay from './ModalOverlay'
import { FLATICON_ATTRIBUTION_URL, openExternalUrl } from './openExternalUrl'
import './AboutDialog.css'

interface AboutDialogProps {
  info: main.AboutInfo
  onClose: () => void
}

export default function AboutDialog({ info, onClose }: AboutDialogProps) {
  const { t } = useTranslation()

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="modal about-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="about-dialog-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="about-dialog-title">{t('about.title')}</h2>
          <ModalCloseButton onClick={onClose} />
        </div>
        <div className="modal-body about-dialog-body">
          <div className="about-dialog-app">
            <img src="/appicon.png" alt="" className="about-dialog-icon" width={64} height={64} />
            <div className="about-dialog-text">
              <p className="about-dialog-app-name">
                {t('app.title')}
                <span className="pill pro-pill about-dialog-edition-badge">{t('about.edition')}</span>
              </p>
              <p className="about-dialog-version">{t('about.version', { version: info.version })}</p>
              <p className="about-dialog-tagline">{t('about.tagline')}</p>
            </div>
          </div>

          <p className="about-dialog-attribution">
            {t('about.attribution')}
            <button
              type="button"
              className="text-link"
              title={t('about.attributionTitle')}
              onClick={(e) => openExternalUrl(FLATICON_ATTRIBUTION_URL, e)}
            >
              {t('about.attributionLink')}
            </button>
          </p>
        </div>
        <div className="about-dialog-footer">
          <button type="button" className="primary" onClick={onClose}>
            {t('app.confirm')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
