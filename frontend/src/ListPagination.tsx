import { useEffect, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { PAGE_SIZE_MAX, PAGE_SIZE_MIN, type PageSizeMode } from './listPageSize'

interface ListPaginationProps {
  page: number
  totalPages: number
  total: number
  totalUnit?: string
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  disabled?: boolean
  pageSize: number
  pageSizeMode: PageSizeMode
  autoPageSize: number
  onPageSizeChange: (size: number) => void
  onPageSizeAuto: () => void
  className?: string
}

export default function ListPagination({
  page,
  totalPages,
  total,
  totalUnit,
  canPrev,
  canNext,
  onPrev,
  onNext,
  disabled = false,
  pageSize,
  pageSizeMode,
  autoPageSize,
  onPageSizeChange,
  onPageSizeAuto,
  className,
}: ListPaginationProps) {
  const { t } = useTranslation()
  const resolvedUnit = totalUnit ?? t('common.unitItems')
  const [draft, setDraft] = useState(String(pageSize))

  useEffect(() => {
    setDraft(String(pageSize))
  }, [pageSize])

  const commitDraft = () => {
    const value = parseInt(draft, 10)
    if (Number.isNaN(value)) {
      setDraft(String(pageSize))
      return
    }
    onPageSizeChange(value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
      commitDraft()
    }
  }

  if (total <= pageSize) {
    return null
  }

  return (
    <div className={['list-pagination', className].filter(Boolean).join(' ')}>
      <div className="list-pagination-nav">
        <button type="button" className="secondary" disabled={!canPrev || disabled} onClick={onPrev}>
          {t('pagination.prev')}
        </button>
        <span className="list-page-info">
          {t('pagination.pageInfo', { page, totalPages })}
          <span className="list-total">{t('pagination.total', { total, unit: resolvedUnit })}</span>
        </span>
        <button type="button" className="secondary" disabled={!canNext || disabled} onClick={onNext}>
          {t('pagination.next')}
        </button>
      </div>
      <div className="list-pagination-size">
        <span className="list-page-size-label">{t('pagination.perPage')}</span>
        <input
          type="number"
          className="list-page-size-input"
          min={PAGE_SIZE_MIN}
          max={PAGE_SIZE_MAX}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={handleKeyDown}
          aria-label={t('pagination.perPageAria')}
        />
        {pageSizeMode === 'auto' ? (
          <span
            className="list-page-size-auto"
            title={t('pagination.autoTitle', { count: autoPageSize })}
          >
            {t('pagination.auto')}
          </span>
        ) : (
          <button
            type="button"
            className="ghost list-page-size-auto-btn"
            disabled={disabled}
            onClick={onPageSizeAuto}
            title={t('pagination.autoRestoreTitle', { count: autoPageSize })}
          >
            {t('pagination.auto')}
          </button>
        )}
      </div>
    </div>
  )
}
