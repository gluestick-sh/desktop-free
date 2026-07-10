import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { GetGitHubProxy, SetGitHubProxy } from '../wailsjs/go/main/App'
import ModalCloseButton from './ModalCloseButton'
import ModalOverlay from './ModalOverlay'
import './GitHubProxyDialog.css'

interface GitHubProxyDialogProps {
  onClose: () => void
  onSaved?: (message: string) => void
  onError?: (message: string) => void
}

const SAMPLE_GITHUB_URL = 'https://github.com/scoopinstaller/scoop/archive/master.zip'

const MIRROR_PRESETS = [
  'https://ghproxy.net/',
  'https://mirror.ghproxy.com/',
  'https://gh.ddlc.top/',
  'https://ghps.cc/',
] as const

function parseProxies(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function joinProxies(list: string[]): string {
  return list.join(', ')
}

function buildMirrorURL(proxy: string, original: string): string {
  const trimmed = proxy.trim()
  if (!trimmed) return original
  return `${trimmed.replace(/\/+$/, '')}/${original}`
}

export default function GitHubProxyDialog({ onClose, onSaved, onError }: GitHubProxyDialogProps) {
  const { t } = useTranslation()
  const [mirrors, setMirrors] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [envOverride, setEnvOverride] = useState('')
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
        const cfg = await GetGitHubProxy()
        if (cancelled) return
        setMirrors(parseProxies(cfg?.value ?? ''))
        setEnvOverride(cfg?.envOverride ?? '')
      } catch (err) {
        if (cancelled) return
        onErrorRef.current?.(t('settings.github.loadFailed', { error: String(err) }))
        onCloseRef.current()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [t])

  const envMirrors = useMemo(() => parseProxies(envOverride), [envOverride])
  const effectiveMirrors = envOverride ? envMirrors : mirrors
  const isDirect = effectiveMirrors.length === 0
  const previewURL = isDirect
    ? SAMPLE_GITHUB_URL
    : buildMirrorURL(effectiveMirrors[0], SAMPLE_GITHUB_URL)
  const envLocked = Boolean(envOverride)

  const addMirror = (raw: string) => {
    const next = raw.trim()
    if (!next) return
    setMirrors((prev) => (prev.some((item) => item.toLowerCase() === next.toLowerCase()) ? prev : [...prev, next]))
    setDraft('')
  }

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addMirror(draft)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await SetGitHubProxy(joinProxies(mirrors))
      onSaved?.(mirrors.length > 0 ? t('settings.github.saved') : t('settings.github.restoredDirect'))
      onClose()
    } catch (err) {
      onError?.(t('settings.github.saveFailed', { error: String(err) }))
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setMirrors([])
    setDraft('')
    setSaving(true)
    try {
      await SetGitHubProxy('')
      onSaved?.(t('settings.github.restoredDirect'))
      onClose()
    } catch (err) {
      onError?.(t('settings.github.clearFailed', { error: String(err) }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose} disabled={saving}>
      <div
        className="modal github-proxy-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="github-proxy-dialog-title"
        aria-modal="true"
      >
        <div className="modal-header">
          <h2 id="github-proxy-dialog-title">{t('settings.github.title')}</h2>
          <ModalCloseButton disabled={saving} onClick={onClose} ariaLabel={t('app.close')} />
        </div>
        <div className="modal-body github-proxy-dialog-body">
          <div className="settings-dialog-content" aria-busy={loading}>
            {loading ? (
              <p className="settings-dialog-loading">{t('app.loading')}</p>
            ) : (
              <>
                <div className="github-proxy-status" role="status">
                  <span className={`github-proxy-status-badge${isDirect ? ' is-direct' : ' is-proxy'}`}>
                    {isDirect ? t('settings.github.statusDirect') : t('settings.github.statusProxy')}
                  </span>
                  {envLocked && (
                    <span className="github-proxy-status-badge is-env">{t('settings.github.statusEnv')}</span>
                  )}
                  {!isDirect && (
                    <span className="github-proxy-status-count">
                      {t('settings.github.mirrorCount', { count: effectiveMirrors.length })}
                    </span>
                  )}
                </div>

                <div className="github-proxy-scope">
                  <p>{t('settings.github.scopeDownloads')}</p>
                  <p>{t('settings.github.scopeBuckets')}</p>
                </div>

                {envLocked && (
                  <p className="github-proxy-env-warn" role="status">
                    <Trans
                      i18nKey="settings.github.envOverride"
                      values={{ value: envOverride }}
                      components={{ code: <code /> }}
                    />
                  </p>
                )}

                <div className={`github-proxy-panel${envLocked ? ' is-disabled' : ''}`}>
                  <div className="github-proxy-panel-head">
                    <span className="github-proxy-label">{t('settings.github.mirrorsLabel')}</span>
                    <span className="github-proxy-panel-hint">{t('settings.github.mirrorsHint')}</span>
                  </div>

                  {mirrors.length > 0 ? (
                    <ul className="github-proxy-mirror-list">
                      {mirrors.map((mirror) => (
                        <li key={mirror} className="github-proxy-mirror-item">
                          <code>{mirror}</code>
                          <button
                            type="button"
                            className="github-proxy-mirror-remove"
                            disabled={saving || envLocked}
                            aria-label={t('settings.github.removeMirror', { mirror })}
                            onClick={() => setMirrors((prev) => prev.filter((item) => item !== mirror))}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="github-proxy-empty">{t('settings.github.emptyMirrorsHint')}</p>
                  )}

                  <div className="github-proxy-add-row">
                    <input
                      id="github-proxy-input"
                      type="url"
                      className="github-proxy-input"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={handleDraftKeyDown}
                      placeholder={t('settings.github.addMirrorPlaceholder')}
                      disabled={saving || envLocked}
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      className="secondary github-proxy-add-btn"
                      disabled={saving || envLocked || !draft.trim()}
                      onClick={() => addMirror(draft)}
                    >
                      {t('settings.github.addMirror')}
                    </button>
                  </div>

                  <div className="github-proxy-presets">
                    <span className="github-proxy-presets-label">{t('settings.github.presetsLabel')}</span>
                    <div className="github-proxy-preset-list">
                      {MIRROR_PRESETS.map((preset) => {
                        const active = mirrors.some((item) => item.toLowerCase() === preset.toLowerCase())
                        return (
                          <button
                            key={preset}
                            type="button"
                            className={`github-proxy-preset${active ? ' is-active' : ''}`}
                            disabled={saving || envLocked || active}
                            onClick={() => addMirror(preset)}
                          >
                            {preset.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="github-proxy-preview">
                  <span className="github-proxy-preview-label">{t('settings.github.previewLabel')}</span>
                  <code>{previewURL}</code>
                  <span className="github-proxy-preview-note">{t('settings.github.previewSample')}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="github-proxy-dialog-footer">
          <button
            type="button"
            className="secondary github-proxy-reset"
            disabled={loading || saving || envLocked}
            onClick={handleClear}
          >
            {t('settings.github.restoreDirect')}
          </button>
          <div className="github-proxy-dialog-footer-actions">
            <button type="button" className="secondary" disabled={saving} onClick={onClose}>
              {t('app.cancel')}
            </button>
            <button
              type="button"
              className="primary"
              disabled={loading || saving || envLocked}
              onClick={handleSave}
            >
              {saving ? t('settings.github.saving') : t('settings.github.save')}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  )
}
