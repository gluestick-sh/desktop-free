import type { TFunction } from 'i18next'
import type { main } from '../../wailsjs/go/models'
import { formatKeyedMessage } from './formatMessage'

export function formatDoctorCheckLabel(id: string, t: TFunction): string {
  const key = `doctor.check.${id}`
  return t(key, { defaultValue: id })
}

export function formatDoctorDetail(
  check: { detailKey?: string; detail?: string },
  _t: TFunction,
): string {
  const detail = check.detail ?? ''
  if (check.detailKey) {
    const base = formatKeyedMessage(check.detailKey, undefined, '')
    if (base && detail) {
      return `${base} (${detail})`
    }
    return base || detail
  }
  return detail
}

export function formatDoctorHint(
  check: { hintKey?: string; hint?: string },
  _t: TFunction,
): string {
  if (check.hintKey) {
    return formatKeyedMessage(check.hintKey, undefined, check.hint ?? '')
  }
  return check.hint ?? ''
}

export function formatActivityOperation(operation: string, t: TFunction): string {
  const key = `activity.operation.${operation}`
  return t(key, { defaultValue: t('activity.operation.unknown') })
}

export function formatActivityStatus(status: string, t: TFunction): string {
  const key = `activity.status.${status}`
  return t(key, { defaultValue: status })
}

export function formatActivitySubject(entry: main.ActivityLogEntry, t: TFunction): string {
  const op = entry.operation || ''
  const details = entry.details ?? {}
  const pkg = entry.packageName || ''
  const ver = entry.version || ''

  if (op === 'doctor') {
    const total = Number(details.total ?? 0)
    const passed = Number(details.passed ?? 0)
    if (total > 0 && passed === total) {
      return t('activity.doctor.all_passed', { total })
    }
    if (total > 0) {
      return t('activity.doctor.partial', { passed, total })
    }
    return t('activity.operation.doctor')
  }

  if (op === 'check_updates') {
    const count = Number(details.updatesCount ?? 0)
    if (count > 0) {
      return t('activity.check_updates.count', { count })
    }
    return t('activity.check_updates.none')
  }

  if (op === 'bucket_check') {
    const count = Number(details.withUpdates ?? 0)
    if (count > 0) {
      const names = Array.isArray(details.names)
        ? (details.names as string[]).join(', ')
        : pkg
      return t('activity.bucket_check.updates', { count, names })
    }
    return t('activity.bucket_check.none')
  }

  if (op === 'upgrade' || op === 'version_switch') {
    const from = typeof details.from === 'string' ? details.from : ''
    const to = (typeof details.to === 'string' ? details.to : '') || ver
    if (from && to) {
      return t('activity.version.change', { name: pkg, from, to })
    }
    if (to) {
      return t('activity.version.toOnly', { name: pkg, to })
    }
  }

  if (op === 'bucket_update' && (pkg === '*' || pkg === '')) {
    return t('activity.bucketAll')
  }

  if (pkg && ver) {
    return `${pkg}@${ver}`
  }
  if (pkg) {
    return pkg
  }
  return '-'
}

export function formatActivityErrorDetail(entry: main.ActivityLogEntry, t: TFunction): string {
  if (!entry.errorDetail) {
    return ''
  }
  if (entry.operation === 'doctor' && entry.details?.failedChecks) {
    const checks = Array.isArray(entry.details.failedChecks)
      ? entry.details.failedChecks.filter((x: unknown): x is string => typeof x === 'string')
      : []
    if (checks.length > 0) {
      const labels = checks.map((id: string) => formatDoctorCheckLabel(id, t))
      return t('activity.doctor.failedChecks', { checks: labels.join(', ') })
    }
  }
  return entry.errorDetail
}
