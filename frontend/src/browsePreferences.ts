const HIDE_DEPRECATED_KEY = 'gluestick-browse-hide-deprecated'

export function loadHideDeprecated(): boolean {
  try {
    const stored = localStorage.getItem(HIDE_DEPRECATED_KEY)
    if (stored === null) return true
    return stored === '1'
  } catch {
    return true
  }
}

export function saveHideDeprecated(hide: boolean): void {
  try {
    localStorage.setItem(HIDE_DEPRECATED_KEY, hide ? '1' : '0')
  } catch {
    // ignore quota / private mode
  }
}
