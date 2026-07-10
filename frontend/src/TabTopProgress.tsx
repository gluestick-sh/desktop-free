import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EventsOn } from '../wailsjs/runtime/runtime'
import { formatCachePhaseLabel, formatKeyedMessage, formatPhaseLabel } from './i18n/formatMessage'
import './BucketPanel.css'
import './StoragePanel.css'

type BucketTask = {
  kind: string
  name: string
  phase: string
  message: string
  messageKey?: string
  messageArgs?: Record<string, unknown>
  percentage: number
}

type CacheTask = {
  kind: string
  name?: string
  phase: string
  message: string
  messageKey?: string
  messageArgs?: Record<string, unknown>
  percentage: number
}

type BootstrapTask = {
  tool: string
  phase: string
  message: string
  messageKey?: string
  messageArgs?: Record<string, unknown>
  percentage: number
}

function bucketTaskKey(kind: string, name: string) {
  return `${kind}:${name}`
}

function cacheTaskKey(task: CacheTask) {
  return task.kind === 'purge' && task.name ? `purge:${task.name}` : task.kind
}

function useBootstrapTasks() {
  const [bootstrapTasks, setBootstrapTasks] = useState<BootstrapTask[]>([])

  useEffect(() => {
    const onStart = EventsOn('bootstrap:task:start', (data: { tool?: string }) => {
      if (!data?.tool) return
      setBootstrapTasks((prev) => {
        if (prev.some((t) => t.tool === data.tool)) return prev
        return [
          ...prev,
          {
            tool: data.tool!,
            phase: 'detect',
            message: '',
            percentage: 0,
          },
        ]
      })
    })
    const onProgress = EventsOn(
      'bootstrap:task:progress',
      (data: {
        tool?: string
        phase?: string
        message?: string
        messageKey?: string
        messageArgs?: Record<string, unknown>
        percentage?: number
      }) => {
        if (!data?.tool) return
        setBootstrapTasks((prev) =>
          prev.map((task) =>
            task.tool === data.tool
              ? {
                  ...task,
                  phase: data.phase ?? task.phase,
                  message: data.message ?? task.message,
                  messageKey: data.messageKey ?? task.messageKey,
                  messageArgs: data.messageArgs ?? task.messageArgs,
                  percentage: typeof data.percentage === 'number' ? data.percentage : task.percentage,
                }
              : task,
          ),
        )
      },
    )
    const onComplete = EventsOn('bootstrap:task:complete', (data: { tool?: string }) => {
      if (!data?.tool) return
      setBootstrapTasks((prev) => prev.filter((t) => t.tool !== data.tool))
    })
    const onError = EventsOn('bootstrap:task:error', (data: { tool?: string }) => {
      if (!data?.tool) return
      setBootstrapTasks((prev) => prev.filter((t) => t.tool !== data.tool))
    })
    return () => {
      onStart()
      onProgress()
      onComplete()
      onError()
    }
  }, [])

  return bootstrapTasks
}

function formatBucketTaskMessage(task: BucketTask): string {
  return formatKeyedMessage(task.messageKey, task.messageArgs, task.message)
}

function useBucketTasks() {
  const [bucketTasks, setBucketTasks] = useState<BucketTask[]>([])

  useEffect(() => {
    const onStart = EventsOn('bucket:task:start', (data: { kind?: string; name?: string }) => {
      if (!data?.kind || !data?.name) return
      const key = bucketTaskKey(data.kind, data.name)
      setBucketTasks((prev) => {
        if (prev.some((t) => bucketTaskKey(t.kind, t.name) === key)) return prev
        return [...prev, { kind: data.kind!, name: data.name!, phase: 'start', message: '', percentage: 0 }]
      })
    })
    const onProgress = EventsOn(
      'bucket:task:progress',
      (data: {
        kind?: string
        name?: string
        phase?: string
        message?: string
        messageKey?: string
        messageArgs?: Record<string, unknown>
        percentage?: number
      }) => {
        if (!data?.kind || !data?.name) return
        const key = bucketTaskKey(data.kind, data.name)
        setBucketTasks((prev) =>
          prev.map((task) =>
            bucketTaskKey(task.kind, task.name) === key
              ? {
                  ...task,
                  phase: data.phase ?? task.phase,
                  message: data.message ?? task.message,
                  messageKey: data.messageKey ?? task.messageKey,
                  messageArgs: data.messageArgs ?? task.messageArgs,
                  percentage: typeof data.percentage === 'number' ? data.percentage : task.percentage,
                }
              : task,
          ),
        )
      },
    )
    const onComplete = EventsOn('bucket:task:complete', (data: { kind?: string; name?: string }) => {
      if (!data?.kind || !data?.name) return
      const key = bucketTaskKey(data.kind, data.name)
      setBucketTasks((prev) => prev.filter((t) => bucketTaskKey(t.kind, t.name) !== key))
    })
    const onError = EventsOn('bucket:task:error', (data: { kind?: string; name?: string }) => {
      if (!data?.kind || !data?.name) return
      const key = bucketTaskKey(data.kind, data.name)
      setBucketTasks((prev) => prev.filter((t) => bucketTaskKey(t.kind, t.name) !== key))
    })
    return () => {
      onStart()
      onProgress()
      onComplete()
      onError()
    }
  }, [])

  return bucketTasks
}

