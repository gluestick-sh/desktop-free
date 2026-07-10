import { useCallback, useEffect, useState, type RefObject } from 'react'

export type PageSizeMode = 'auto' | 'custom'

export const PAGE_SIZE_STORAGE_KEY = 'gluestick-desktop-list-page-size'
export const PAGE_SIZE_MIN = 5
export const PAGE_SIZE_MAX = 100
export const PAGE_SIZE_PRESETS = [10, 15, 20, 30, 50] as const

const TABLE_HEADER_HEIGHT = 40
const TABLE_ROW_HEIGHT = 45

export function clampPageSize(value: number): number {
  if (!Number.isFinite(value)) return PAGE_SIZE_PRESETS[2]
  return Math.min(PAGE_SIZE_MAX, Math.max(PAGE_SIZE_MIN, Math.round(value)))
}

export function computeAutoPageSize(containerHeight: number): number {
  if (containerHeight <= 0) return PAGE_SIZE_PRESETS[2]
  const available = Math.max(0, containerHeight - TABLE_HEADER_HEIGHT)
  const rows = Math.floor(available / TABLE_ROW_HEIGHT)
  return clampPageSize(rows)
}

type StoredPageSize = {
  mode: PageSizeMode
  size?: number
}

function loadStoredPageSize(): StoredPageSize {
  try {
    const raw = localStorage.getItem(PAGE_SIZE_STORAGE_KEY)
    if (!raw) return { mode: 'auto' }
    const parsed = JSON.parse(raw) as StoredPageSize
    if (parsed.mode === 'custom' && typeof parsed.size === 'number') {
      return { mode: 'custom', size: clampPageSize(parsed.size) }
    }
    return { mode: 'auto' }
  } catch {
    return { mode: 'auto' }
  }
}

function saveStoredPageSize(config: StoredPageSize) {
  localStorage.setItem(PAGE_SIZE_STORAGE_KEY, JSON.stringify(config))
}

export function useListPageSize(scrollRef: RefObject<HTMLDivElement | null>, remeasureKey: unknown) {
  const [mode, setMode] = useState<PageSizeMode>(() => loadStoredPageSize().mode)
  const [customSize, setCustomSize] = useState(() => loadStoredPageSize().size ?? PAGE_SIZE_PRESETS[2])
  const [autoSize, setAutoSize] = useState<number>(PAGE_SIZE_PRESETS[2])

  const measure = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setAutoSize(computeAutoPageSize(el.clientHeight))
  }, [scrollRef])

  useEffect(() => {
    measure()
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [scrollRef, measure, remeasureKey])

  const pageSize = mode === 'auto' ? autoSize : customSize

  const setPageSize = useCallback((size: number) => {
    const clamped = clampPageSize(size)
    setMode('custom')
    setCustomSize(clamped)
    saveStoredPageSize({ mode: 'custom', size: clamped })
  }, [])

  const setAutoMode = useCallback(() => {
    setMode('auto')
    saveStoredPageSize({ mode: 'auto' })
  }, [])

  return {
    pageSize,
    mode,
    autoSize,
    setPageSize,
    setAutoMode,
  }
}
