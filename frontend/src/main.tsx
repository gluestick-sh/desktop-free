import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import App from './App'
import { CacheTasksProvider } from './TabTopProgress'
import './index.css'
import {
  applyTheme,
  loadCustomThemes,
  loadStoredThemeId,
  resolveTheme,
  sanitizeThemeIdOnLoad,
} from './themes'

const customThemes = loadCustomThemes()
const themeId = sanitizeThemeIdOnLoad(loadStoredThemeId(), customThemes, false)
const theme = resolveTheme(themeId, customThemes)
if (theme) {
  applyTheme(theme)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CacheTasksProvider>
      <App />
    </CacheTasksProvider>
  </React.StrictMode>,
)
