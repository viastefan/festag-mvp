import type { Icon } from '@phosphor-icons/react'
import {
  Bell,
  Bug,
  ChartLineUp,
  Cube,
  File,
  GearSix,
  ListChecks,
  Plugs,
  Pulse,
  SquaresFour,
  Target,
  Tray,
  UsersThree,
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
  { href: '/executive', label: 'Executive', Icon: ChartLineUp, match: p => p.startsWith('/executive') },
  { href: '/messages', label: 'Inbox', Icon: Bell, badge: true, match: p => p.startsWith('/messages') || p.startsWith('/inbox') },
  { href: '/projects', label: 'Projekte', Icon: Cube, match: p => p === '/projects' || p.startsWith('/project/') },
  { href: '/decisions', label: 'Entscheidungen', Icon: SquaresFour, match: p => p.startsWith('/decisions') },
  { href: '/objectives', label: 'Objectives', Icon: Target, match: p => p.startsWith('/objectives') },
  { href: '/issues', label: 'Issues', Icon: Bug, match: p => p.startsWith('/issues') },
  { href: '/activity', label: 'Aktivität', Icon: Tray, match: p => p.startsWith('/activity') },
  { href: '/tasks', label: 'Tasks', Icon: ListChecks, match: p => p.startsWith('/tasks') },
  { href: '/docs', label: 'Dokumente', Icon: File, match: p => p.startsWith('/docs') || p.startsWith('/documents') },
  { href: '/connectors', label: 'Connectors', Icon: Plugs, match: p => p.startsWith('/connectors') },
  { href: '/teams', label: 'Teams', Icon: UsersThree, match: p => p.startsWith('/teams') },
]

export const PORTAL_SETTINGS: PortalNavItem = {
  href: '/settings',
  label: 'Einstellungen',
  Icon: GearSix,
  match: p => p.startsWith('/settings'),
}
