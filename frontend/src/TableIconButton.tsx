import type { MouseEvent } from 'react'

interface TableIconButtonProps {
  variant?: 'default' | 'danger' | 'accent'
  title: string
  ariaLabel: string
  disabled?: boolean
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  icon: 'trash' | 'close' | 'refresh' | 'install' | 'open' | 'template' | 'manifest' | 'favorite' | 'edit'
  busy?: boolean
  hasMenu?: boolean
  active?: boolean
  className?: string
}

function Icon({ type, active }: { type: TableIconButtonProps['icon']; active?: boolean }) {
  if (type === 'open') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 3h20v16H2z" />
        <path d="M2 6.5h20" />
        <path d="M6 9.5l3 3-3 3" />
        <path d="M12 12h6.5" />
      </svg>
    )
  }
  if (type === 'install') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5.5v11M7.5 12.5L12 17l4.5-4.5" />
        <path d="M4 21.5h16" />
      </svg>
    )
  }
  if (type === 'template') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2L3 7l9 5 9-5-9-5z" />
        <path d="M3 12l9 5 9-5" />
        <path d="M12 16v6M9 19h6" />
      </svg>
    )
  }
  if (type === 'manifest') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
        <path d="M14 3v5h5M9 12h6M9 16h6" />
      </svg>
    )
  }
  if (type === 'favorite') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={active ? 'table-icon-star-filled' : undefined}>
        <path d="M12 2.5l2.76 5.59 6.17.9-4.47 4.35 1.05 6.14L12 17.3l-5.51 2.9 1.05-6.14-4.47-4.35 6.17-.9L12 2.5z" />
      </svg>
    )
  }
  if (type === 'trash') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14M10 11v6M14 11v6" />
      </svg>
    )
  }
  if (type === 'refresh') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12a8 8 0 0 1 13.5-5.5M4 4v5h5M20 12a8 8 0 0 1-13.5 5.5M20 20v-5h-5" />
      </svg>
    )
  }
  if (type === 'edit') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
        <path d="M13.5 6.5l3 3" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

export default function TableIconButton({
  variant = 'default',
  title,
  ariaLabel,
  disabled,
  onClick,
  icon,
  busy = false,
  hasMenu = false,
  active = false,
  className,
}: TableIconButtonProps) {
  return (
    <button
      type="button"
      className={[
        'table-icon-btn',
        variant === 'danger' ? 'table-icon-btn-danger' : '',
        variant === 'accent' ? 'table-icon-btn-accent' : '',
        icon === 'refresh' ? 'table-icon-btn-refresh' : '',
        icon === 'install' ? 'table-icon-btn-install' : '',
        icon === 'favorite' && active ? 'table-icon-btn-favorite-active' : '',
        hasMenu ? 'table-icon-btn-has-menu' : '',
        busy ? 'table-icon-btn-busy' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon type={icon} active={active} />
    </button>
  )
}
