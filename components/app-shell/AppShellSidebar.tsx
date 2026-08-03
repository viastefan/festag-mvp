'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  APP_SHELL_PRIMARY_NAV,
  APP_SHELL_WORKSPACE_NAV,
  APP_SHELL_SECONDARY_NAV,
  isAppShellNavActive,
  appShellRoleLabel,
} from '@/components/app-shell/app-shell-nav'
import { getDisplayName, getFullDisplayName, getInitials, type UserProfile } from '@/lib/hooks/useUser'

type Props = {
  user: UserProfile | null
}

export default function AppShellSidebar({ user }: Props) {
  const pathname = usePathname() || '/home'
  const displayName = getFullDisplayName(user) || getDisplayName(user) || 'You'
  const role = appShellRoleLabel(user?.role)
  const initials = getInitials(user)

  return (
    <aside className="fas-sidebar" aria-label="Festag navigation">
      <Link href="/home" className="fas-brand" aria-label="Festag Home">
        <span className="fas-brand-mark" aria-hidden="true" />
        <span className="fas-brand-name">Festag</span>
      </Link>

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
            >
              <Icon size={16} weight="light" />
              <span>{item.label}</span>
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
              >
                <Icon size={16} weight="light" />
                <span>{item.label}</span>
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
              >
                <Icon size={16} weight="light" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <Link href="/home/settings" className="fas-profile">
        <span className="fas-profile-avatar" aria-hidden="true">{initials}</span>
        <span className="fas-profile-meta">
          <span className="fas-profile-name">{displayName}</span>
          <span className="fas-profile-role">{role}</span>
        </span>
      </Link>
    </aside>
  )
}
