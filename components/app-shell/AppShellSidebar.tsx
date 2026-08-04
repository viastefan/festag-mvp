'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MagnifyingGlass,
  SidebarSimple,
  CaretDown,
  Plus,
  GearSix,
  Bell,
  Question,
  Check,
} from '@phosphor-icons/react'
import {
  APP_SHELL_PRIMARY_NAV,
  APP_SHELL_SECONDARY_NAV,
  isAppShellNavActive,
} from '@/components/app-shell/app-shell-nav'
import FestagHelpPanel from '@/components/portal/FestagHelpPanel'
import { getDisplayName, getFullDisplayName, type UserProfile } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { getRememberedWorkspaceName, rememberWorkspaceName } from '@/lib/pending-workspace'
import { openWorkspaceCreateWizard, openWorkspaceRename, WORKSPACE_CREATED_EVENT, WORKSPACE_RENAMED_EVENT } from '@/lib/workspace-create-open'
import {
  emitWorkspaceSwitched,
  getActiveWorkspaceId,
  rememberActiveWorkspace,
  WORKSPACE_SWITCHED_EVENT,
} from '@/lib/active-workspace'
import { listWorkspacesForUser, type WorkspaceListItem } from '@/lib/workspace/resolve'
import { useNotifications } from '@/hooks/useNotifications'

type Props = {
  user: UserProfile | null
  collapsed: boolean
  onToggleCollapse: () => void
}

type RecentItem = {
  id: string
  label: string
  href: string
  age: string
}

const RECENT_EXPAND_KEY = 'festag-os-recent-expanded'

function truncateLabel(text: string, max = 34) {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  return `${t.slice(0, max - 2).trimEnd()}..`
}

function fmtRecentAge(iso?: string | null): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diff = Date.now() - t
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'jetzt'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function workspaceInitial(name: string): string {
  const clean = name.replace(/^No workspace$/i, '').trim()
  if (!clean) return 'F'
  return clean.charAt(0).toUpperCase()
}

function readExpanded(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key)
    if (v === '0') return false
    if (v === '1') return true
  } catch { /* noop */ }
  return fallback
}

function writeExpanded(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch { /* noop */ }
}

