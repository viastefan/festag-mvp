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
import { getDisplayName, getFullDisplayName, getInitials, type UserProfile } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { getRememberedWorkspaceName, rememberWorkspaceName } from '@/lib/pending-workspace'
import { openWorkspaceCreateWizard, openWorkspaceManage, openWorkspaceRename, WORKSPACE_CREATED_EVENT, WORKSPACE_DELETED_EVENT, WORKSPACE_RENAMED_EVENT, WORKSPACE_UPDATED_EVENT } from '@/lib/workspace-create-open'
import {
  emitWorkspaceSwitched,
  getActiveWorkspaceId,
  rememberActiveWorkspace,
  clearActiveWorkspaceId,
  WORKSPACE_SWITCHED_EVENT,
} from '@/lib/active-workspace'
import { listWorkspacesForUser, type WorkspaceListItem } from '@/lib/workspace/resolve'
import { useNotifications } from '@/hooks/useNotifications'

type Props = {
  user: UserProfile | null
  /** User locked the panel open — the page reflows around it. */
  pinned: boolean
  onTogglePin: () => void
  /** Hover/focus expansion — floats over the canvas, page must not reflow. */
  onPeekChange: (peek: boolean) => void
}

type RecentItem = {
  id: string
  label: string
  href: string
  age: string
}

const RECENT_EXPAND_KEY = 'festag-os-recent-expanded'

/* Short in, longer out: opening should feel instant, closing should forgive the
   diagonal slide toward a nav label. */
const PEEK_IN_MS = 55
const PEEK_OUT_MS = 190

/** Hover-to-expand is a pointer affordance — a touch rail must not flicker. */
function hasFinePointer(): boolean {
  try {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  } catch {
    return false
  }
}

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
  const clean = name.replace(/^Kein Workspace$/i, '').replace(/^No workspace$/i, '').trim()
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

