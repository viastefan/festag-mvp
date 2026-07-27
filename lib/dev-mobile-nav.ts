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
  House,
  Microphone,
  Package,
  Robot,
  Scales,
  Sparkle,
  UsersThree,
  WarningOctagon,
} from '@phosphor-icons/react'

import { EXECUTION_NAV } from '@/lib/execution-panel/nav'

/**
 * Per-route Tagro context. Kept next to the mobile nav map because the
 * mobile dock and the desktop Tagro entry both consume this — one source
 * of truth so the two entry points never drift apart.
 */
export type DevRouteTagroContext = {
  title: string
  prefill: string
}

const DEV_ROUTE_TAGRO_CONTEXTS: Array<[string, DevRouteTagroContext]> = [
  ['/dev/tasks', {
    title: 'Aufgaben',
    prefill: 'Priorisiere meine offenen Aufgaben. Was ist heute wirklich dran, was blockiert, und was kann warten?',
  }],
  ['/dev/review', {
    title: 'Tagro Review',
    prefill: 'Fasse die offenen Verifikationen zusammen. Wo fehlen Nachweise, und was sollte ich zuerst prüfen?',
  }],
  ['/dev/github', {
    title: 'GitHub',
    prefill: 'Fasse die letzte Repository-Aktivität zusammen: Commits, offene PRs, und was davon client-relevant ist.',
  }],
  ['/dev/issues', {
    title: 'Vorfälle',
    prefill: 'Bewerte die offenen Vorfälle nach Risiko und schlage die nächste Maßnahme je Vorfall vor.',
  }],
  ['/dev/briefing', {
    title: 'Briefing',
    prefill: 'Erstelle aus dem heutigen Stand ein ruhiges, client-sicheres Update.',
  }],
  ['/dev/decisions', {
    title: 'Entscheidungen',
    prefill: 'Welche Entscheidungen hängen, wer muss handeln, und was kostet weiteres Warten?',
  }],
  ['/dev/projects', {
    title: 'Projekte',
    prefill: 'Gib mir den Status aller aktiven Projekte: Fortschritt, Risiken, und wo ich eingreifen sollte.',
  }],
  ['/dev/team', {
    title: 'Team',
    prefill: 'Wie ist die Auslastung im Team verteilt, und wo entstehen Engpässe?',
  }],
  ['/dev/time', {
    title: 'Zeit',
    prefill: 'Analysiere, wohin meine Zeit zuletzt geflossen ist, und wo die Schätzungen daneben lagen.',
  }],
  ['/dev/captures', {
    title: 'Aufnahmen',
    prefill: 'Was sagen die letzten Aufnahmen: welche Aufgaben, Entscheidungen und Risiken entstehen daraus?',
  }],
  ['/dev/deliverables', {
    title: 'Lieferungen',
    prefill: 'Welche Lieferungen sind fällig, welche hängen, und was muss der Kunde sehen?',
  }],
  ['/dev/messages', {
    title: 'Inbox',
    prefill: 'Fasse die offene Kommunikation in der Inbox zusammen. Was braucht meine Antwort?',
  }],
  ['/dev/plan', {
    title: 'Tagesplan',
    prefill: 'Baue mir einen realistischen Tagesplan aus offenen Aufgaben, Reviews und Blockern.',
  }],
  ['/dev/documents', {
    title: 'Dokumente',
    prefill: 'Was liegt in den Projektdateien, wo fehlt Struktur, und welche Dokumente sind für den Kunden reif?',
  }],
  ['/dev/activity', {
    title: 'Aktivität',
    prefill: 'Fasse die jüngste Aktivität kompakt zusammen — was ist wirklich passiert, was verändert die Lage?',
  }],
  ['/dev/updates', {
    title: 'Updates',
    prefill: 'Welche Updates sind reif zum Versenden, und wo fehlen noch Details?',
  }],
  ['/dev/visibility', {
    title: 'Sichtbarkeit',
    prefill: 'Wie liest sich das Projekt aus Client-Perspektive gerade — was ist sichtbar, was fehlt?',
  }],
  ['/dev/settings', {
    title: 'Einstellungen',
    prefill: 'Was in meinen Einstellungen sollte ich prüfen, damit Tagro und die Portale bestmöglich für mich arbeiten?',
  }],
]

export const DEFAULT_DEV_TAGRO_CONTEXT: DevRouteTagroContext = {
  title: 'Heute',
  prefill: 'Was ist heute wichtig? Fasse Aufgaben, Reviews, Blocker und Repository-Aktivität zusammen und nenne die nächsten Schritte.',
}

