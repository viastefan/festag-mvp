import type { Icon } from '@phosphor-icons/react'
import {
  Brain,
  Cube,
  GearSix,
  House,
  Scales,
  SquaresFour,
} from '@phosphor-icons/react'
import type { WorkspaceMode } from '@/lib/workspace-mode'

export type PortalWorkspaceMode = 'delivery' | 'team' | 'agency'

export type PortalNavItem = {
  href: string
  label: string
  Icon: Icon
  badge?: boolean
  match?: (path: string) => boolean
}

/** Primary portal navigation — calm, executive-focused rail. */
export const PORTAL_NAV: PortalNavItem[] = [
  {
    href: '/dashboard',
    label: 'Status',
    Icon: House,
    match: p => p === '/dashboard' || p === '/' || p === '/statusabfrage',
  },
  {
    href: '/projects',
    label: 'Projekte',
    Icon: Cube,
    match: p => p === '/projects' || p.startsWith('/project/'),
  },
  {
    href: '/decisions',
    label: 'Entscheidungen',
    Icon: Scales,
    match: p => p.startsWith('/decisions'),
  },
  {
    href: '/tagro',
    label: 'Tagro',
    Icon: Brain,
    match: p => p.startsWith('/tagro'),
  },
  {
    href: '/workspace',
    label: 'Workspace',
    Icon: SquaresFour,
    match: p => p.startsWith('/workspace'),
  },
]

/** Same focused rail for every workspace mode — supporting surfaces live under Workspace. */
const NAV_BY_WORKSPACE: Record<PortalWorkspaceMode, string[]> = {
  delivery: ['/dashboard', '/projects', '/decisions', '/tagro', '/workspace'],
  team: ['/dashboard', '/projects', '/decisions', '/tagro', '/workspace'],
  agency: ['/dashboard', '/projects', '/decisions', '/tagro', '/workspace'],
}

export function resolvePortalNavHrefs(
  wsMode: PortalWorkspaceMode,
  _operatingMode: WorkspaceMode = 'client_delivery',
  _profileRole?: string | null,
): string[] {
  return NAV_BY_WORKSPACE[wsMode] ?? NAV_BY_WORKSPACE.delivery
}

export function portalNavItemsForWorkspace(
  wsMode: PortalWorkspaceMode,
  operatingMode: WorkspaceMode = 'client_delivery',
  profileRole?: string | null,
): PortalNavItem[] {
  const allowed = new Set(resolvePortalNavHrefs(wsMode, operatingMode, profileRole))
  return PORTAL_NAV.filter(item => allowed.has(item.href))
}

export const PORTAL_SETTINGS: PortalNavItem = {
  href: '/settings',
  label: 'Einstellungen',
  Icon: GearSix,
  match: p => p.startsWith('/settings'),
}
