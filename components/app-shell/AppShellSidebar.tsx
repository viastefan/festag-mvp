'use client'

import { useEffect, useRef, useState } from 'react'
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
} from '@phosphor-icons/react'
import {
  APP_SHELL_PRIMARY_NAV,
  APP_SHELL_WORKSPACE_NAV,
  APP_SHELL_SECONDARY_NAV,
  isAppShellNavActive,
} from '@/components/app-shell/app-shell-nav'
import FestagHelpPanel from '@/components/portal/FestagHelpPanel'
import { getDisplayName, getFullDisplayName, type UserProfile } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { getRememberedWorkspaceName, rememberWorkspaceName } from '@/lib/pending-workspace'
import { openWorkspaceCreateWizard, WORKSPACE_CREATED_EVENT } from '@/lib/workspace-create-open'
import { useNotifications } from '@/hooks/useNotifications'

type Props = {
  user: UserProfile | null
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function AppShellSidebar({ user, collapsed, onToggleCollapse }: Props) {
  const pathname = usePathname() || '/overview'
  const displayName = getFullDisplayName(user) || getDisplayName(user) || 'You'
  const [workspaceLabel, setWorkspaceLabel] = useState(
    () => getRememberedWorkspaceName() || 'No workspace',
  )
  const hasWorkspace = workspaceLabel !== 'No workspace'
  const settingsActive =
    pathname === '/settings' ||
    pathname.startsWith('/settings/') ||
    isAppShellNavActive(pathname, '/overview/settings')

  const [wsOpen, setWsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const helpTriggerRef = useRef<HTMLButtonElement>(null)
  const { items: notifications, unread, markRead } = useNotifications({ limit: 12 })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!alive || !authUser) return

        const { data: owned } = await supabase
          .from('workspaces')
          .select('id, name')
          .eq('primary_owner_id', authUser.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()

        let name = typeof owned?.name === 'string' ? owned.name.trim() : ''

        if (!name) {
          const { data: member } = await supabase
            .from('workspace_members')
            .select('workspace_id')
            .eq('user_id', authUser.id)
            .limit(1)
            .maybeSingle()
          const wsId = member?.workspace_id
          if (wsId) {
            const { data: ws } = await supabase
              .from('workspaces')
              .select('name')
              .eq('id', wsId)
              .maybeSingle()
            name = typeof ws?.name === 'string' ? ws.name.trim() : ''
          }
        }

        if (!alive) return
        if (name) {
          setWorkspaceLabel(name)
          rememberWorkspaceName(name)
        } else {
          setWorkspaceLabel('No workspace')
        }
      } catch { /* best-effort */ }
    })()
    return () => { alive = false }
  }, [user?.id])

  useEffect(() => {
    function onCreated(e: Event) {
      const name = (e as CustomEvent<{ name?: string }>).detail?.name
      if (typeof name === 'string' && name.trim()) {
        setWorkspaceLabel(name.trim())
        rememberWorkspaceName(name.trim())
      }
    }
    window.addEventListener(WORKSPACE_CREATED_EVENT, onCreated)
    return () => window.removeEventListener(WORKSPACE_CREATED_EVENT, onCreated)
  }, [])

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

  function openSearch() {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

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
            {collapsed ? (
              <span className="fas-ws-mark" aria-hidden="true">WS</span>
            ) : (
              <span className="fas-ws-copy">
                <span className="fas-ws-text">
                  <span className="fas-ws-label">Workspace</span>
                  <span className="fas-ws-value">{workspaceLabel}</span>
                </span>
                <CaretDown size={6} weight="bold" className="fas-ws-caret" aria-hidden />
              </span>
            )}
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
            {hasWorkspace ? (
              <div className="fas-popover-title">{workspaceLabel}</div>
            ) : (
              <div className="fas-popover-title">Du hast noch keinen Workspace.</div>
            )}
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

        <div className="fas-nav-group">
          {APP_SHELL_WORKSPACE_NAV.map((item) => {
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
