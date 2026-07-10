import { OFFICIAL_TEMPLATES, type Template, type TemplatePackage } from './templateLibrary'

const STORAGE_KEY = 'gluestick-catalog-template-overrides'

export interface TemplateOverride {
  removed: string[]
  added: TemplatePackage[]
}

export type TemplateOverrideMap = Record<string, TemplateOverride>

function emptyOverride(): TemplateOverride {
  return { removed: [], added: [] }
}

export function loadTemplateOverrides(): TemplateOverrideMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as TemplateOverrideMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveTemplateOverrides(overrides: TemplateOverrideMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

function getOverride(map: TemplateOverrideMap, templateId: string): TemplateOverride {
  return map[templateId] ?? emptyOverride()
}

export function getDefaultTemplate(templateId: string): Template | undefined {
  return OFFICIAL_TEMPLATES.find((item) => item.id === templateId)
}

export function getEffectiveTemplatePackages(template: Template): TemplatePackage[] {
  const override = getOverride(loadTemplateOverrides(), template.id)
  const removed = new Set(override.removed.map((name) => name.toLowerCase()))
  const merged: TemplatePackage[] = []

  for (const pkg of template.packages) {
    if (!removed.has(pkg.name.toLowerCase())) {
      merged.push(pkg)
    }
  }
  for (const pkg of override.added) {
    if (!merged.some((item) => item.name.toLowerCase() === pkg.name.toLowerCase())) {
      merged.push(pkg)
    }
  }
  return merged
}

export function isTemplateCustomized(templateId: string): boolean {
  const override = getOverride(loadTemplateOverrides(), templateId)
  return override.removed.length > 0 || override.added.length > 0
}

export function removePackageFromTemplate(templateId: string, packageName: string): void {
  const overrides = loadTemplateOverrides()
  const override = getOverride(overrides, templateId)
  const key = packageName.toLowerCase()
  const defaultTemplate = getDefaultTemplate(templateId)
  const isDefault = defaultTemplate?.packages.some((pkg) => pkg.name.toLowerCase() === key)

  override.added = override.added.filter((pkg) => pkg.name.toLowerCase() !== key)
  if (isDefault && !override.removed.some((name) => name.toLowerCase() === key)) {
    override.removed.push(packageName)
  }

  if (override.removed.length === 0 && override.added.length === 0) {
    delete overrides[templateId]
  } else {
    overrides[templateId] = override
  }
  saveTemplateOverrides(overrides)
}

export function addPackageToTemplate(templateId: string, pkg: TemplatePackage): boolean {
  const overrides = loadTemplateOverrides()
  const override = getOverride(overrides, templateId)
  const key = pkg.name.toLowerCase()

  const defaultTemplate = getDefaultTemplate(templateId)
  const inDefault = defaultTemplate?.packages.some((item) => item.name.toLowerCase() === key)
  const inAdded = override.added.some((item) => item.name.toLowerCase() === key)
  const removedIndex = override.removed.findIndex((name) => name.toLowerCase() === key)

  if (inAdded || (inDefault && removedIndex < 0)) {
    return false
  }

  if (removedIndex >= 0) {
    override.removed.splice(removedIndex, 1)
  } else {
    override.added.push(pkg)
  }

  overrides[templateId] = override
  saveTemplateOverrides(overrides)
  return true
}

export function resetTemplateOverride(templateId: string): void {
  const overrides = loadTemplateOverrides()
  delete overrides[templateId]
  saveTemplateOverrides(overrides)
}

/** Replace a template entry (e.g. renamed or removed from index) with a user-chosen package. */
export function remapPackageInTemplate(
  templateId: string,
  originalName: string,
  replacement: TemplatePackage,
  displayLabel?: string,
): boolean {
  const defaultTemplate = getDefaultTemplate(templateId)
  const overrides = loadTemplateOverrides()
  const override = getOverride(overrides, templateId)
  const originalKey = originalName.toLowerCase()
  const replacementKey = replacement.name.toLowerCase()

  const originalPkg =
    defaultTemplate?.packages.find((pkg) => pkg.name.toLowerCase() === originalKey) ??
    override.added.find((pkg) => pkg.name.toLowerCase() === originalKey)

  const inDefault = defaultTemplate?.packages.some((item) => item.name.toLowerCase() === replacementKey)
  const inAdded = override.added.some((item) => item.name.toLowerCase() === replacementKey)
  const removedIndex = override.removed.findIndex((name) => name.toLowerCase() === replacementKey)

  if (replacementKey !== originalKey && (inAdded || (inDefault && removedIndex < 0))) {
    return false
  }

  removePackageFromTemplate(templateId, originalName)

  const pkg: TemplatePackage = {
    name: replacement.name,
    bucket: replacement.bucket,
    label: displayLabel ?? originalPkg?.label ?? replacement.label ?? replacement.name,
  }
  return addPackageToTemplate(templateId, pkg)
}

export function countTemplates(): number {
  return OFFICIAL_TEMPLATES.length
}

export interface TemplateImportApplyResult {
  applied: number
  skipped: string[]
  packageCount: number
}

/** Apply an imported bundle (Pro-only). Free edition keeps the UI entry only. */
export function applyImportedTemplateBundle(
  _templates: Array<{ id: string; packages: TemplatePackage[] }>,
): TemplateImportApplyResult {
  throw new Error('requires Gluestick Desktop Pro')
}
