'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  MagnifyingGlass,
  SidebarSimple,
  CaretDown,
  Plus,
} from '@phosphor-icons/react'
import {
  APP_SHELL_PRIMARY_NAV,
  APP_SHELL_WORKSPACE_NAV,
  APP_SHELL_SECONDARY_NAV,
  APP_SHELL_CREATE_WORKSPACE_HREF,
  isAppShellNavActive,
  appShellRoleLabel,
} from '@/components/app-shell/app-shell-nav'
import { prepareAuthRouteTransition } from '@/lib/auth-theme'
import { getDisplayName, getFullDisplayName, getInitials, type UserProfile } from '@/lib/hooks/useUser'

type Props = {
  user: UserProfile | null
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function AppShellSidebar({ user, collapsed, onToggleCollapse }: Props) {
  const pathname = usePathname() || '/overview'
  const router = useRouter()
  const displayName = getFullDisplayName(user) || getDisplayName(user) || 'You'
  const role = appShellRoleLabel(user?.role)
  const initials = getInitials(user)
  const workspaceLabel = 'No workspace'

  const [wsOpen, setWsOpen] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!wsOpen) return
    function onDown(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setWsOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setWsOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [wsOpen])

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
            aria-label="Workspace menu"
            aria-haspopup="menu"
            aria-expanded={wsOpen}
            onClick={() => setWsOpen((v) => !v)}
          >
            {collapsed ? (
              <span className="fas-ws-mark" aria-hidden="true">WS</span>
            ) : (
              <>
                <span className="fas-ws-name">{workspaceLabel}</span>
                <CaretDown size={9} weight="bold" className="fas-ws-caret" aria-hidden />
              </>
            )}
          </button>

          <div className="fas-sidebar-utils">
            {!collapsed ? (
              <button
                type="button"
                className="fas-sidebar-icon"
                aria-label="Search"
                title="Search"
                onClick={openSearch}
              >
                <MagnifyingGlass size={14} weight="regular" />
              </button>
            ) : null}
            <button
              type="button"
              className="fas-sidebar-icon fas-sidebar-collapse"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand' : 'Collapse'}
              onClick={onToggleCollapse}
            >
              <SidebarSimple size={15} weight="regular" />
            </button>
          </div>
        </div>

        {wsOpen ? (
          <div className="fas-popover fas-popover-left fas-ws-popover" role="menu">
            <div className="fas-popover-title">You don&apos;t have a workspace yet.</div>
            <button type="button" className="fas-popover-item" onClick={goCreateWorkspace}>
              <Plus size={14} weight="bold" />
              Create Workspace
            </button>
            <div className="fas-popover-sep" />
            <Link
              href="/overview/settings"
              className="fas-popover-item"
              onClick={() => setWsOpen(false)}
            >
              Settings
            </Link>
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

      <Link
        href="/overview/settings"
        className="fas-profile"
        title={collapsed ? `${displayName} — Settings` : 'Settings'}
      >
        <span className="fas-profile-avatar" aria-hidden="true">{initials}</span>
        {!collapsed ? (
          <span className="fas-profile-meta">
            <span className="fas-profile-name">{displayName}</span>
            <span className="fas-profile-role">{role}</span>
          </span>
        ) : null}
      </Link>
    </aside>
  )
}
