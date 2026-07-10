/** Gluestick template bundle JSON format (import / export). */

export const TEMPLATE_BUNDLE_SCHEMA_VERSION = 1 as const
export const TEMPLATE_BUNDLE_KIND = 'gluestick.template-bundle' as const

export type TemplateCategory =
  | 'popular'
  | 'ai'
  | 'game'
  | 'design'
  | 'programming'

/** Official bundles ship with the app; exported bundles come from inventory export. */
export type TemplateBundleOrigin = 'official' | 'exported'

export interface TemplatePackage {
  name: string
  bucket?: string
  label?: string
  /** Optional cross-ecosystem reference, e.g. "choco:googlechrome". */
  ref?: string
}

export interface Template {
  id: string
  category: TemplateCategory
  icon: string
  /** Package list — labels shown as chips; authoritative for install contents. */
  packages: TemplatePackage[]
  /** Display title/summary/description live in i18n: templateLibrary.templates.{id}.* */
}

export interface TemplateBundle {
  schemaVersion: typeof TEMPLATE_BUNDLE_SCHEMA_VERSION
  kind: typeof TEMPLATE_BUNDLE_KIND
  /** Stable bundle identifier, e.g. "popular-downloads". */
  id: string
  /** Human-readable bundle name shown in export metadata. */
  name: string
  description?: string
  origin: TemplateBundleOrigin
  /** ISO-8601 date (YYYY-MM-DD). */
  updatedAt: string
  templates: Template[]
}

export interface TemplateImportResult {
  bundle: TemplateBundle
  templateCount: number
  packageCount: number
}
