/**
 * Festag OS Shell — navigation SSOT.
 * Tagro never appears in the sidebar — it lives throughout the OS.
 */

import type { Icon } from '@phosphor-icons/react'
import {
  Layout,
  FolderSimple,
  CheckSquare,
  FileText,
  SquaresFour,
  GitBranch,
  Warning,
} from '@phosphor-icons/react'

export type AppShellNavItem = {
  href: string
  label: string
  icon: Icon
}

/**
 * Primary rail — deliberately only what we are actually building right now.
 * Everything else stays out until it earns its place.
 */
export const APP_SHELL_PRIMARY_NAV: AppShellNavItem[] = [
  { href: '/overview', label: 'Dashboard', icon: Layout },
  { href: '/overview/projects', label: 'Projekte', icon: FolderSimple },
  { href: '/decisions', label: 'Entscheidungen', icon: GitBranch },
  { href: '/overview/tasks', label: 'Aufgaben', icon: CheckSquare },
  { href: '/issues', label: 'Risiken', icon: Warning },
  { href: '/reports', label: 'Statusbericht', icon: FileText },
]

/**
 * Legacy workspace list route — kept for deep links / switcher,
 * not shown in the main rail (workspace switcher owns that).
 */
export const APP_SHELL_WORKSPACE_NAV: AppShellNavItem[] = [
  { href: '/overview/workspaces', label: 'Workspaces', icon: SquaresFour },
]

/**
 * Secondary rail — intentionally empty while we focus on the core loop.
 * Documents / Team / Activity routes still exist for deep links.
 */
export const APP_SHELL_SECONDARY_NAV: AppShellNavItem[] = []

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
  if (hour < 12) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}
