import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  loadTableColumnWidths,
  saveTableColumnWidths,
  sortPageRows,
  type SortDirection,
  type TableSortState,
} from './packageDataTableUtils'
import './PackageDataTable.css'

export interface PackageDataTableColumn<T> {
  id: string
  header: ReactNode
  headerClassName?: string
  cellClassName?: string
  colClassName?: string
  sortable?: boolean
  resizable?: boolean
  defaultWidth?: number
  minWidth?: number
  sortValue?: (row: T) => string | number | null | undefined
  renderCell: (row: T) => ReactNode
}

interface PackageDataTableProps<T> {
  tableId: string
  className?: string
  columns: PackageDataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  /** Custom row render (e.g. expanded detail rows). Receives sorted page rows. */
  renderRow?: (row: T, index: number) => ReactNode
}

export default function PackageDataTable<T>({
  tableId,
  className,
  columns,
  rows,
  rowKey,
  renderRow,
}: PackageDataTableProps<T>) {
  const { t } = useTranslation()
  const [sort, setSort] = useState<TableSortState>(null)
  const [widths, setWidths] = useState<Record<string, number>>(() => loadTableColumnWidths(tableId))
  const resizeRef = useRef<{
    columnId: string
    startX: number
    startWidth: number
    minWidth: number
  } | null>(null)

  useEffect(() => {
    setWidths(loadTableColumnWidths(tableId))
    setSort(null)
  }, [tableId])

  const sortedRows = useMemo(() => {
    if (!sort) return rows
    const column = columns.find((item) => item.id === sort.columnId)
    if (!column?.sortValue) return rows
    return sortPageRows(rows, sort, (row, columnId) => {
      if (columnId !== column.id) return null
      return column.sortValue?.(row)
    })
  }, [rows, sort, columns])

  const columnWidth = useCallback(
    (column: PackageDataTableColumn<T>) => widths[column.id] ?? column.defaultWidth,
    [widths],
  )

  const hasFixedLayout = useMemo(
    () => columns.some((column) => columnWidth(column) != null),
    [columns, columnWidth],
  )

  const toggleSort = (column: PackageDataTableColumn<T>) => {
    if (!column.sortable) return
    setSort((prev) => {
      if (prev?.columnId !== column.id) {
        return { columnId: column.id, direction: 'asc' }
      }
      if (prev.direction === 'asc') {
        return { columnId: column.id, direction: 'desc' }
      }
      return null
    })
  }

  const sortLabel = (header: string, direction: SortDirection) =>
    t('table.sortByColumn', {
      column: header,
      direction: direction === 'asc' ? t('table.sortAsc') : t('table.sortDesc'),
    })

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const active = resizeRef.current
      if (!active) return
      const next = Math.max(active.minWidth, active.startWidth + (event.clientX - active.startX))
      setWidths((prev) => ({ ...prev, [active.columnId]: next }))
    }
    const onUp = () => {
      if (!resizeRef.current) return
      resizeRef.current = null
      setWidths((prev) => {
        saveTableColumnWidths(tableId, prev)
        return prev
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [tableId])

  const startResize = (column: PackageDataTableColumn<T>, event: React.MouseEvent) => {
    if (column.resizable === false) return
    event.preventDefault()
    event.stopPropagation()
    const th = (event.currentTarget as HTMLElement).closest('th')
    const measured = th?.getBoundingClientRect().width ?? column.defaultWidth ?? 120
    resizeRef.current = {
      columnId: column.id,
      startX: event.clientX,
      startWidth: columnWidth(column) ?? measured,
      minWidth: column.minWidth ?? 48,
    }
  }

  const tableClass = ['package-table', 'package-table-managed', hasFixedLayout ? 'package-table-fixed' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <table className={tableClass}>
      <colgroup>
        {columns.map((column) => {
          const width = columnWidth(column)
          return (
            <col
              key={column.id}
              className={column.colClassName}
              style={width != null ? { width: `${width}px` } : undefined}
            />
          )
        })}
      </colgroup>
      <thead>
        <tr>
          {columns.map((column) => {
            const active = sort?.columnId === column.id
            const direction = active ? sort.direction : null
            const width = columnWidth(column)
            return (
              <th
                key={column.id}
                className={[column.headerClassName, column.sortable ? 'package-table-th-sortable' : ''].filter(Boolean).join(' ')}
                style={width != null ? { width: `${width}px` } : undefined}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    className={`package-table-sort-btn${active ? ' is-active' : ''}`}
                    onClick={() => toggleSort(column)}
                    aria-label={direction ? sortLabel(String(column.header), direction) : t('table.sortColumn', { column: String(column.header) })}
                  >
                    <span className="package-table-sort-label">{column.header}</span>
                    <span className="package-table-sort-indicator" aria-hidden="true">
                      {direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : '⇅'}
                    </span>
                  </button>
                ) : (
                  <span className="package-table-header-label">{column.header}</span>
                )}
                {column.resizable !== false ? (
                  <span
                    className="package-table-resize-handle"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={t('table.resizeColumn', { column: String(column.header) })}
                    onMouseDown={(event) => startResize(column, event)}
                  />
                ) : null}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {renderRow
          ? sortedRows.map((row, index) => renderRow(row, index))
          : sortedRows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td key={column.id} className={column.cellClassName}>
                    {column.renderCell(row)}
                  </td>
                ))}
              </tr>
            ))}
      </tbody>
    </table>
  )
}
