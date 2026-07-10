export type SortDirection = 'asc' | 'desc'

export type TableSortState = {
  columnId: string
  direction: SortDirection
} | null

const WIDTH_STORAGE_PREFIX = 'gluestick-table-widths-v1:'

export function loadTableColumnWidths(tableId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${WIDTH_STORAGE_PREFIX}${tableId}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveTableColumnWidths(tableId: string, widths: Record<string, number>) {
  localStorage.setItem(`${WIDTH_STORAGE_PREFIX}${tableId}`, JSON.stringify(widths))
}

function compareSortValues(a: string | number | null | undefined, b: string | number | null | undefined): number {
  const aMissing = a === null || a === undefined || a === ''
  const bMissing = b === null || b === undefined || b === ''
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

/** Sort only the rows on the current page (caller passes page slice). */
export function sortPageRows<T>(
  rows: T[],
  sort: TableSortState,
  sortValue: (row: T, columnId: string) => string | number | null | undefined,
): T[] {
  if (!sort) return rows
  const { columnId, direction } = sort
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((left, right) => factor * compareSortValues(sortValue(left, columnId), sortValue(right, columnId)))
}
