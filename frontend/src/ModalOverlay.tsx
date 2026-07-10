import { useEffect, type ReactNode } from 'react'

export interface ModalOverlayProps {
  onClose: () => void
  disabled?: boolean
  children: ReactNode
  className?: string
}

export default function ModalOverlay({
  onClose,
  disabled = false,
  children,
  className = 'modal-overlay',
}: ModalOverlayProps) {
  useEffect(() => {
    if (disabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, disabled])

  return (
    <div
      className={className}
      onClick={() => !disabled && onClose()}
      role="presentation"
    >
      {children}
    </div>
  )
}
