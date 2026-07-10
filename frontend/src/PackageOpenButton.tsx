import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useBoundedScrollHeight } from './useBoundedScrollHeight'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  ListPackageLaunchMenu,
  OpenPackageLauncher,
  PickAndAddPackageLaunchExecutable,
  RemovePackageLaunchEntry,
  SetPackageLaunchKind,
  SetPackageLaunchKinds,
} from '../wailsjs/go/main/App'
import TableIconButton from './TableIconButton'
import AnchoredFlipMenu from './AnchoredFlipMenu'

type LaunchKind = 'gui' | 'console' | 'skip'

interface LaunchEntry {
  label: string
  path: string
  relPath: string
  autoKind: string
  kind: string
  userSet: boolean
  openable: boolean
}

interface PackageOpenButtonProps {
  packageName: string
  disabled?: boolean
  onError?: (message: string) => void
}

const LAUNCH_KINDS: LaunchKind[] = ['gui', 'console', 'skip']

function kindLabel(kind: string, t: TFunction): string {
  if (kind === 'gui' || kind === 'console' || kind === 'skip') {
    return t(`package.launch.${kind}`)
  }
  return kind
}

function getKindOptions(t: TFunction) {
  return LAUNCH_KINDS.map((id) => ({
    id,
    label: t(`package.launch.${id}`),
    title: t(`package.launch.${id}Title`),
  }))
}

function canHideOthers(entries: LaunchEntry[], keep: LaunchEntry): boolean {
  return entries.some((entry) => entry.relPath !== keep.relPath && entry.kind !== 'skip')
}