const CacheTasksContext = createContext<CacheTask[]>([])

function useCacheTasksState(): CacheTask[] {
  const [cacheTasks, setCacheTasks] = useState<CacheTask[]>([])

  useEffect(() => {
    const upsert = (kind: string, name: string | undefined, patch: Partial<CacheTask>) => {
      const key = kind === 'purge' && name ? `purge:${name}` : kind
      setCacheTasks((prev) => {
        const idx = prev.findIndex((t) => cacheTaskKey(t) === key)
        if (idx < 0) {
          return [
            ...prev,
            {
              kind,
              name,
              phase: patch.phase ?? 'prepare',
              message: patch.message ?? '',
              messageKey: patch.messageKey,
              messageArgs: patch.messageArgs,
              percentage: patch.percentage ?? 0,
            },
          ]
        }
        return prev.map((task, i) => {
          if (i !== idx) return task
          const nextPct =
            typeof patch.percentage === 'number'
              ? Math.max(task.percentage ?? 0, patch.percentage)
              : task.percentage
          return { ...task, ...patch, kind, name, percentage: nextPct }
        })
      })
    }

    const remove = (kind: string, name?: string) => {
      const key = kind === 'purge' && name ? `purge:${name}` : kind
      setCacheTasks((prev) => prev.filter((t) => cacheTaskKey(t) !== key))
    }

    const onStart = EventsOn('cache:task:start', (data: { kind?: string; name?: string }) => {
      if (!data?.kind) return
      const key = data.kind === 'purge' && data.name ? `purge:${data.name}` : data.kind
      setCacheTasks((prev) => {
        const exists = prev.some((t) => cacheTaskKey(t) === key)
        if (exists) {
          return prev.map((task) =>
            cacheTaskKey(task) === key ? { ...task, phase: 'prepare', message: '' } : task,
          )
        }
        return [
          ...prev,
          {
            kind: data.kind!,
            name: data.name,
            phase: 'prepare',
            message: '',
            percentage: 0,
          },
        ]
      })
    })
    const onProgress = EventsOn(
      'cache:task:progress',
      (data: {
        kind?: string
        name?: string
        phase?: string
        message?: string
        messageKey?: string
        messageArgs?: Record<string, unknown>
        percentage?: number
      }) => {
        if (!data?.kind) return
        const patch: Partial<CacheTask> = {
          phase: data.phase ?? 'prepare',
          message: data.message ?? '',
          messageKey: data.messageKey,
          messageArgs: data.messageArgs,
        }
        if (typeof data.percentage === 'number') {
          patch.percentage = data.percentage
        }
        upsert(data.kind, data.name, patch)
      },
    )
    const onComplete = EventsOn('cache:task:complete', (data: { kind?: string; name?: string }) => {
      if (!data?.kind) return
      remove(data.kind, data.name)
    })
    const onError = EventsOn('cache:task:error', (data: { kind?: string; name?: string }) => {
      if (!data?.kind) return
      remove(data.kind, data.name)
    })
    return () => {
      onStart()
      onProgress()
      onComplete()
      onError()
    }
  }, [])

  return cacheTasks
}

export function CacheTasksProvider({ children }: { children: ReactNode }) {
  const cacheTasks = useCacheTasksState()
  return <CacheTasksContext.Provider value={cacheTasks}>{children}</CacheTasksContext.Provider>
}

export function useCacheTasks() {
  return useContext(CacheTasksContext)
}

