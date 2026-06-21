import type { Icon } from '@phosphor-icons/react'
import {
  Article,
  Broadcast,
  ChatsCircle,
  CheckSquare,
  Clock,
  Compass,
  Eye,
  FolderOpen,
  GearSix,
  GithubLogo,
  Kanban,
  Microphone,
  Package,
  Robot,
  Scales,
  Sparkle,
  UsersThree,
  WarningOctagon,
} from '@phosphor-icons/react'

export type DevMobileTab = {
  href: string
  label: string
  Icon: Icon
  match?: (path: string) => boolean
}

export type DevMobileNavRow = {
  href: string
  label: string
  Icon: Icon
  match?: (path: string) => boolean
}

export type DevMobileNavGroup = {
  label: string
  items: DevMobileNavRow[]
}

/** Bottom dock — delivery loop: overview → captures → tasks. */
export const DEV_MOB_DOCK_TABS: DevMobileTab[] = [
  { href: '/dev', Icon: Compass, label: 'Überblick', match: p => p === '/dev' },
  {
    href: '/dev/captures',
    Icon: Microphone,
    label: 'Aufnahmen',
    match: p => p.startsWith('/dev/captures'),
  },
  {
    href: '/dev/tasks',
    Icon: CheckSquare,
    label: 'Aufgaben',
    match: p => p.startsWith('/dev/tasks'),
  },
]

export const DEV_MOB_HERO = {
  href: '/dev/briefing',
  label: 'Tagesbriefing',
  sub: 'Was heute für den Kunden zählt',
  Icon: Sparkle,
  match: (p: string) => p.startsWith('/dev/briefing'),
}

export const DEV_MOB_NAV_GROUPS: DevMobileNavGroup[] = [
  {
    label: 'Kunden-Sicht',
    items: [
      { href: '/dev/review', Icon: Robot, label: 'Tagro Review', match: p => p.startsWith('/dev/review') },
      { href: '/dev/visibility', Icon: Eye, label: 'Kunden-Sicht', match: p => p.startsWith('/dev/visibility') },
      { href: '/dev/decisions', Icon: Scales, label: 'Entscheidungen', match: p => p.startsWith('/dev/decisions') },
      { href: '/dev/deliverables', Icon: Package, label: 'Lieferungen', match: p => p.startsWith('/dev/deliverables') },
    ],
  },
  {
    label: 'Ausführung',
    items: [
      { href: '/dev/projects', Icon: FolderOpen, label: 'Projekte', match: p => p.startsWith('/dev/projects') },
      { href: '/dev/plan', Icon: Kanban, label: 'Tagesplan', match: p => p.startsWith('/dev/plan') },
      { href: '/dev/time', Icon: Clock, label: 'Zeiterfassung', match: p => p.startsWith('/dev/time') },
      { href: '/dev/activity', Icon: Broadcast, label: 'Aktivität', match: p => p.startsWith('/dev/activity') },
      { href: '/dev/issues', Icon: WarningOctagon, label: 'Vorfälle', match: p => p.startsWith('/dev/issues') },
    ],
  },
  {
    label: 'Team',
    items: [
      { href: '/dev/messages', Icon: ChatsCircle, label: 'Execution Inbox', match: p => p.startsWith('/dev/messages') },
      { href: '/dev/team', Icon: UsersThree, label: 'Team', match: p => p.startsWith('/dev/team') },
    ],
  },
  {
    label: 'Integrationen',
    items: [
      { href: '/dev/github', Icon: GithubLogo, label: 'GitHub', match: p => p.startsWith('/dev/github') },
      { href: '/dev/updates', Icon: Article, label: 'Updates', match: p => p.startsWith('/dev/updates') },
    ],
  },
]

export const DEV_MOB_SETTINGS = {
  href: '/dev/settings',
  label: 'Einstellungen',
  Icon: GearSix,
  match: (p: string) => p.startsWith('/dev/settings'),
}
