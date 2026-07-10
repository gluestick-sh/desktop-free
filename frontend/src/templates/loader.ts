import devEnvironmentsBundle from './official/dev-environments.bundle.json'
import popularDownloadsBundle from './official/popular-downloads.bundle.json'
import {
  TEMPLATE_BUNDLE_KIND,
  TEMPLATE_BUNDLE_SCHEMA_VERSION,
  type Template,
  type TemplateCategory,
  type TemplateBundle,
} from './schema'

export const OFFICIAL_TEMPLATE_BUNDLES: TemplateBundle[] = [
  popularDownloadsBundle as TemplateBundle,
  devEnvironmentsBundle as TemplateBundle,
]

const VALID_CATEGORIES = new Set<TemplateCategory>([
  'popular',
  'ai',
  'game',
  'design',
  'programming',
])

export class TemplateBundleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TemplateBundleError'
  }
}

function assertBundleShape(raw: unknown): asserts raw is TemplateBundle {
  if (!raw || typeof raw !== 'object') {
    throw new TemplateBundleError('Bundle must be a JSON object')
  }
  const bundle = raw as TemplateBundle
  if (bundle.schemaVersion !== TEMPLATE_BUNDLE_SCHEMA_VERSION) {
    throw new TemplateBundleError(`Unsupported schemaVersion: ${String(bundle.schemaVersion)}`)
  }
  if (bundle.kind !== TEMPLATE_BUNDLE_KIND) {
    throw new TemplateBundleError(`Unsupported kind: ${String(bundle.kind)}`)
  }
  if (!bundle.id?.trim()) {
    throw new TemplateBundleError('Bundle id is required')
  }
  if (!bundle.name?.trim()) {
    throw new TemplateBundleError('Bundle name is required')
  }
  if (bundle.origin === 'exported') {
    throw new TemplateBundleError('Exported inventory templates cannot be imported yet')
  }
  if (bundle.origin !== 'official') {
    throw new TemplateBundleError('Only official template bundles can be imported for now')
  }
  if (!Array.isArray(bundle.templates) || bundle.templates.length === 0) {
    throw new TemplateBundleError('Bundle must include at least one template')
  }

  const seenIds = new Set<string>()
  for (const template of bundle.templates) {
    if (!template.id?.trim()) {
      throw new TemplateBundleError('Each template must have an id')
    }
    if (seenIds.has(template.id)) {
      throw new TemplateBundleError(`Duplicate template id: ${template.id}`)
    }
    seenIds.add(template.id)
    if (!VALID_CATEGORIES.has(template.category)) {
      throw new TemplateBundleError(`Invalid category for template ${template.id}: ${String(template.category)}`)
    }
    if (!template.icon?.trim()) {
      throw new TemplateBundleError(`Template ${template.id} must have an icon`)
    }
    if (!Array.isArray(template.packages) || template.packages.length === 0) {
      throw new TemplateBundleError(`Template ${template.id} must include at least one package`)
    }
    for (const pkg of template.packages) {
      if (!pkg.name?.trim()) {
        throw new TemplateBundleError(`Template ${template.id} has a package without a name`)
      }
    }
  }
}

export function validateTemplateBundle(raw: unknown): TemplateBundle {
  assertBundleShape(raw)
  return raw
}

export function loadOfficialTemplates(): Template[] {
  const templates: Template[] = []
  const seenIds = new Set<string>()

  for (const bundle of OFFICIAL_TEMPLATE_BUNDLES) {
    validateTemplateBundle(bundle)
    for (const template of bundle.templates) {
      if (seenIds.has(template.id)) {
        throw new TemplateBundleError(`Duplicate official template id: ${template.id}`)
      }
      seenIds.add(template.id)
      templates.push(template)
    }
  }

  return templates
}

export function findOfficialBundleForTemplate(templateId: string): TemplateBundle | undefined {
  return OFFICIAL_TEMPLATE_BUNDLES.find((bundle) =>
    bundle.templates.some((template) => template.id === templateId),
  )
}

export function findOfficialTemplate(templateId: string): Template | undefined {
  for (const bundle of OFFICIAL_TEMPLATE_BUNDLES) {
    const hit = bundle.templates.find((template) => template.id === templateId)
    if (hit) return hit
  }
  return undefined
}

/** Merge all official bundles into one exportable template bundle. */
export function buildCombinedOfficialBundle(): TemplateBundle {
  const templates = loadOfficialTemplates()
  return {
    schemaVersion: TEMPLATE_BUNDLE_SCHEMA_VERSION,
    kind: TEMPLATE_BUNDLE_KIND,
    id: 'gluestick-official',
    name: 'Gluestick Official Templates',
    description: 'All official template definitions shipped with Gluestick.',
    origin: 'official',
    updatedAt: new Date().toISOString().slice(0, 10),
    templates,
  }
}
