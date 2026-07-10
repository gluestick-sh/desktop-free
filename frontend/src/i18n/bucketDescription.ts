import i18n from './index'
import type { main } from '../../wailsjs/go/models'

/** Localized description for a well-known bucket (main, extras, …). */
export function knownBucketDescription(name: string, fallback?: string): string {
  const key = `bucket.knownDescriptions.${name}`
  if (i18n.exists(key)) {
    return i18n.t(key)
  }
  return fallback?.trim() ?? ''
}

/** Effective bucket description for display (custom override > i18n known > backend fallback). */
export function displayBucketDescription(bucket: main.BucketInfo): string {
  if (bucket.descriptionCustom && bucket.description?.trim()) {
    return bucket.description.trim()
  }
  const localized = knownBucketDescription(bucket.name, '')
  if (localized) {
    return localized
  }
  return bucket.description?.trim() ?? ''
}

/** Initial text for the description editor. */
export function editableBucketDescription(bucket: main.BucketInfo): string {
  if (bucket.descriptionCustom) {
    return bucket.description?.trim() ?? ''
  }
  return knownBucketDescription(bucket.name, bucket.description) || bucket.description?.trim() || ''
}
