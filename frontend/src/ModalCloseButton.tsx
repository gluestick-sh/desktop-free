import { useTranslation } from 'react-i18next'

interface ModalCloseButtonProps {
  onClick: () => void
  disabled?: boolean
  ariaLabel?: string
}

export default function ModalCloseButton({
  onClick,
  disabled,
  ariaLabel,
}: ModalCloseButtonProps) {
  const { t } = useTranslation()
  const label = ariaLabel ?? t('app.close')
  return (
    <button
      type="button"
      className="modal-close-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  )
}
