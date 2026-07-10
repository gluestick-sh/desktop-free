import {
  TEMPLATE_BUNDLE_KIND,
  TEMPLATE_BUNDLE_SCHEMA_VERSION,
  type TemplateBundle,
  type TemplateImportResult,
} from './schema'

export class TemplateBundleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TemplateBundleError'
  }
}

const PRO_REQUIRED = 'requires Gluestick Desktop Pro'

/** Free edition: template definition export is Pro-only (UI entry remains). */
export function buildExportableTemplateBundle(): TemplateBundle {
  throw new Error(PRO_REQUIRED)
}

/** Free edition: official bundle export is Pro-only. */
export function exportOfficialBundle(_bundleId: string): void {
  throw new Error(PRO_REQUIRED)
}

/** Free edition: single-template export is Pro-only (UI entry remains). */
export function exportTemplate(_templateId: string, _title: string): void {
  throw new Error(PRO_REQUIRED)
}

/** Free edition: template definition import is Pro-only (UI entry remains). */
export function parseImportedTemplateBundle(_text: string): TemplateImportResult {
  throw new Error(PRO_REQUIRED)
}

// Re-export schema constants so callers that only need metadata keep compiling.
export { TEMPLATE_BUNDLE_KIND, TEMPLATE_BUNDLE_SCHEMA_VERSION }
