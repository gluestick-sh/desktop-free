import { useTranslation } from 'react-i18next'
import ModalCloseButton from './ModalCloseButton'
import ModalOverlay from './ModalOverlay'
import './HelpDialog.css'

interface HelpDialogProps {
  onClose: () => void
}

interface HelpSection {
  heading: string
  items: string[]
}

function readSections(raw: unknown): HelpSection[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (s): s is HelpSection =>
        !!s &&
        typeof (s as HelpSection).heading === 'string' &&
        Array.isArray((s as HelpSection).items),
    )
    .map((s) => ({ heading: s.heading, items: s.items.filter((i) => typeof i === 'string') }))
}

export default function HelpDialog({ onClose }: HelpDialogProps) {
  const { t } = useTranslation()
  const sections = readSections(t('help.sections', { returnObjects: true }))

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="modal help-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="help-dialog-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="help-dialog-title">{t('help.title')}</h2>
          <ModalCloseButton onClick={onClose} />
        </div>
        <div className="modal-body help-dialog-body">
          <p className="help-dialog-intro">{t('help.intro')}</p>
          {sections.map((section) => (
            <section key={section.heading} className="help-dialog-section">
              <h3 className="help-dialog-heading">{section.heading}</h3>
              <ul className="help-dialog-list">
                {section.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="help-dialog-footer">
          <button type="button" className="primary" onClick={onClose}>
            {t('app.confirm')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
