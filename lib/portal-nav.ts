import type { Icon } from '@phosphor-icons/react'
import {
  Briefcase,
  Broadcast,
  Cube,
  EnvelopeSimple,
  File,
  Flag,
  GearSix,
  Kanban,
  LinkSimple,
  Package,
  Pulse,
  Scales,
  SealCheck,
  UsersThree,
  WarningOctagon,
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

export const PORTAL_NAV: PortalNavItem[] = [
  { href: '/dashboard', label: 'Statusabfrage', Icon: Pulse, match: p => p === '/dashboard' || p === '/' },
  { href: '/executive', label: 'Führung', Icon: Briefcase, match: p => p.startsWith('/executive') },
  { href: '/messages', label: 'Posteingang', Icon: EnvelopeSimple, badge: true, match: p => p.startsWith('/messages') || p.startsWith('/inbox') },
  { href: '/projects', label: 'Projekte', Icon: Cube, match: p => p === '/projects' || p.startsWith('/project/') },
  { href: '/decisions', label: 'Entscheidungen', Icon: Scales, match: p => p.startsWith('/decisions') },
  { href: '/captures', label: 'Freigaben', Icon: SealCheck, match: p => p.startsWith('/captures') },
  { href: '/deliverables', label: 'Lieferungen', Icon: Package, match: p => p.startsWith('/deliverables') },
  { href: '/objectives', label: 'Ziele', Icon: Flag, match: p => p.startsWith('/objectives') },
  { href: '/issues', label: 'Vorfälle', Icon: WarningOctagon, match: p => p.startsWith('/issues') },
  { href: '/activity', label: 'Aktivität', Icon: Broadcast, match: p => p.startsWith('/activity') },
  { href: '/tasks', label: 'Aufgaben', Icon: Kanban, match: p => p.startsWith('/tasks') },
  { href: '/docs', label: 'Dokumente', Icon: File, match: p => p.startsWith('/docs') || p.startsWith('/documents') },
  { href: '/connectors', label: 'Anbindungen', Icon: LinkSimple, match: p => p.startsWith('/connectors') },
  { href: '/teams', label: 'Team', Icon: UsersThree, match: p => p.startsWith('/teams') },
]

/** Primary sidebar items per workspace — keeps the rail focused, not exhaustive. */
const NAV_BY_WORKSPACE: Record<PortalWorkspaceMode, string[]> = {
  /** Client delivery: clarity for project owners — decisions + inbox always visible. */
  delivery: [
    '/dashboard',
    '/executive',
    '/messages',
    '/projects',
    '/decisions',
    '/captures',
    '/deliverables',
    '/activity',
  ],
  /** Internal team: execution + coordination, no client-approval surfaces. */
  team: [
    '/dashboard',
    '/projects',
    '/tasks',
    '/activity',
    '/objectives',
    '/docs',
    '/teams',
  ],
  /** Agency: portfolio + client delivery ops across projects. */
  agency: [
    '/dashboard',
    '/executive',
    '/messages',
    '/projects',
    '/decisions',
    '/captures',
    '/deliverables',
    '/objectives',
    '/activity',
    '/teams',
  ],
}

/** Delivery workspace in „Intern“ posture — keeps client essentials + team execution. */
const DELIVERY_INTERNAL_HREFS = [
  '/dashboard',
  '/messages',
  '/projects',
  '/decisions',
  '/activity',
  '/captures',
  '/deliverables',
  '/objectives',
  '/tasks',
  '/docs',
  '/teams',
]

/** Roles that see Führung / portfolio executive view in the sidebar. */
const EXECUTIVE_NAV_ROLES = new Set([
  'admin',
  'project_owner',
  'owner',
  'executive',
  'agency_owner',
])

export function resolvePortalNavHrefs(
  wsMode: PortalWorkspaceMode,
  operatingMode: WorkspaceMode = 'client_delivery',
  profileRole?: string | null,
): string[] {
  let hrefs: string[]
  if (wsMode === 'delivery' && operatingMode === 'internal_company') {
    hrefs = DELIVERY_INTERNAL_HREFS
  } else {
    hrefs = NAV_BY_WORKSPACE[wsMode] ?? NAV_BY_WORKSPACE.delivery
  }

  const role = (profileRole || '').toLowerCase()
  if (role && !EXECUTIVE_NAV_ROLES.has(role)) {
    hrefs = hrefs.filter(h => h !== '/executive')
  }

  return hrefs
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
