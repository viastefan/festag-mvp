import type { Icon } from '@phosphor-icons/react'
import {
  CheckSquare,
  Cube,
  EnvelopeSimple,
  GearSix,
  Briefcase,
  House,
  Scales,
  SquaresFour,
} from '@phosphor-icons/react'
import EditSquareIcon from '@/components/icons/EditSquareIcon'
import type { SidebarViewMode } from '@/lib/sidebar-prefs'
import type { WorkspaceMode } from '@/lib/workspace-mode'

export type PortalWorkspaceMode = 'delivery' | 'team' | 'agency'

export type PortalNavItem = {
  href: string
  label: string
  Icon: Icon
  badge?: boolean
  match?: (path: string) => boolean
}

/** All portal nav entries — filtered per view mode. */
export const PORTAL_NAV: PortalNavItem[] = [
  {
    href: '/tagro',
    label: 'Neues Update',
    Icon: EditSquareIcon as Icon,
    match: p => p.startsWith('/tagro'),
  },
  {
    href: '/dashboard',
    label: 'Status',
    Icon: House,
    match: p => p === '/dashboard' || p === '/' || p === '/statusabfrage',
  },
  {
    href: '/messages',
    label: 'Posteingang',
    Icon: EnvelopeSimple,
    badge: true,
    match: p => p.startsWith('/messages') || p.startsWith('/inbox'),
  },
  {
    href: '/projects',
    label: 'Projekte',
    Icon: Cube,
    match: p => p === '/projects' || p.startsWith('/project/'),
  },
  {
    href: '/tasks',
    label: 'Aufgaben',
    Icon: CheckSquare,
    match: p => p.startsWith('/tasks'),
  },
  {
    href: '/decisions',
    label: 'Entscheidungen',
    Icon: Scales,
    match: p => p.startsWith('/decisions'),
  },
  {
    href: '/workspace',
    label: 'Workspace',
    Icon: SquaresFour,
    match: p => p.startsWith('/workspace'),
  },
  /* Palette / mode-specific — not default rail */
  {
    href: '/executive',
    label: 'Führung',
    Icon: Briefcase,
    match: p => p.startsWith('/executive'),
  },
  {
    href: '/reports',
    label: 'Statusberichte',
    Icon: House,
    match: p => p.startsWith('/reports'),
  },
]

const CORE_NAV = [
  '/tagro',
  '/dashboard',
  '/messages',
  '/projects',
  '/tasks',
  '/decisions',
  '/workspace',
] as const

/** Perspektivfilter — gleiche Daten, andere Nav-Sicht. */
const NAV_BY_VIEW_MODE: Record<SidebarViewMode, string[]> = {
  delivery: [...CORE_NAV],
  agency: [...CORE_NAV, '/executive'],
  team: [...CORE_NAV],
}

const EXECUTIVE_NAV_ROLES = new Set([
  'admin',
  'project_owner',
  'owner',
  'executive',
  'agency_owner',
])

export function resolvePortalNavHrefs(
  viewMode: SidebarViewMode = 'delivery',
  _operatingMode: WorkspaceMode = 'client_delivery',
  profileRole?: string | null,
): string[] {
  let hrefs = NAV_BY_VIEW_MODE[viewMode] ?? NAV_BY_VIEW_MODE.delivery
  const role = (profileRole || '').toLowerCase()
  if (role && !EXECUTIVE_NAV_ROLES.has(role)) {
    hrefs = hrefs.filter(h => h !== '/executive')
  }
  return hrefs
}

export function portalNavItemsForViewMode(
  viewMode: SidebarViewMode = 'delivery',
  operatingMode: WorkspaceMode = 'client_delivery',
  profileRole?: string | null,
): PortalNavItem[] {
  const allowed = new Set(resolvePortalNavHrefs(viewMode, operatingMode, profileRole))
  return PORTAL_NAV.filter(item => allowed.has(item.href))
}

/** Legacy workspace-mode alias — maps to view mode. */
export function portalNavItemsForWorkspace(
  wsMode: PortalWorkspaceMode,
  operatingMode: WorkspaceMode = 'client_delivery',
  profileRole?: string | null,
): PortalNavItem[] {
  const viewMode: SidebarViewMode =
    wsMode === 'agency' ? 'agency' : wsMode === 'team' ? 'team' : 'delivery'
  return portalNavItemsForViewMode(viewMode, operatingMode, profileRole)
}

export const PORTAL_SETTINGS: PortalNavItem = {
  href: '/settings',
  label: 'Einstellungen',
  Icon: GearSix,
  match: p => p.startsWith('/settings'),
}
