export function logStatusClassName(status: string): string {
  if (status === 'success') return 'log-status log-status-success'
  if (status === 'failed') return 'log-status log-status-failed'
  return 'log-status log-status-info'
}
