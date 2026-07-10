import type { main } from '../wailsjs/go/models'

export const SEARCH_HISTORY_STORAGE_KEY = 'gluestick-desktop-search-history'
export const SEARCH_HISTORY_MAX = 10

/** Whether a catalog list query returned any results. */
export function catalogSearchHasResults(page: main.CatalogPackagePage | null | undefined): boolean {
  if (!page) return false
  if (typeof page.total === 'number' && page.total > 0) return true
  return (page.items?.length ?? 0) > 0
}

export function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, SEARCH_HISTORY_MAX)
  } catch {
    return []
  }
}

function saveRecentSearches(items: string[]) {
  localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(items))
}

export function addRecentSearch(query: string): string[] {
  const trimmed = query.trim()
  if (!trimmed) return loadRecentSearches()

  const lower = trimmed.toLowerCase()
  const next = [
    trimmed,
    ...loadRecentSearches().filter((item) => item.toLowerCase() !== lower),
  ].slice(0, SEARCH_HISTORY_MAX)

  saveRecentSearches(next)
  return next
}

export function removeRecentSearch(query: string): string[] {
  const lower = query.toLowerCase()
  const next = loadRecentSearches().filter((item) => item.toLowerCase() !== lower)
  saveRecentSearches(next)
  return next
}