export default function AppShellSidebar({ user, collapsed, onToggleCollapse }: Props) {
  const pathname = usePathname() || '/overview'
  const displayName = getFullDisplayName(user) || getDisplayName(user) || 'You'
  const [workspaceLabel, setWorkspaceLabel] = useState(
    () => getRememberedWorkspaceName() || 'No workspace',
  )
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => getActiveWorkspaceId())
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([])
  const hasWorkspace = workspaceLabel !== 'No workspace' || Boolean(workspaceId)
  const settingsActive =
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    isAppShellNavActive(pathname, '/overview/settings')

  const [wsOpen, setWsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [recentExpanded, setRecentExpanded] = useState(true)
  const headerRef = useRef<HTMLDivElement>(null)
  const helpTriggerRef = useRef<HTMLButtonElement>(null)
  const { items: notifications, unread, markRead } = useNotifications({ limit: 12 })

  useEffect(() => {
    setRecentExpanded(readExpanded(RECENT_EXPAND_KEY, true))
  }, [])

  const loadWorkspaces = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setWorkspaces([])
        setWorkspaceLabel('No workspace')
        setWorkspaceId(null)
        return
      }

      const list = await listWorkspacesForUser(supabase as any, authUser.id)
      setWorkspaces(list)

      const preferred = getActiveWorkspaceId()
      const active =
        (preferred && list.find((w) => w.id === preferred)) ||
        list[0] ||
        null

      if (active) {
        setWorkspaceId(active.id)
        setWorkspaceLabel(active.name)
        rememberActiveWorkspace(active.id, active.name)
        rememberWorkspaceName(active.name)
      } else {
        setWorkspaceId(null)
        setWorkspaceLabel('No workspace')
      }
    } catch { /* best-effort */ }
  }, [])

  useEffect(() => {
    void loadWorkspaces()
  }, [loadWorkspaces, user?.id])

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/recent-executed', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      const rows = Array.isArray(data?.items) ? data.items : []
      setRecent(
        rows.map((c: { id: string; label: string; href: string; at?: string }) => ({
          id: c.id,
          label: truncateLabel(c.label),
          href: c.href,
          age: fmtRecentAge(c.at),
        })),
      )
    } catch {
      /* keep previous */
    }
  }, [])

  useEffect(() => {
    void loadRecent()
  }, [loadRecent, user?.id])

  useEffect(() => {
    function onCreated(e: Event) {
      const detail = (e as CustomEvent<{ name?: string; id?: string }>).detail
      if (typeof detail?.id === 'string' && detail.id) {
        rememberActiveWorkspace(detail.id, detail.name)
        setWorkspaceId(detail.id)
      }
      if (typeof detail?.name === 'string' && detail.name.trim()) {
        setWorkspaceLabel(detail.name.trim())
        rememberWorkspaceName(detail.name.trim())
      }
      void loadWorkspaces()
    }
    function onRenamed(e: Event) {
      const detail = (e as CustomEvent<{ name?: string; id?: string }>).detail
      if (typeof detail?.name === 'string' && detail.name.trim()) {
        setWorkspaceLabel(detail.name.trim())
        rememberWorkspaceName(detail.name.trim())
        if (detail.id) rememberActiveWorkspace(detail.id, detail.name.trim())
      }
      void loadWorkspaces()
    }
    function onSwitched(e: Event) {
      const detail = (e as CustomEvent<{ name?: string; id?: string }>).detail
      if (detail?.id) setWorkspaceId(detail.id)
      if (detail?.name) setWorkspaceLabel(detail.name)
    }
    window.addEventListener(WORKSPACE_CREATED_EVENT, onCreated)
    window.addEventListener(WORKSPACE_RENAMED_EVENT, onRenamed)
    window.addEventListener(WORKSPACE_SWITCHED_EVENT, onSwitched)
    return () => {
      window.removeEventListener(WORKSPACE_CREATED_EVENT, onCreated)
      window.removeEventListener(WORKSPACE_RENAMED_EVENT, onRenamed)
      window.removeEventListener(WORKSPACE_SWITCHED_EVENT, onSwitched)
    }
  }, [loadWorkspaces])

  useEffect(() => {
    if (!wsOpen && !notifOpen) return
    function onDown(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setWsOpen(false)
        setNotifOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setWsOpen(false)
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [wsOpen, notifOpen])

  function goCreateWorkspace() {
    setWsOpen(false)
    openWorkspaceCreateWizard()
  }

  function goRenameWorkspace() {
    setWsOpen(false)
    openWorkspaceRename({
      workspaceId: workspaceId || undefined,
      name: hasWorkspace ? workspaceLabel : undefined,
    })
  }

  function switchWorkspace(ws: WorkspaceListItem) {
    setWsOpen(false)
    if (ws.id === workspaceId) return
    emitWorkspaceSwitched({ id: ws.id, name: ws.name })
    setWorkspaceId(ws.id)
    setWorkspaceLabel(ws.name)
  }

  function openSearch() {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  const activeRecentId = recent.find((r) => pathname === r.href || pathname.startsWith(`${r.href.split('?')[0]}/`))?.id

  return (
    <aside
      className={`fas-sidebar${collapsed ? ' is-collapsed' : ''}`}
      aria-label="Festag navigation"
      data-collapsed={collapsed ? '1' : '0'}
    >
      <div className="fas-sidebar-top" ref={headerRef}>
        <div className="fas-sidebar-header">
          <button
            type="button"
            className={`fas-ws-trigger${wsOpen ? ' is-open' : ''}`}
            title={workspaceLabel}
            aria-label="Workspace-Menü"
            aria-haspopup="menu"
            aria-expanded={wsOpen}
            onClick={() => {
              setNotifOpen(false)
              setWsOpen((v) => !v)
            }}
          >
            <span className="fas-ws-mark" aria-hidden="true">
              {workspaceInitial(workspaceLabel)}
            </span>
            {!collapsed ? (
              <span className="fas-ws-copy">
                <span className="fas-ws-value">{workspaceLabel}</span>
                <CaretDown size={6} weight="bold" className="fas-ws-caret" aria-hidden />
              </span>
            ) : null}
          </button>

          <div className="fas-sidebar-utils">
            {!collapsed ? (
              <>
                <button
                  type="button"
                  className="fas-sidebar-icon"
                  aria-label="Suche"
                  title="Suche"
                  onClick={openSearch}
                >
                  <MagnifyingGlass size={15} weight="regular" />
                </button>
                <button
                  type="button"
                  className="fas-sidebar-icon"
                  aria-label="Benachrichtigungen"
                  title="Benachrichtigungen"
                  aria-expanded={notifOpen}
                  onClick={() => {
                    setWsOpen(false)
                    setNotifOpen((v) => !v)
                  }}
                >
                  <Bell size={15} weight="regular" />
                  {unread > 0 ? <span className="fas-notif-dot" aria-hidden="true" /> : null}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="fas-sidebar-icon fas-sidebar-collapse"
              aria-label={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
              title={collapsed ? 'Ausklappen' : 'Einklappen'}
              onClick={onToggleCollapse}
            >
              <SidebarSimple size={15} weight="regular" />
            </button>
          </div>
        </div>

        {wsOpen ? (
          <div className="fas-popover fas-popover-left fas-ws-popover" role="menu">
            {workspaces.length > 0 ? (
              <div className="fas-ws-list" role="group" aria-label="Workspaces">
                {workspaces.map((ws) => {
                  const active = ws.id === workspaceId
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      className={`fas-popover-item fas-ws-switch-item${active ? ' is-active' : ''}`}
                      onClick={() => switchWorkspace(ws)}
                    >
                      <span className="fas-ws-switch-mark" aria-hidden="true">
                        {workspaceInitial(ws.name)}
                      </span>
                      <span className="fas-ws-switch-name">{ws.name}</span>
                      {active ? <Check size={14} weight="bold" className="fas-ws-switch-check" aria-hidden /> : null}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="fas-popover-title">Du hast noch keinen Workspace.</div>
            )}
            {hasWorkspace ? (
              <button type="button" className="fas-popover-item" onClick={goRenameWorkspace}>
                Workspace umbenennen
              </button>
            ) : null}
            <button type="button" className="fas-popover-item" onClick={goCreateWorkspace}>
              <Plus size={14} weight="bold" />
              Workspace erstellen
            </button>
          </div>
        ) : null}

        {notifOpen ? (
          <div className="fas-popover fas-popover-left fas-ws-popover fas-notif-popover" role="dialog" aria-label="Benachrichtigungen">
            {notifications.length === 0 ? (
              <>
                <div className="fas-popover-title">Noch keine Benachrichtigungen.</div>
                <p className="fas-popover-note">
                  Einladungen und Projekt-Updates erscheinen hier.
                </p>
              </>
            ) : (
              <ul className="fas-notif-list">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`fas-notif-card${n.read ? '' : ' is-unread'}`}
                      onClick={() => {
                        void markRead(n.id)
                        if (n.link) window.location.href = n.link
                        setNotifOpen(false)
                      }}
                    >
                      <span className="fas-notif-card-title">{n.title}</span>
                      <span className="fas-notif-card-body">
                        {n.body || n.message || ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <nav className="fas-nav">
        {APP_SHELL_PRIMARY_NAV.map((item) => {
          const Icon = item.icon
          const active = isAppShellNavActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`fas-nav-link${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} weight="light" />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          )
        })}

        <div className="fas-nav-after-group">
          {APP_SHELL_SECONDARY_NAV.map((item) => {
            const Icon = item.icon
            const active = isAppShellNavActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`fas-nav-link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={16} weight="light" />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            )
          })}
        </div>
      </nav>

      {!collapsed ? (
        <div className="fas-recent">
          <button
            type="button"
            className="fas-recent-head"
            aria-expanded={recentExpanded}
            onClick={() => {
              setRecentExpanded((v) => {
                const next = !v
                writeExpanded(RECENT_EXPAND_KEY, next)
                return next
              })
            }}
          >
            <span>Zuletzt ausgeführt</span>
            <CaretDown
              size={10}
              weight="bold"
              className={`fas-recent-caret${recentExpanded ? ' is-open' : ''}`}
              aria-hidden
            />
          </button>
          <div className={`fas-recent-body${recentExpanded ? ' is-open' : ''}`}>
            <div className="fas-recent-list" role="list">
              {recent.length === 0 ? (
                <p className="fas-recent-empty">Tagro-Chats und Entscheidungen erscheinen hier.</p>
              ) : (
                recent.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    role="listitem"
                    className={`fas-recent-item${activeRecentId === item.id ? ' is-active' : ''}`}
                    title={item.label}
                  >
                    <span className="fas-recent-text">{item.label}</span>
                    {item.age ? <span className="fas-recent-age">{item.age}</span> : null}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="fas-sidebar-footer">
        <Link
          href="/settings"
          className={`fas-settings-link${settingsActive ? ' is-active' : ''}`}
          aria-current={settingsActive ? 'page' : undefined}
          title="Einstellungen"
        >
          <GearSix size={16} weight="light" />
          {!collapsed ? <span>Einstellungen</span> : null}
        </Link>
        <FestagHelpPanel
          open={helpOpen}
          onOpenChange={setHelpOpen}
          anchorRef={helpTriggerRef}
          userName={displayName}
          railCollapsed={collapsed}
          trigger={(
            <button
              ref={helpTriggerRef}
              type="button"
              className="fas-help-btn"
              aria-label="Festag Help"
              title="Festag Help"
              aria-expanded={helpOpen}
              onClick={() => setHelpOpen((v) => !v)}
            >
              {collapsed ? <Question size={15} weight="regular" /> : 'Help'}
            </button>
          )}
        />
      </div>
    </aside>
  )
}
