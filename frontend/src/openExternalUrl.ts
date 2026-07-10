import { BrowserOpenURL } from '../wailsjs/runtime/runtime'

export const GLUESTICK_HOME_URL = 'https://gluestick.sh'

export const FLATICON_ATTRIBUTION_URL = 'https://www.flaticon.com/free-icons/glue-bottle'

export function openExternalUrl(url: string, event?: { preventDefault(): void }) {
  event?.preventDefault()
  BrowserOpenURL(url)
}
