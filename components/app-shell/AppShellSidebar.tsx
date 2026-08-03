'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  APP_SHELL_CREATE_WORKSPACE_HREF,
  isAppShellNavActive,
} from '@/components/app-shell/app-shell-nav'
import FestagHelpPanel from '@/components/portal/FestagHelpPanel'
import { prepareAuthRouteTransition } from '@/lib/auth-theme'
import { getDisplayName, getFullDisplayName, type UserProfile } from '@/lib/hooks/useUser'

type Props = {
  user: UserProfile | null
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function AppShellSidebar({ user, collapsed, onToggleCollapse }: Props) {
  const pathname = usePathname() || '/overview'
  const router = useRouter()
  const displayName = getFullDisplayName(user) || getDisplayName(user) || 'You'
  const workspaceLabel = 'No workspace'
  const settingsActive = isAppShellNavActive(pathname, '/overview/settings')

  const [wsOpen, setWsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const helpTriggerRef = useRef<HTMLButtonElement>(null)

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
    prepareAuthRouteTransition(APP_SHELL_CREATE_WORKSPACE_HREF)
    router.push(APP_SHELL_CREATE_WORKSPACE_HREF)
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
            <div className="fas-popover-title">Du hast noch keinen Workspace.</div>
            <button type="button" className="fas-popover-item" onClick={goCreateWorkspace}>
              <Plus size={14} weight="bold" />
              Workspace erstellen
            </button>
          </div>
        ) : null}

        {notifOpen ? (
          <div className="fas-popover fas-popover-left fas-ws-popover" role="dialog" aria-label="Benachrichtigungen">
            <div className="fas-popover-title">Noch keine Benachrichtigungen.</div>
            <p className="fas-popover-note">
              Erstelle einen Workspace, um Updates von Tagro zu erhalten.
            </p>
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
          href="/overview/settings"
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
