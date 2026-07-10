import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ListCatalogPackages } from '../wailsjs/go/main/App'
import type { main } from '../wailsjs/go/models'
import { packageInstallRef } from './templateLibrary'
import ModalCloseButton from './ModalCloseButton'
import ModalOverlay from './ModalOverlay'
import './TemplateRepairDialog.css'

export interface TemplateRepairTarget {
  templateId: string
  name: string
  bucket?: string
  label: string
}

interface TemplateRepairDialogProps {
  target: TemplateRepairTarget
  buckets: main.CatalogBucketInfo[]
  onClose: () => void
  onConfirm: (replacement: main.CatalogPackageInfo) => void
}

export default function TemplateRepairDialog({
  target,
  buckets,
  onClose,
  onConfirm,
}: TemplateRepairDialogProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState(target.label || target.name)
  const [bucket, setBucket] = useState(target.bucket ?? '')
  const [results, setResults] = useState<main.CatalogPackageInfo[]>([])
  const [selected, setSelected] = useState<main.CatalogPackageInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const runSearch = useCallback(async (searchQuery: string, searchBucket: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) {
      setResults([])
      setSelected(null)
      setSearched(false)
      return
    }
    setLoading(true)
    try {
      const page = await ListCatalogPackages({
        bucket: searchBucket,
        query: trimmed,
        page: 1,
        pageSize: 30,
        hideDeprecated: false,
      })
      const items = page?.items ?? []
      setResults(items)
      setSelected(items[0] ?? null)
      setSearched(true)
    } catch {
      setResults([])
      setSelected(null)
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runSearch(query, bucket)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query, bucket, runSearch])

  const sourceRef = packageInstallRef(target.name, target.bucket)

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="modal template-repair-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-repair-dialog-title"
      >
        <div className="modal-header">
          <h2 id="template-repair-dialog-title">{t('templateLibrary.repairTitle')}</h2>
          <ModalCloseButton onClick={onClose} ariaLabel={t('app.cancel')} />
        </div>

        <div className="modal-body template-repair-dialog-body">
          <div className="template-repair-source">
            <p className="template-repair-source-label">{t('templateLibrary.repairSource')}</p>
            <p className="template-repair-source-name">
              {target.label}
              <span className="pill" style={{ marginLeft: 8 }}>{sourceRef}</span>
            </p>
          </div>

          <div className="template-repair-search-row">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('templateLibrary.repairSearchPlaceholder')}
              aria-label={t('templateLibrary.repairSearchPlaceholder')}
              autoFocus
            />
            <select
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              aria-label={t('common.bucket')}
            >
              <option value="">{t('templateLibrary.repairAllBuckets')}</option>
              {buckets.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <p className="template-repair-hint">{t('templateLibrary.repairHint')}</p>

          <div className="template-repair-results" role="listbox" aria-label={t('templateLibrary.repairResults')}>
            {loading ? (
              <p className="template-repair-loading">{t('templateLibrary.packagesLoading')}</p>
            ) : results.length === 0 ? (
              <p className="template-repair-empty">
                {searched ? t('templateLibrary.repairNoResults') : t('templateLibrary.repairEnterQuery')}
              </p>
            ) : (
              results.map((item) => {
                const isSelected =
                  selected?.name === item.name && selected?.bucket === item.bucket
                return (
                  <button
                    key={`${item.bucket}/${item.name}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`template-repair-result${isSelected ? ' is-selected' : ''}`}
                    onClick={() => setSelected(item)}
                    onDoubleClick={() => onConfirm(item)}
                  >
                    <span className="template-repair-result-name">
                      {item.name}
                      <span className="pill">{item.bucket}</span>
                      {item.version ? <span className="pill">{item.version}</span> : null}
                    </span>
                    {item.description ? (
                      <span className="template-repair-result-desc">{item.description}</span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="modal-footer template-repair-dialog-footer">
          <button type="button" className="secondary" onClick={onClose}>
            {t('app.cancel')}
          </button>
          <button
            type="button"
            className="primary"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
          >
            {t('templateLibrary.repairConfirm')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