function CacheProgressBar({ percentage }: { percentage: number }) {
  const pct = Math.min(Math.max(percentage, 0), 100)
  return (
    <div className="progress-bar cache-progress-bar" aria-hidden="true">
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function BucketTabProgress() {
  const { t } = useTranslation()
  const bucketTasks = useBucketTasks()

  const bucketTaskLabel = useCallback(
    (task: BucketTask): string => {
      if (task.kind === 'add') {
        return `${t('bucket.actionAdd')} ${task.name}`
      }
      if (task.kind === 'remove') {
        return `${t('bucket.actionRemove')} ${task.name}`
      }
      if (task.name === '*') {
        return t('bucket.updateAllTask')
      }
      return t('bucket.updateTask', { name: task.name })
    },
    [t],
  )

  if (bucketTasks.length === 0) return null

  return (
    <div className="tab-top-tasks">
      {bucketTasks.map((task) => (
        <div key={bucketTaskKey(task.kind, task.name)} className="card install-progress bucket-tab-progress">
          <div className="card-header">
            <span>{bucketTaskLabel(task)}</span>
            <span className="pill info">{formatPhaseLabel(task.phase)}</span>
          </div>
          <div className="card-body">
            <div
              className={`progress-bar${task.percentage > 0 ? '' : ' is-indeterminate'}`}
              aria-hidden="true"
            >
              <div
                className="progress-bar-fill"
                style={task.percentage > 0 ? { width: `${Math.min(task.percentage, 100)}%` } : undefined}
              />
            </div>
            {task.message || task.messageKey ? (
              <div className="progress-info">
                {task.percentage > 0 ? <span>{Math.round(task.percentage)}%</span> : null}
                <span className="progress-status">{formatBucketTaskMessage(task)}</span>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export function BootstrapTabProgress() {
  const { t } = useTranslation()
  const bootstrapTasks = useBootstrapTasks()

  const bootstrapTaskTitle = useCallback(
    (tool: string) => {
      switch (tool) {
        case 'git':
          return t('appExt.bootstrapGitTaskTitle')
        case 'seven_zip':
          return t('appExt.bootstrapSevenZipTaskTitle')
        case 'wix':
          return t('appExt.bootstrapWixTaskTitle')
        case 'innounp':
          return t('appExt.bootstrapInnounpTaskTitle')
        default:
          return t('appExt.bootstrapTaskTitle', { tool })
      }
    },
    [t],
  )

  if (bootstrapTasks.length === 0) return null

  const formatBootstrapMessage = (task: BootstrapTask) =>
    formatKeyedMessage(task.messageKey, task.messageArgs, task.message)

  return (
    <div className="tab-top-tasks">
      {bootstrapTasks.map((task) => (
        <div key={task.tool} className="card install-progress bootstrap-tab-progress">
          <div className="card-header">
            <span>{bootstrapTaskTitle(task.tool)}</span>
            <span className="pill info">{formatPhaseLabel(task.phase)}</span>
          </div>
          <div className="card-body">
            <div
              className={`progress-bar${task.percentage > 0 ? '' : ' is-indeterminate'}`}
              aria-hidden="true"
            >
              <div
                className="progress-bar-fill"
                style={task.percentage > 0 ? { width: `${Math.min(task.percentage, 100)}%` } : undefined}
              />
            </div>
            {task.message || task.messageKey ? (
              <div className="progress-info">
                {task.percentage > 0 ? <span>{Math.round(task.percentage)}%</span> : null}
                <span className="progress-status">{formatBootstrapMessage(task)}</span>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StorageCacheTabProgress() {
  const { t } = useTranslation()
  const cacheTasks = useCacheTasks()

  const cacheTaskTitle = useCallback(
    (task: CacheTask) => {
      if (task.kind === 'purge' && task.name) {
        return t('storageExt.purgeTaskTitle', { name: task.name })
      }
      return t('storageExt.gcTaskTitle')
    },
    [t],
  )

  if (cacheTasks.length === 0) return null

  const formatCacheMessage = (task: CacheTask) =>
    formatKeyedMessage(task.messageKey, task.messageArgs, task.message)

  return (
    <div className="tab-top-tasks">
      {cacheTasks.map((task) => (
        <div key={cacheTaskKey(task)} className="card install-progress storage-tab-progress">
          <div className="card-header">
            <span>{cacheTaskTitle(task)}</span>
            <span className="pill info">{formatCachePhaseLabel(task.phase)}</span>
          </div>
          <div className="card-body">
            <CacheProgressBar percentage={task.percentage} />
            {task.message || task.messageKey ? (
              <div className="progress-info">
                <span>{Math.round(Math.min(Math.max(task.percentage, 0), 100))}%</span>
                <span className="progress-status">{formatCacheMessage(task)}</span>
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
