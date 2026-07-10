import { loadOfficialTemplates } from './templates/loader'
import type { Template, TemplateCategory, TemplatePackage } from './templates/schema'

export type { Template, TemplateCategory, TemplatePackage }

export const TEMPLATE_CATEGORY_IDS = [
  'all',
  'popular',
  'ai',
  'game',
  'design',
  'programming',
] as const

export type TemplateCategoryId = (typeof TEMPLATE_CATEGORY_IDS)[number]

/** Official template library loaded from versioned JSON bundles. */
export const OFFICIAL_TEMPLATES: Template[] = loadOfficialTemplates()

export function packageInstallRef(name: string, bucket?: string): string {
  if (bucket && bucket !== 'main') {
    return `${bucket}/${name}`
  }
  return name
}

export function packageNameFromInstallRef(ref: string): string {
  const base = ref.split('@')[0] ?? ref
  const slash = base.lastIndexOf('/')
  return slash >= 0 ? base.slice(slash + 1) : base
}

export function bucketDisplayLabel(name: string, description?: string): string {
  if (description) {
    return description
  }
  return name
}
