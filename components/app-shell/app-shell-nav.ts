/**
 * Festag OS Shell — navigation SSOT.
 * Tagro never appears in the sidebar — it lives throughout the OS.
 */

import type { Icon } from '@phosphor-icons/react'
import {
  Layout,
  FolderSimple,
  CheckSquare,
  Tray,
  FileText,
  UsersThree,
  Pulse,
  SquaresFour,
} from '@phosphor-icons/react'

export type AppShellNavItem = {
  href: string
  label: string
  icon: Icon
}

/** Primary rail — Overview / Projects / Tasks / Inbox */
export const APP_SHELL_PRIMARY_NAV: AppShellNavItem[] = [
  { href: '/overview', label: 'Overview', icon: Layout },
  { href: '/overview/projects', label: 'Projects', icon: FolderSimple },
  { href: '/overview/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/overview/inbox', label: 'Inbox', icon: Tray },
]

/**
 * Legacy workspace list route — kept for deep links / switcher,
 * not shown in the main rail (workspace switcher owns that).
 */
export const APP_SHELL_WORKSPACE_NAV: AppShellNavItem[] = [
  { href: '/overview/workspaces', label: 'Workspaces', icon: SquaresFour },
]

/** Secondary — Documents / Team / Activity */
export const APP_SHELL_SECONDARY_NAV: AppShellNavItem[] = [
  { href: '/overview/documents', label: 'Documents', icon: FileText },
  { href: '/overview/team', label: 'Team', icon: UsersThree },
  { href: '/overview/activity', label: 'Activity', icon: Pulse },
]

export const APP_SHELL_ALL_NAV: AppShellNavItem[] = [
  ...APP_SHELL_PRIMARY_NAV,
  ...APP_SHELL_SECONDARY_NAV,
]

export function isAppShellNavActive(pathname: string, href: string): boolean {
  if (href === '/overview') return pathname === '/overview'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Create Workspace — opens popup slider via `openWorkspaceCreateWizard()`. Legacy path redirects. */
export const APP_SHELL_CREATE_WORKSPACE_HREF = '/overview?create=1'

/** Calm label from legacy profiles.role — never surveillance tone. */
export function appShellRoleLabel(role?: string | null): string {
  if (role === 'admin') return 'Admin'
  if (role === 'dev') return 'Builder'
  return 'Member'
}

export function appShellGreeting(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
