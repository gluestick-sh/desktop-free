import { useTranslation } from 'react-i18next'
import TableIconButton from './TableIconButton'

interface PackageInstallButtonProps {
  packageName: string
  mode?: 'install' | 'upgrade'
  title?: string
  busy?: boolean
  disabled?: boolean
  onInstall: () => void
}

export default function PackageInstallButton({
  packageName,
  mode = 'install',
  title,
  busy = false,
  disabled,
  onInstall,
}: PackageInstallButtonProps) {
  const { t } = useTranslation()

  const isUpgrade = mode === 'upgrade'
  const busyLabel = isUpgrade ? t('package.install.upgrading') : t('package.install.installing')
  const actionLabel = isUpgrade ? t('package.install.upgrade') : t('package.install.install')
  const defaultTitle = busy ? busyLabel : actionLabel
  const buttonTitle = title ?? defaultTitle

  return (
    <TableIconButton
      icon="install"
      variant="accent"
      title={buttonTitle}
      ariaLabel={
        busy
          ? (isUpgrade
              ? t('package.install.busyUpgradeAria', { name: packageName })
              : t('package.install.busyInstallAria', { name: packageName }))
          : t('package.install.actionAria', { action: actionLabel, name: packageName })
      }
      disabled={disabled}
      busy={busy}
      onClick={(e) => {
        e.stopPropagation()
        if (disabled || busy) {
          return
        }
        onInstall()
      }}
    />
  )
}
