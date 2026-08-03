/**
 * Pre-workspace Festag App Shell — navigation SSOT.
 * Account-level chrome before any workspace exists.
 */

import type { Icon } from '@phosphor-icons/react'
import {
  House,
  FolderSimple,
  CheckSquare,
  Tray,
  SquaresFour,
  FileText,
  Pulse,
  GearSix,
} from '@phosphor-icons/react'

export type AppShellNavItem = {
  href: string
  label: string
  icon: Icon
}

/** Primary rail — Home / Projects / Tasks / Inbox */
export const APP_SHELL_PRIMARY_NAV: AppShellNavItem[] = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/home/projects', label: 'Projects', icon: FolderSimple },
  { href: '/home/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/home/inbox', label: 'Inbox', icon: Tray },
]

/** Quiet group — Workspaces */
export const APP_SHELL_WORKSPACE_NAV: AppShellNavItem[] = [
  { href: '/home/workspaces', label: 'Workspaces', icon: SquaresFour },
]

/** Secondary — Documents / Activity / Settings */
export const APP_SHELL_SECONDARY_NAV: AppShellNavItem[] = [
  { href: '/home/documents', label: 'Documents', icon: FileText },
  { href: '/home/activity', label: 'Activity', icon: Pulse },
  { href: '/home/settings', label: 'Settings', icon: GearSix },
]

export const APP_SHELL_ALL_NAV: AppShellNavItem[] = [
  ...APP_SHELL_PRIMARY_NAV,
  ...APP_SHELL_WORKSPACE_NAV,
  ...APP_SHELL_SECONDARY_NAV,
]

export function isAppShellNavActive(pathname: string, href: string): boolean {
  if (href === '/home') return pathname === '/home'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Create Workspace bootstrap — existing auth surface. */
export const APP_SHELL_CREATE_WORKSPACE_HREF = '/create-workspace'

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
