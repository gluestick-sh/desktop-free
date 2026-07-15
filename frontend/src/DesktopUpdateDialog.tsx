import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { main } from '../wailsjs/go/models'
import { EventsOn } from '../wailsjs/runtime/runtime'
import ModalCloseButton from './ModalCloseButton'
import ModalOverlay from './ModalOverlay'
import './DesktopUpdateDialog.css'

interface DesktopUpdateDialogProps {
  info: main.DesktopUpdateInfo
  directInstall: boolean
  onDownload: () => void
  onRemindLater: () => void
  onSkip: () => void
  onClose: () => void
}

type DownloadPhase = 'idle' | 'downloading' | 'launched' | 'error'

export default function DesktopUpdateDialog({
  info,
  directInstall,
  onDownload,
  onRemindLater,
  onSkip,
  onClose,
}: DesktopUpdateDialogProps) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<DownloadPhase>('idle')
  const [percent, setPercent] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!directInstall) return
    const offStart = EventsOn('desktop-update:download:start', () => {
      setPhase('downloading')
      setPercent(0)
      setErrorMsg('')
    })
    const offProgress = EventsOn('desktop-update:download:progress', (data?: { percent?: number }) => {
      setPhase('downloading')
      setPercent(Math.min(100, Math.max(0, Math.round(data?.percent ?? 0))))
    })
    const offError = EventsOn('desktop-update:download:error', (data?: { error?: string }) => {
      setPhase('error')
      setErrorMsg((data?.error || '').trim())
    })
    const offComplete = EventsOn('desktop-update:download:complete', () => {
      setPhase('launched')
      setPercent(100)
    })
    return () => {
      offStart()
      offProgress()
      offError()
      offComplete()
    }
  }, [directInstall])

  const downloading = phase === 'downloading'
  const launched = phase === 'launched'
  const busy = downloading

  const downloadLabel = downloading
    ? t('desktopUpdate.downloading')
    : phase === 'error'
      ? t('desktopUpdate.retryDownload')
      : t('desktopUpdate.download')

  return (
    <ModalOverlay onClose={busy ? () => {} : onClose}>
      <div
        className="modal desktop-update-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="desktop-update-dialog-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="desktop-update-dialog-title">{t('desktopUpdate.title')}</h2>
          <ModalCloseButton onClick={onClose} ariaLabel={t('app.close')} disabled={busy} />
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
          {launched ? (
            <p className="desktop-update-dialog-hint">{t('desktopUpdate.launchedHint')}</p>
          ) : (
            <p className="desktop-update-dialog-hint">
              {directInstall ? t('desktopUpdate.downloadRunHint') : t('desktopUpdate.downloadHint')}
            </p>
          )}
          {downloading ? (
            <div className="desktop-update-dialog-progress" role="status" aria-live="polite">
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
              </div>
              <span className="desktop-update-dialog-progress-text">{percent}%</span>
            </div>
          ) : null}
          {phase === 'error' && errorMsg ? (
            <p className="desktop-update-dialog-error">{t('desktopUpdate.downloadFailed', { error: errorMsg })}</p>
          ) : null}
        </div>
        <div className="desktop-update-dialog-footer">
          {launched ? (
            <button type="button" className="primary" onClick={onClose}>
              {t('app.close')}
            </button>
          ) : (
            <>
              <button type="button" className="primary" onClick={onDownload} disabled={busy}>
                {downloadLabel}
              </button>
              <button type="button" onClick={onRemindLater} disabled={busy}>
                {t('desktopUpdate.remindLater')}
              </button>
              <button type="button" onClick={onSkip} disabled={busy}>
                {t('desktopUpdate.skipVersion')}
              </button>
            </>
          )}
        </div>
      </div>
    </ModalOverlay>
  )
}