export function getDevRouteTagroContext(pathname: string | null | undefined): DevRouteTagroContext {
  if (!pathname) return DEFAULT_DEV_TAGRO_CONTEXT
  const match = DEV_ROUTE_TAGRO_CONTEXTS
    .filter(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))
    .sort((a, b) => b[0].length - a[0].length)[0]
  return match ? match[1] : DEFAULT_DEV_TAGRO_CONTEXT
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

/** Mobile sheet mirrors desktop EXECUTION_NAV — featured Briefing stays on top. */
export const DEV_MOB_HERO = {
  href: '/dev/briefing',
  label: 'Briefing',
  sub: 'Was der Client heute sehen sollte',
  Icon: Sparkle,
  match: (p: string) => p.startsWith('/dev/briefing'),
}

export const DEV_MOB_NAV_GROUPS: DevMobileNavGroup[] = EXECUTION_NAV.map(group => ({
  label: group.label ?? 'Start',
  items: group.rows
    .filter(row => row.href !== DEV_MOB_HERO.href)
    .map(row => ({
      href: row.href,
      label: row.label,
      Icon: row.Icon,
      match: row.match,
    })),
})).filter(group => group.items.length > 0)

export const DEV_MOB_SETTINGS = {
  href: '/dev/settings',
  label: 'Einstellungen',
  Icon: GearSix,
  match: (p: string) => p.startsWith('/dev/settings'),
}

export type DevMobileAreaDescriptor = {
  key: string
  label: string
  Icon: Icon
  match: (path: string) => boolean
}

const DEV_MOB_AREAS: DevMobileAreaDescriptor[] = [
  { key: 'heute', label: 'Heute', Icon: House, match: p => p === '/dev' },
  { key: 'briefing', label: 'Briefing', Icon: Sparkle, match: p => p.startsWith('/dev/briefing') },
  { key: 'captures', label: 'Aufnahmen', Icon: Microphone, match: p => p.startsWith('/dev/captures') },
  { key: 'tasks', label: 'Aufgaben', Icon: CheckSquare, match: p => p.startsWith('/dev/tasks') },
  { key: 'review', label: 'Tagro Review', Icon: Robot, match: p => p.startsWith('/dev/review') },
  { key: 'visibility', label: 'Sichtbarkeit', Icon: Eye, match: p => p.startsWith('/dev/visibility') },
  { key: 'decisions', label: 'Entscheidungen', Icon: Scales, match: p => p.startsWith('/dev/decisions') },
  { key: 'deliverables', label: 'Lieferungen', Icon: Package, match: p => p.startsWith('/dev/deliverables') },
  { key: 'projects', label: 'Projekte', Icon: FolderOpen, match: p => p.startsWith('/dev/projects') },
  { key: 'plan', label: 'Tagesplan', Icon: Compass, match: p => p.startsWith('/dev/plan') },
  { key: 'time', label: 'Zeit', Icon: Clock, match: p => p.startsWith('/dev/time') },
  { key: 'activity', label: 'Aktivität', Icon: Broadcast, match: p => p.startsWith('/dev/activity') },
  { key: 'issues', label: 'Vorfälle', Icon: WarningOctagon, match: p => p.startsWith('/dev/issues') },
  { key: 'messages', label: 'Inbox', Icon: ChatsCircle, match: p => p.startsWith('/dev/messages') },
  { key: 'team', label: 'Mitglieder', Icon: UsersThree, match: p => p.startsWith('/dev/team') },
  { key: 'github', label: 'GitHub', Icon: GithubLogo, match: p => p.startsWith('/dev/github') },
  { key: 'updates', label: 'Updates', Icon: Article, match: p => p.startsWith('/dev/updates') },
  { key: 'documents', label: 'Dokumente', Icon: FolderOpen, match: p => p.startsWith('/dev/documents') },
  { key: 'settings', label: 'Einstellungen', Icon: GearSix, match: p => p.startsWith('/dev/settings') },
]

const DEV_MOB_AREA_OVERVIEW: DevMobileAreaDescriptor = {
  key: 'heute',
  label: 'Heute',
  Icon: House,
  match: p => p === '/dev',
}

export function getCurrentDevArea(pathname: string | null | undefined): DevMobileAreaDescriptor {
  if (!pathname) return DEV_MOB_AREA_OVERVIEW
  if (pathname === '/dev') return DEV_MOB_AREA_OVERVIEW
  const match = DEV_MOB_AREAS.find(a => a.match(pathname))
  return match ?? DEV_MOB_AREA_OVERVIEW
}
