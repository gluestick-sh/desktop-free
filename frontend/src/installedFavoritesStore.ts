const STORAGE_KEY = 'gluestick-installed-favorites-v1'

export function loadInstalledFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((name): name is string => typeof name === 'string' && name.length > 0))
  } catch {
    return new Set()
  }
}

export function saveInstalledFavorites(names: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...names].sort((a, b) => a.localeCompare(b))))
}

export function isInstalledFavorite(favorites: Set<string>, packageName: string): boolean {
  return favorites.has(packageName)
}

export function toggleInstalledFavorite(favorites: Set<string>, packageName: string): Set<string> {
  const next = new Set(favorites)
  if (next.has(packageName)) {
    next.delete(packageName)
  } else {
    next.add(packageName)
  }
  saveInstalledFavorites(next)
  return next
}
