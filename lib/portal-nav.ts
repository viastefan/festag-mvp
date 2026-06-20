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
  /** Client delivery: clarity for project owners — no execution/admin noise. */
  delivery: [
    '/dashboard',
    '/executive',
    '/messages',
    '/projects',
    '/decisions',
    '/captures',
    '/deliverables',
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
    '/issues',
    '/activity',
    '/teams',
  ],
}

/** Delivery workspace in „Intern“ posture — own team, no client portals. */
const DELIVERY_INTERNAL_HREFS = [
  '/dashboard',
  '/projects',
  '/tasks',
  '/activity',
  '/objectives',
  '/docs',
  '/teams',
]

export function resolvePortalNavHrefs(
  wsMode: PortalWorkspaceMode,
  operatingMode: WorkspaceMode = 'client_delivery',
): string[] {
  if (wsMode === 'delivery' && operatingMode === 'internal_company') {
    return DELIVERY_INTERNAL_HREFS
  }
  return NAV_BY_WORKSPACE[wsMode] ?? NAV_BY_WORKSPACE.delivery
}

export function portalNavItemsForWorkspace(
  wsMode: PortalWorkspaceMode,
  operatingMode: WorkspaceMode = 'client_delivery',
): PortalNavItem[] {
  const allowed = new Set(resolvePortalNavHrefs(wsMode, operatingMode))
  return PORTAL_NAV.filter(item => allowed.has(item.href))
}

export const PORTAL_SETTINGS: PortalNavItem = {
  href: '/settings',
  label: 'Einstellungen',
  Icon: GearSix,
  match: p => p.startsWith('/settings'),
}
