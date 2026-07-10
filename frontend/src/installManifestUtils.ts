import type { main } from '../wailsjs/go/models'

type ArchBlock = {
  url?: string | string[]
  hash?: string | string[]
}

function stringList(value: unknown): string[] {
  if (typeof value === 'string' && value.trim() !== '') {
    return [value]
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
  }
  return []
}

/** Resolve download URLs/hashes for a manifest architecture override. */
export function resolveManifestForArchitecture(
  manifest: main.InstallManifestInfo,
  architectureOverride?: string,
): main.InstallManifestInfo {
  const arch = architectureOverride?.trim()
  if (!arch || !manifest.manifestJSON) {
    return manifest
  }
  if (arch === manifest.architecture && manifest.downloadUrls?.length) {
    return manifest
  }

  try {
    const raw = JSON.parse(manifest.manifestJSON) as {
      url?: string | string[]
      hash?: string | string[]
      architecture?: Record<string, ArchBlock>
    }
    const block = raw.architecture?.[arch]
    if (!block) {
      return { ...manifest, architecture: arch }
    }
    const downloadUrls = stringList(block.url)
    const hashes = stringList(block.hash)
    if (downloadUrls.length === 0 && hashes.length === 0) {
      return { ...manifest, architecture: arch }
    }
    return {
      ...manifest,
      architecture: arch,
      downloadUrls: downloadUrls.length > 0 ? downloadUrls : manifest.downloadUrls,
      hashes: hashes.length > 0 ? hashes : manifest.hashes,
    }
  } catch {
    return { ...manifest, architecture: arch }
  }
}

export function bucketDownloadURLForArchitecture(
  manifest: main.InstallManifestInfo,
  architectureOverride?: string,
): string {
  const bucketSource: main.InstallManifestInfo = {
    ...manifest,
    downloadUrls:
      manifest.bucketDownloadUrls?.length > 0
        ? manifest.bucketDownloadUrls
        : manifest.downloadUrls,
  }
  return resolveManifestForArchitecture(bucketSource, architectureOverride).downloadUrls?.[0] ?? ''
}

export function effectiveDownloadURLForArchitecture(
  manifest: main.InstallManifestInfo,
  architectureOverride?: string,
): string {
  return resolveManifestForArchitecture(manifest, architectureOverride).downloadUrls?.[0] ?? ''
}
