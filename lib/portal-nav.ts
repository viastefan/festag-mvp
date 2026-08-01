import type { Icon } from '@phosphor-icons/react'
import {
  CheckSquare,
  Cube,
  Bell,
  FileText,
  GearSix,
  Briefcase,
  House,
  Scales,
  SquaresFour,
  PencilSimple,
  TreeStructure,
} from '@phosphor-icons/react'
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

export type PortalNavGroup = {
  id: string
  label?: string
  items: PortalNavItem[]
}

/** All portal nav entries — filtered per view mode. */
export const PORTAL_NAV: PortalNavItem[] = [
  {
    href: '/tagro',
    label: 'Tagro',
    Icon: PencilSimple,
    match: p => p.startsWith('/tagro'),
  },
  {
    href: '/dashboard',
    label: 'Status',
    Icon: House,
    match: p => p === '/dashboard' || p === '/' || p === '/statusabfrage',
  },
  {
    href: '/benachrichtigungen',
    label: 'Inbox',
    Icon: Bell,
    badge: true,
    match: p => p.startsWith('/benachrichtigungen') || p.startsWith('/messages') || p.startsWith('/inbox'),
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
    href: '/documents',
    label: 'Dokumente',
    Icon: FileText,
    match: p => p === '/documents' || p.startsWith('/documents/'),
  },
  {
    href: '/workspace',
    label: 'Workspace',
    Icon: SquaresFour,
    match: p => p.startsWith('/workspace'),
  },
  {
    href: '/architecture',
    label: 'Architecture',
    Icon: TreeStructure,
    match: p => p.startsWith('/architecture'),
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
    label: 'Berichte',
    Icon: House,
    match: p => p.startsWith('/reports'),
  },
]

const CORE_NAV = [
  '/tagro',
  '/dashboard',
  '/benachrichtigungen',
  '/projects',
  '/tasks',
  '/decisions',
  '/documents',
  '/workspace',
] as const

/** Perspektivfilter — gleiche Daten, andere Nav-Sicht. */
const NAV_BY_VIEW_MODE: Record<SidebarViewMode, string[]> = {
  delivery: [...CORE_NAV, '/architecture'],
  agency: [...CORE_NAV, '/architecture', '/executive'],
  team: [...CORE_NAV, '/architecture'],
}

const EXECUTIVE_NAV_ROLES = new Set([
  'admin',
  'project_owner',
  'owner',
  'executive',
  'agency_owner',
])

/** Architecture OS — builder / owner lens, not client delivery chrome. */
const ARCHITECTURE_NAV_ROLES = new Set([
  'admin',
  'project_owner',
  'owner',
  'executive',
  'agency_owner',
  'developer',
  'member',
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
  if (role === 'client' || role === 'viewer' || (role && !ARCHITECTURE_NAV_ROLES.has(role))) {
    hrefs = hrefs.filter(h => h !== '/architecture')
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

/** Grouped IA for mobile sheet — same labels as the rail. */
export function portalNavGroupsForViewMode(
  viewMode: SidebarViewMode = 'delivery',
  operatingMode: WorkspaceMode = 'client_delivery',
  profileRole?: string | null,
): PortalNavGroup[] {
  const items = portalNavItemsForViewMode(viewMode, operatingMode, profileRole)
  const byHref = new Map(items.map(i => [i.href, i]))
  const pick = (...hrefs: string[]) =>
    hrefs.map(h => byHref.get(h)).filter((i): i is PortalNavItem => !!i)

  const groups: PortalNavGroup[] = [
    { id: 'start', label: 'Start', items: pick('/tagro', '/dashboard', '/benachrichtigungen') },
    { id: 'work', label: 'Lieferung', items: pick('/projects', '/tasks', '/decisions', '/executive') },
    { id: 'workspace', label: 'Workspace', items: pick('/documents', '/workspace', '/architecture', '/reports') },
  ]
  return groups.filter(g => g.items.length > 0)
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