export default function PackageOpenButton({
  packageName,
  disabled,
  onError,
}: PackageOpenButtonProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<LaunchEntry[] | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const reload = useCallback(async () => {
    const items = await ListPackageLaunchMenu(packageName)
    setEntries(items ?? [])
  }, [packageName])

  useEffect(() => {
    let cancelled = false
    setEntries(null)
    void ListPackageLaunchMenu(packageName)
      .then((items) => {
        if (!cancelled) {
          setEntries(items ?? [])
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [packageName])

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const openLauncher = useCallback(
    async (path: string) => {
      setMenuOpen(false)
      try {
        await OpenPackageLauncher(packageName, path)
      } catch (err) {
        onError?.(t('package.launch.openFailed', { error: String(err) }))
      }
    },
    [onError, packageName, t],
  )

  const openLauncherFresh = useCallback(
    async (fallbackPath: string) => {
      setMenuOpen(false)
      try {
        const items = await ListPackageLaunchMenu(packageName)
        const openableItems = (items ?? []).filter((e) => e.openable)
        const path = openableItems[0]?.path ?? fallbackPath
        await OpenPackageLauncher(packageName, path)
      } catch (err) {
        onError?.(t('package.launch.openFailed', { error: String(err) }))
      }
    },
    [onError, packageName, t],
  )

  const setKind = useCallback(
    async (entry: LaunchEntry, kind: LaunchKind) => {
      try {
        await SetPackageLaunchKind(packageName, entry.relPath, kind)
        await reload()
      } catch (err) {
        onError?.(t('package.launch.saveKindFailed', { error: String(err) }))
      }
    },
    [onError, packageName, reload, t],
  )

  const hideOthers = useCallback(
    async (keep: LaunchEntry) => {
      if (!entries) {
        return
      }
      try {
        const updates: Record<string, string> = {}
        for (const entry of entries) {
          if (entry.relPath !== keep.relPath && entry.kind !== 'skip') {
            updates[entry.relPath] = 'skip'
          }
        }
        if (Object.keys(updates).length === 0) {
          return
        }
        await SetPackageLaunchKinds(packageName, updates)
        await reload()
      } catch (err) {
        onError?.(t('package.launch.saveKindFailed', { error: String(err) }))
      }
    },
    [entries, onError, packageName, reload, t],
  )

  const removeEntry = useCallback(
    async (entry: LaunchEntry) => {
      try {
        await RemovePackageLaunchEntry(packageName, entry.relPath)
        await reload()
      } catch (err) {
        onError?.(t('package.launch.deleteFailed', { error: String(err) }))
      }
    },
    [onError, packageName, reload, t],
  )

  const pickAndAdd = useCallback(async () => {
    try {
      const added = await PickAndAddPackageLaunchExecutable(
        packageName,
        t('package.launch.pickDialogTitle'),
        t('package.launch.pickFilterExecutables'),
      )
      if (added) {
        await reload()
      }
    } catch (err) {
      onError?.(t('package.launch.addFailed', { error: String(err) }))
    }
  }, [onError, packageName, reload, t])

  if (entries === null) {
    return null
  }

  const isEmpty = entries.length === 0
  const openable = entries.filter((e) => e.openable)
  const showManageSection = !isEmpty && (entries.length > 1 || entries.some((e) => !e.openable))

  if (isEmpty) {
    return (
      <div className="action-dropdown" ref={rootRef}>
        <TableIconButton
          icon="open"
          hasMenu
          title={t('package.launch.configure')}
          ariaLabel={t('package.launch.configureAria', { name: packageName })}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((open) => !open)
          }}
        />
        {menuOpen ? (
          <AnchoredFlipMenu
            open={menuOpen}
            anchorRef={rootRef}
            onClose={closeMenu}
            className="action-dropdown-menu launch-menu"
            role="menu"
          >
            <LaunchEmptyState disabled={disabled} onAdd={pickAndAdd} />
          </AnchoredFlipMenu>
        ) : null}
      </div>
    )
  }

  if (openable.length === 0) {
    return (
      <div className="action-dropdown" ref={rootRef}>
        <TableIconButton
          icon="open"
          hasMenu
          title={t('package.launch.configure')}
          ariaLabel={t('package.launch.configureAria', { name: packageName })}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((open) => !open)
          }}
        />
        {menuOpen ? (
          <AnchoredFlipMenu
            open={menuOpen}
            anchorRef={rootRef}
            onClose={closeMenu}
            className="action-dropdown-menu launch-menu"
            role="menu"
          >
            <LaunchManageScroll>
              <LaunchManageList
                entries={entries}
                disabled={disabled}
                onSetKind={setKind}
                onHideOthers={hideOthers}
                onRemove={removeEntry}
              />
            </LaunchManageScroll>
          </AnchoredFlipMenu>
        ) : null}
      </div>
    )
  }

  if (openable.length === 1 && entries.length === 1) {
    const launcher = openable[0]
    return (
      <TableIconButton
        icon="open"
        title={t('package.launch.openSingle', {
          label: launcher.label,
          kind: kindLabel(launcher.kind, t),
        })}
        ariaLabel={t('package.launch.openSingleAria', { label: launcher.label, name: packageName })}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          void openLauncherFresh(launcher.path)
        }}
      />
    )
  }

  return (
    <div className="action-dropdown" ref={rootRef}>
      <TableIconButton
        icon="open"
        hasMenu
        title={t('package.launch.open')}
        ariaLabel={t('package.launch.openAria', { name: packageName })}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          void reload().then(() => setMenuOpen((open) => !open))
        }}
      />
      {menuOpen ? (
        <AnchoredFlipMenu
          open={menuOpen}
          anchorRef={rootRef}
          onClose={closeMenu}
          className="action-dropdown-menu launch-menu"
          role="menu"
        >
          <LaunchMenuPanel
            entries={entries}
            openable={openable}
            showManageSection={showManageSection}
            disabled={disabled}
            onOpen={openLauncher}
            onSetKind={setKind}
            onHideOthers={hideOthers}
            onRemove={removeEntry}
          />
        </AnchoredFlipMenu>
      ) : null}
    </div>
  )
}

function LaunchEmptyState({
  disabled,
  onAdd,
}: {
  disabled?: boolean
  onAdd: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="launch-empty-state">
      <p className="launch-empty-hint">{t('package.launch.emptyHint')}</p>
      <button
        type="button"
        className="launch-add-btn"
        disabled={disabled}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void onAdd()
        }}
      >
        {t('package.launch.add')}
      </button>
    </div>
  )
}

