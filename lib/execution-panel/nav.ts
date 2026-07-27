/**
 * Execution Panel navigation — single source for desktop rail + mobile sheet.
 *
 * Client Portal and Execution Panel are two perspectives of the same Workspace.
 * Labels stay short, calm, and identical across surfaces.
 */

import type { Icon } from '@phosphor-icons/react'
import {
  Article,
  Broadcast,
  CalendarBlank,
  ChatsCircle,
  CheckSquare,
  Clock,
  Eye,
  FileText,
  FolderOpen,
  GithubLogo,
  House,
  Microphone,
  Package,
  Robot,
  Scales,
  Sparkle,
  UsersThree,
  WarningOctagon,
} from '@phosphor-icons/react'

export type ExecutionNavCount = 'open' | 'review' | 'blocked' | 'inbox'

export type ExecutionNavRow = {
  href: string
  label: string
  Icon: Icon
  count?: ExecutionNavCount
  tone?: 'warning' | 'error'
  match?: (path: string) => boolean
}

export type ExecutionNavGroup = {
  id: string
  label?: string
  collapsible?: boolean
  /** When true and the user has never toggled this group, start collapsed. */
  defaultCollapsed?: boolean
  rows: ExecutionNavRow[]
}

function prefixMatch(href: string) {
  return (path: string) =>
    href === '/dev' ? path === '/dev' : path === href || path.startsWith(`${href}/`)
}

/**
 * Scannable IA:
 * - Primary always open
 * - Ausführung = delivery work queue
 * - Client = what the customer sees
 * - Team / Mehr stay collapsed by default
 */
export const EXECUTION_NAV: ExecutionNavGroup[] = [
  {
    id: 'primary',
    rows: [
      { href: '/dev', label: 'Heute', Icon: House, match: prefixMatch('/dev') },
      { href: '/dev/tasks', label: 'Aufgaben', Icon: CheckSquare, count: 'open', match: prefixMatch('/dev/tasks') },
      { href: '/dev/projects', label: 'Projekte', Icon: FolderOpen, match: prefixMatch('/dev/projects') },
    ],
  },
  {
    id: 'execution',
    label: 'Ausführung',
    collapsible: true,
    rows: [
      { href: '/dev/github', label: 'GitHub', Icon: GithubLogo, match: prefixMatch('/dev/github') },
      { href: '/dev/review', label: 'Tagro Review', Icon: Robot, count: 'review', tone: 'warning', match: prefixMatch('/dev/review') },
      { href: '/dev/issues', label: 'Vorfälle', Icon: WarningOctagon, count: 'blocked', tone: 'error', match: prefixMatch('/dev/issues') },
      { href: '/dev/decisions', label: 'Entscheidungen', Icon: Scales, match: prefixMatch('/dev/decisions') },
      { href: '/dev/updates', label: 'Updates', Icon: Article, match: prefixMatch('/dev/updates') },
    ],
  },
  {
    id: 'client',
    label: 'Client',
    collapsible: true,
    rows: [
      { href: '/dev/visibility', label: 'Sichtbarkeit', Icon: Eye, match: prefixMatch('/dev/visibility') },
      { href: '/dev/briefing', label: 'Briefing', Icon: Sparkle, match: prefixMatch('/dev/briefing') },
      { href: '/dev/deliverables', label: 'Lieferungen', Icon: Package, match: prefixMatch('/dev/deliverables') },
      { href: '/dev/documents', label: 'Dokumente', Icon: FileText, match: prefixMatch('/dev/documents') },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    collapsible: true,
    defaultCollapsed: true,
    rows: [
      { href: '/dev/messages', label: 'Inbox', Icon: ChatsCircle, count: 'inbox', match: prefixMatch('/dev/messages') },
      { href: '/dev/team', label: 'Mitglieder', Icon: UsersThree, match: prefixMatch('/dev/team') },
      { href: '/dev/captures', label: 'Aufnahmen', Icon: Microphone, match: prefixMatch('/dev/captures') },
    ],
  },
  {
    id: 'more',
    label: 'Mehr',
    collapsible: true,
    defaultCollapsed: true,
    rows: [
      { href: '/dev/plan', label: 'Tagesplan', Icon: CalendarBlank, match: prefixMatch('/dev/plan') },
      { href: '/dev/time', label: 'Zeit', Icon: Clock, match: prefixMatch('/dev/time') },
      { href: '/dev/activity', label: 'Aktivität', Icon: Broadcast, match: prefixMatch('/dev/activity') },
    ],
  },
]