export default function AppShellSidebar({
  user,
  pinned,
  onTogglePin,
  onPeekChange,
}: Props) {
  const pathname = usePathname() || '/overview'
  const displayName = getFullDisplayName(user) || getDisplayName(user) || 'You'
  const rawInitials = getInitials(user)
  const initials = rawInitials && rawInitials !== '??' ? rawInitials : ''
  /* Server-safe seeds — the remembered workspace is restored after mount,
     the way this file already restores the Recent section. */
  const [workspaceLabel, setWorkspaceLabel] = useState('Kein Workspace')
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([])
  const hasWorkspace =
    Boolean(workspaceId) ||
    (workspaceLabel !== 'Kein Workspace' && workspaceLabel !== 'No workspace')
  const settingsActive =
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    isAppShellNavActive(pathname, '/overview/settings')

  const [wsOpen, setWsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [recentExpanded, setRecentExpanded] = useState(true)
  const [deferredReady, setDeferredReady] = useState(false)
  const [peeking, setPeeking] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const asideRef = useRef<HTMLElement>(null)
  const helpTriggerRef = useRef<HTMLButtonElement>(null)
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { items: notifications, unread, markRead } = useNotifications({
    limit: 12,
    enabled: deferredReady || notifOpen,
  })

  useEffect(() => {
    setRecentExpanded(readExpanded(RECENT_EXPAND_KEY, true))
  }, [])

  /* localStorage is invisible to the server. Reading it during render painted
     the remembered name where the SSR markup said "Kein Workspace", which is
     the ordinary case for anyone who has opened Festag before:
       Text content did not match. Server: "Kein Workspace" Client: "Workspace aa"
     Restoring after mount still beats the workspace fetch, so nothing waits. */
  useEffect(() => {
    const name = getRememberedWorkspaceName()
    if (name) setWorkspaceLabel(name)
    const id = getActiveWorkspaceId()
    if (id) setWorkspaceId(id)
  }, [])

  /* An open popover keeps the panel wide even once the pointer has left it —
     otherwise the rail snaps shut under the menu the user is reading. */
  const menuOpen = wsOpen || notifOpen || helpOpen
  const expanded = pinned || peeking || menuOpen

  const schedulePeek = useCallback((next: boolean) => {
    if (peekTimer.current !== null) {
      globalThis.clearTimeout(peekTimer.current)
      peekTimer.current = null
    }
    if (next && !hasFinePointer()) return
    peekTimer.current = globalThis.setTimeout(() => {
      peekTimer.current = null
      setPeeking(next)
    }, next ? PEEK_IN_MS : PEEK_OUT_MS)
  }, [])

  useEffect(() => () => {
    if (peekTimer.current !== null) globalThis.clearTimeout(peekTimer.current)
  }, [])

  /* Report only the *unpinned* expansion: pinned width is the shell's own class. */
  useEffect(() => {
    onPeekChange(!pinned && expanded)
  }, [onPeekChange, pinned, expanded])

  /* Pinning wins over a stale peek flag left behind by the pointer. */
  useEffect(() => {
    if (pinned) setPeeking(false)
  }, [pinned])

  useEffect(() => {
    const run = () => setDeferredReady(true)
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(run, { timeout: 1800 })
      return () => w.cancelIdleCallback?.(id)
    }
    const id = globalThis.setTimeout(run, 400)
    return () => globalThis.clearTimeout(id)
  }, [])

  const loadWorkspaces = useCallback(async () => {
    try {
      const supabase = createClient()
      const authUserId = user?.id
      let userId = authUserId || null
      if (!userId) {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        userId = authUser?.id || null
      }
      if (!userId) {
        setWorkspaces([])
        setWorkspaceLabel('Kein Workspace')
        setWorkspaceId(null)
        return
      }

      const list = await listWorkspacesForUser(supabase as any, userId)
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
        setWorkspaceLabel('Kein Workspace')
        clearActiveWorkspaceId()
      }
    } catch { /* best-effort */ }
  }, [user?.id])

  useEffect(() => {
    void loadWorkspaces()
  }, [loadWorkspaces])

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
    if (!deferredReady) return
    void loadRecent()
  }, [deferredReady, loadRecent, user?.id])

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
    function onDeleted() {
      clearActiveWorkspaceId()
      setWorkspaceId(null)
      setWorkspaceLabel('Kein Workspace')
      void loadWorkspaces()
    }
    function onUpdated() {
      void loadWorkspaces()
    }
    function onSwitched(e: Event) {
      const detail = (e as CustomEvent<{ name?: string; id?: string }>).detail
      if (detail?.id) setWorkspaceId(detail.id)
      if (detail?.name) setWorkspaceLabel(detail.name)
    }
    window.addEventListener(WORKSPACE_CREATED_EVENT, onCreated)
    window.addEventListener(WORKSPACE_RENAMED_EVENT, onRenamed)
    window.addEventListener(WORKSPACE_DELETED_EVENT, onDeleted)
    window.addEventListener(WORKSPACE_UPDATED_EVENT, onUpdated)
    window.addEventListener(WORKSPACE_SWITCHED_EVENT, onSwitched)
    return () => {
      window.removeEventListener(WORKSPACE_CREATED_EVENT, onCreated)
      window.removeEventListener(WORKSPACE_RENAMED_EVENT, onRenamed)
      window.removeEventListener(WORKSPACE_DELETED_EVENT, onDeleted)
      window.removeEventListener(WORKSPACE_UPDATED_EVENT, onUpdated)
      window.removeEventListener(WORKSPACE_SWITCHED_EVENT, onSwitched)
    }
  }, [loadWorkspaces, workspaceId])

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

  function goManageWorkspace(section?: 'name' | 'icon' | 'template' | 'delete') {
    setWsOpen(false)
    openWorkspaceManage({
      workspaceId: workspaceId || undefined,
      name: hasWorkspace ? workspaceLabel : undefined,
      section,
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
      ref={asideRef}
      className={
        `fas-sidebar${expanded ? ' is-expanded' : ' is-collapsed'}` +
        `${expanded && !pinned ? ' is-peek' : ''}` +
        `${menuOpen ? ' has-popover' : ''}`
      }
      aria-label="Festag navigation"
      data-collapsed={expanded ? '0' : '1'}
      onMouseEnter={() => schedulePeek(true)}
      onMouseLeave={() => schedulePeek(false)}
      onFocusCapture={() => setPeeking(true)}
      onBlurCapture={(e) => {
        const next = e.relatedTarget as Node | null
        if (next && asideRef.current?.contains(next)) return
        if (asideRef.current?.matches(':hover')) return
        setPeeking(false)
      }}
    >
      <div className="fas-sidebar-top" ref={headerRef}>
        <div className="fas-sidebar-header">
          <button
            type="button"
            className="fas-sidebar-icon fas-sidebar-collapse"
            aria-label={pinned ? 'Sidebar einklappen' : 'Sidebar offen halten'}
            title={pinned ? 'Einklappen' : 'Offen halten'}
            aria-pressed={pinned}
            onClick={(e) => {
              e.stopPropagation()
              setWsOpen(false)
              setNotifOpen(false)
              onTogglePin()
            }}
          >
            <SidebarSimple size={15} weight="regular" />
          </button>

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
            <span className={`fas-ws-mark${!initials ? ' is-empty' : ''}`} aria-hidden="true">
              {initials}
            </span>
            <span className="fas-ws-copy">
              <span className="fas-ws-text">
                <span className="fas-ws-label">Workspace</span>
                <span className="fas-ws-value">{workspaceLabel}</span>
              </span>
              <CaretDown size={6} weight="bold" className="fas-ws-caret" aria-hidden />
            </span>
          </button>

          <div className="fas-sidebar-utils">
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
              <>
                <button type="button" className="fas-popover-item" onClick={() => goManageWorkspace()}>
                  Workspace verwalten
                </button>
                <button type="button" className="fas-popover-item" onClick={goRenameWorkspace}>
                  Workspace umbenennen
                </button>
              </>
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

      <nav className="fas-nav" aria-label="Workspace">
        <div className="fas-nav-group">
          {APP_SHELL_PRIMARY_NAV.map((item) => {
            const Icon = item.icon
            const active = isAppShellNavActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`fas-nav-link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={expanded ? undefined : item.label}
              >
                <Icon size={16} weight="light" />
                <span className="fas-nav-label">{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="fas-nav-group fas-nav-after-group">
          {APP_SHELL_SECONDARY_NAV.map((item) => {
            const Icon = item.icon
            const active = isAppShellNavActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`fas-nav-link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                title={expanded ? undefined : item.label}
              >
                <Icon size={16} weight="light" />
                <span className="fas-nav-label">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {expanded ? (
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
          <span className="fas-nav-label">Einstellungen</span>
        </Link>
        <FestagHelpPanel
          open={helpOpen}
          onOpenChange={setHelpOpen}
          anchorRef={helpTriggerRef}
          userName={displayName}
          railCollapsed={!expanded}
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
              {expanded ? 'Help' : <Question size={15} weight="regular" />}
            </button>
          )}
        />
      </div>
    </aside>
  )
}
