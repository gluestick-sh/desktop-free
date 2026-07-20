import { getEffectiveTemplatePackages } from '../templateStore'
import { OFFICIAL_TEMPLATES } from '../templateLibrary'
import {
  findOfficialBundleForTemplate,
  findOfficialTemplate,
  OFFICIAL_TEMPLATE_BUNDLES,
  validateTemplateBundle,
} from './loader'
import {
  TEMPLATE_BUNDLE_KIND,
  TEMPLATE_BUNDLE_SCHEMA_VERSION,
  type Template,
  type TemplatePackage,
  type TemplateBundle,
  type TemplateImportResult,
} from './schema'

export class TemplateBundleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TemplateBundleError'
  }
}

const OFFICIAL_BUNDLE_BY_ID = new Map(OFFICIAL_TEMPLATE_BUNDLES.map((bundle) => [bundle.id, bundle]))

function packageCount(templates: Template[]): number {
  return templates.reduce((sum, template) => sum + template.packages.length, 0)
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Build a bundle reflecting current effective template package lists (including user overrides). */
export function buildExportableTemplateBundle(): TemplateBundle {
  const templates = OFFICIAL_TEMPLATES.map((template) => ({
    id: template.id,
    category: template.category,
    icon: template.icon,
    packages: getEffectiveTemplatePackages(template).map(stripPackageForExport),
  }))
  return {
    schemaVersion: TEMPLATE_BUNDLE_SCHEMA_VERSION,
    kind: TEMPLATE_BUNDLE_KIND,
    id: 'gluestick-recipes',
    name: 'Gluestick Recipe Definitions',
    description: 'Recipe definitions exported from Gluestick Desktop.',
    origin: 'official',
    updatedAt: new Date().toISOString().slice(0, 10),
    templates,
  }
}

/** Export an entire official bundle as JSON. */
export function exportOfficialBundle(bundleId: string): void {
  const bundle = OFFICIAL_BUNDLE_BY_ID.get(bundleId)
  if (!bundle) {
    throw new Error(`Unknown official bundle: ${bundleId}`)
  }
  downloadJson(`gluestick-${bundle.id}-recipes.json`, bundle)
}

/** Export one template, applying current user overrides to the package list. */
export function exportTemplate(templateId: string, title: string): void {
  const base = findOfficialTemplate(templateId)
  if (!base) {
    throw new Error(`Unknown template: ${templateId}`)
  }
  const sourceBundle = findOfficialBundleForTemplate(templateId)
  const packages = getEffectiveTemplatePackages(base)
  const bundle: TemplateBundle = {
    schemaVersion: TEMPLATE_BUNDLE_SCHEMA_VERSION,
    kind: TEMPLATE_BUNDLE_KIND,
    id: `${templateId}-export`,
    name: title,
    description: `Exported from Gluestick recipe "${title}"`,
    origin: 'official',
    updatedAt: new Date().toISOString().slice(0, 10),
    templates: [
      {
        id: base.id,
        category: base.category,
        icon: base.icon,
        packages: packages.map(stripPackageForExport),
      },
    ],
  }
  if (sourceBundle) {
    bundle.description = `${bundle.description} (source bundle: ${sourceBundle.id})`
  }
  const safeName = templateId.replace(/[^a-z0-9-]+/gi, '-')
  downloadJson(`gluestick-recipe-${safeName}.json`, bundle)
}

function stripPackageForExport(pkg: TemplatePackage): TemplatePackage {
  const next: TemplatePackage = {
    name: pkg.name,
  }
  if (pkg.bucket) next.bucket = pkg.bucket
  if (pkg.label) next.label = pkg.label
  if (pkg.ref) next.ref = pkg.ref
  return next
}

/** Parse and validate an imported bundle file. User-origin bundles are rejected for now. */
export function parseImportedTemplateBundle(text: string): TemplateImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON file')
  }
  try {
    const bundle = validateTemplateBundle(raw)
    return {
      bundle,
      templateCount: bundle.templates.length,
      packageCount: packageCount(bundle.templates),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(message)
  }
}