function LaunchMenuPanel({
  entries,
  openable,
  showManageSection,
  disabled,
  onOpen,
  onSetKind,
  onHideOthers,
  onRemove,
}: {
  entries: LaunchEntry[]
  openable: LaunchEntry[]
  showManageSection: boolean
  disabled?: boolean
  onOpen: (path: string) => void
  onSetKind: (entry: LaunchEntry, kind: LaunchKind) => void
  onHideOthers: (entry: LaunchEntry) => void
  onRemove: (entry: LaunchEntry) => void
}) {
  const { t } = useTranslation()
  const [manageExpanded, setManageExpanded] = useState(false)

  return (
    <>
      {openable.length > 0 && (
        <ul className="launch-open-list">
          {openable.map((launcher) => (
            <li key={launcher.path} className="launch-open-row" role="none">
              <button
                type="button"
                className="action-dropdown-item launch-open-item"
                role="menuitem"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation()
                  void onOpen(launcher.path)
                }}
              >
                <span className="launch-open-name">{launcher.label}</span>
                <span className="launch-open-kind">{kindLabel(launcher.kind, t)}</span>
              </button>
              {canHideOthers(entries, launcher) ? (
                <button
                  type="button"
                  className="launch-hide-others-btn"
                  disabled={disabled}
                  title={t('package.launch.hideOthersTitle', { label: launcher.label })}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void onHideOthers(launcher)
                  }}
                >
                  {t('package.launch.hideOthers')}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {showManageSection ? (
        <div className="launch-manage-section">
          <button
            type="button"
            className="launch-menu-toggle"
            aria-expanded={manageExpanded}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setManageExpanded((open) => !open)
            }}
          >
            <span className="launch-menu-toggle-label">{t('package.launch.heading')}</span>
            <span className="launch-menu-toggle-meta">
              {manageExpanded ? t('package.launch.manageCollapse') : t('package.launch.manageExpand')}
            </span>
          </button>
          {manageExpanded ? (
            <LaunchManageScroll>
              <LaunchManageList
                entries={entries}
                disabled={disabled}
                onSetKind={onSetKind}
                onHideOthers={onHideOthers}
                onRemove={onRemove}
              />
            </LaunchManageScroll>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

function LaunchManageScroll({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const maxHeight = useBoundedScrollHeight(scrollRef, true)

  return (
    <div
      ref={scrollRef}
      className="launch-manage-scroll"
      style={maxHeight ? { maxHeight } : undefined}
      onWheel={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

function LaunchManageList({
  entries,
  disabled,
  onSetKind,
  onHideOthers,
  onRemove,
}: {
  entries: LaunchEntry[]
  disabled?: boolean
  onSetKind: (entry: LaunchEntry, kind: LaunchKind) => void
  onHideOthers: (entry: LaunchEntry) => void
  onRemove: (entry: LaunchEntry) => void
}) {
  const { t } = useTranslation()
  const kindOptions = getKindOptions(t)

  return (
    <ul className="launch-manage-list">
      {entries.map((entry) => (
        <li key={entry.path} className="launch-manage-row">
          <div className="launch-manage-head">
            <span className={`launch-manage-name${entry.openable ? '' : ' is-hidden'}`}>
              {entry.label}
            </span>
            <div className="launch-manage-actions">
              {entry.openable && canHideOthers(entries, entry) ? (
                <button
                  type="button"
                  className="launch-hide-others-btn launch-hide-others-btn-inline"
                  disabled={disabled}
                  title={t('package.launch.hideOthersTitle', { label: entry.label })}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void onHideOthers(entry)
                  }}
                >
                  {t('package.launch.hideOthers')}
                </button>
              ) : null}
              <button
                type="button"
                className="launch-delete-btn"
                disabled={disabled}
                title={t('package.launch.deleteTitle', { label: entry.label })}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  void onRemove(entry)
                }}
              >
                {t('package.launch.delete')}
              </button>
            </div>
          </div>
          <span
            className="launch-kind-options"
            role="group"
            aria-label={t('package.launch.kindAria', { label: entry.label })}
          >
            {kindOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`launch-kind-btn${entry.kind === opt.id ? ' is-active' : ''}`}
                title={opt.title}
                disabled={disabled}
                onMouseDown={(e) => {
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (entry.kind !== opt.id) {
                    void onSetKind(entry, opt.id)
                  }
                }}
              >
                {opt.label}
              </button>
            ))}
          </span>
        </li>
      ))}
    </ul>
  )
}
