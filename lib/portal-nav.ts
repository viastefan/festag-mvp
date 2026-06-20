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
  Pulse,
  Scales,
  SealCheck,
  UsersThree,
  WarningOctagon,
} from '@phosphor-icons/react'

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
  { href: '/objectives', label: 'Ziele', Icon: Flag, match: p => p.startsWith('/objectives') },
  { href: '/issues', label: 'Vorfälle', Icon: WarningOctagon, match: p => p.startsWith('/issues') },
  { href: '/activity', label: 'Aktivität', Icon: Broadcast, match: p => p.startsWith('/activity') },
  { href: '/tasks', label: 'Aufgaben', Icon: Kanban, match: p => p.startsWith('/tasks') },
  { href: '/docs', label: 'Dokumente', Icon: File, match: p => p.startsWith('/docs') || p.startsWith('/documents') },
  { href: '/connectors', label: 'Anbindungen', Icon: LinkSimple, match: p => p.startsWith('/connectors') },
  { href: '/teams', label: 'Team', Icon: UsersThree, match: p => p.startsWith('/teams') },
]

export const PORTAL_SETTINGS: PortalNavItem = {
  href: '/settings',
  label: 'Einstellungen',
  Icon: GearSix,
  match: p => p.startsWith('/settings'),
}
