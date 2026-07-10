import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { GetDownloadWorkers, SetDownloadWorkers } from '../wailsjs/go/main/App'
import ModalCloseButton from './ModalCloseButton'
import ModalOverlay from './ModalOverlay'
import './DownloadWorkersDialog.css'

interface DownloadWorkersDialogProps {
  onClose: () => void
  onSaved?: (message: string) => void
  onError?: (message: string) => void
}

export default function DownloadWorkersDialog({ onClose, onSaved, onError }: DownloadWorkersDialogProps) {
  const { t } = useTranslation()
  const [workers, setWorkers] = useState(4)
  const [minWorkers, setMinWorkers] = useState(2)
  const [maxWorkers, setMaxWorkers] = useState(8)
  const [step, setStep] = useState(2)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const onCloseRef = useRef(onClose)
  const onErrorRef = useRef(onError)

  onCloseRef.current = onClose
  onErrorRef.current = onError

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const cfg = await GetDownloadWorkers()
        if (cancelled) return
        setWorkers(cfg?.workers ?? 4)
        setMinWorkers(cfg?.minWorkers ?? 2)
        setMaxWorkers(cfg?.maxWorkers ?? 8)
        setStep(cfg?.step ?? 2)
      } catch (err) {
        if (cancelled) return
        onErrorRef.current?.(t('settings.downloadWorkers.loadFailed', { error: String(err) }))
        onCloseRef.current()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [t])

  const handleSave = async () => {
    setSaving(true)
    try {
      await SetDownloadWorkers(workers)
      onSaved?.(t('settings.downloadWorkers.saved', { count: workers }))
      onClose()
    } catch (err) {
      onError?.(t('settings.downloadWorkers.saveFailed', { error: String(err) }))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setWorkers(4)
    setSaving(true)
    try {
      await SetDownloadWorkers(4)
      onSaved?.(t('settings.downloadWorkers.resetSaved'))
      onClose()
    } catch (err) {
      onError?.(t('settings.downloadWorkers.saveFailed', { error: String(err) }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} disabled={saving}>
      <div
        className="modal download-workers-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="download-workers-dialog-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="download-workers-dialog-title">{t('settings.downloadWorkers.title')}</h2>
          <ModalCloseButton disabled={saving} onClick={onClose} ariaLabel={t('app.close')} />
        </div>
        <div className="modal-body download-workers-dialog-body">
          <div className="settings-dialog-content" aria-busy={loading}>
            {loading ? (
              <p className="settings-dialog-loading">{t('app.loading')}</p>
            ) : (
              <>
                <p className="download-workers-hint">
                  <Trans i18nKey="settings.downloadWorkers.hint" components={{ code: <code /> }} />
                </p>
                <div className="download-workers-control">
                  <label className="download-workers-label" htmlFor="download-workers-range">
                    {t('settings.downloadWorkers.countLabel', { count: workers })}
                  </label>
                  <input
                    id="download-workers-range"
                    type="range"
                    className="download-workers-range"
                    min={minWorkers}
                    max={maxWorkers}
                    step={step}
                    value={workers}
                    onChange={(e) => setWorkers(Number(e.target.value))}
                    disabled={saving}
                    aria-valuemin={minWorkers}
                    aria-valuemax={maxWorkers}
                    aria-valuenow={workers}
                  />
                  <div className="download-workers-ticks" aria-hidden="true">
                    {Array.from({ length: (maxWorkers - minWorkers) / step + 1 }, (_, i) => {
                      const n = minWorkers + i * step
                      return (
                        <span key={n} className={n === workers ? 'is-active' : undefined}>
                          {n}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="download-workers-dialog-footer">
          <button
            type="button"
            className="secondary download-workers-reset"
            disabled={loading || saving}
            onClick={handleReset}
          >
            {t('settings.downloadWorkers.resetDefault')}
          </button>
          <div className="download-workers-dialog-footer-actions">
            <button type="button" className="secondary" disabled={saving} onClick={onClose}>
              {t('app.cancel')}
            </button>
            <button type="button" className="primary" disabled={loading || saving} onClick={handleSave}>
              {saving ? t('settings.downloadWorkers.saving') : t('settings.downloadWorkers.save')}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  )
}
