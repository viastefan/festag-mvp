import type { Icon } from '@phosphor-icons/react'
import {
  Brain, Buildings, CreditCard, Database, Flask, FolderOpen,
  GithubLogo, HardDrives, Info, Key, Lightning,
  Notification, Palette, Plugs, ShieldCheck, SlidersHorizontal,
  UserCircle, UsersThree,
} from '@phosphor-icons/react'

export type DevSettingsSectionId =
  | 'profile'
  | 'workspace'
  | 'appearance'
  | 'users'
  | 'projects'
  | 'developer'
  | 'github'
  | 'ai'
  | 'automations'
  | 'notifications'
  | 'security'
  | 'billing'
  | 'api'
  | 'integrations'
  | 'storage'
  | 'data'
  | 'advanced'
  | 'about'

export type DevSettingsNavItem = {
  id: DevSettingsSectionId
  label: string
  icon: Icon
  keywords: string[]
}

export type DevSettingsNavGroup = {
  id: string
  label: string
  defaultCollapsed?: boolean
  items: DevSettingsNavItem[]
}

export const DEV_SETTINGS_NAV: DevSettingsNavGroup[] = [
  {
    id: 'personal',
    label: 'Persönlich',
    items: [
      {
        id: 'profile',
        label: 'Profil',
        icon: UserCircle,
        keywords: ['profil', 'name', 'bio', 'skills', 'verfügbarkeit', 'availability', 'stundensatz'],
      },
      {
        id: 'appearance',
        label: 'Erscheinung',
        icon: Palette,
        keywords: ['theme', 'thema', 'dark', 'light', 'dunkel', 'hell', 'appearance', 'farbe', 'animation', 'dichte', 'compact'],
      },
      {
        id: 'notifications',
        label: 'Benachrichtigungen',
        icon: Notification,
        keywords: ['notifications', 'email', 'push', 'bell', 'digest', 'ruhezeiten'],
      },
      {
        id: 'security',
        label: 'Sicherheit',
        icon: ShieldCheck,
        keywords: ['password', 'passwort', '2fa', 'passkey', 'sessions', 'devices', 'login'],
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        id: 'workspace',
        label: 'Workspace',
        icon: Buildings,
        keywords: ['workspace', 'slug', 'logo', 'timezone', 'region', 'export', 'löschen'],
      },
      {
        id: 'users',
        label: 'Benutzer & Rechte',
        icon: UsersThree,
        keywords: ['users', 'invite', 'einladen', 'roles', 'permissions', 'team', 'admin'],
      },
      {
        id: 'projects',
        label: 'Projekte',
        icon: FolderOpen,
        keywords: ['projects', 'template', 'workflow', 'milestones', 'defaults'],
      },
    ],
  },
  {
    id: 'build',
    label: 'Entwicklung',
    items: [
      {
        id: 'developer',
        label: 'Entwickler-Tools',
        icon: SlidersHorizontal,
        keywords: ['developer', 'branch', 'env', 'secrets', 'code review', 'pr'],
      },
      {
        id: 'github',
        label: 'GitHub',
        icon: GithubLogo,
        keywords: ['github', 'repo', 'repository', 'commits', 'pull request'],
      },
      {
        id: 'ai',
        label: 'KI & Tagro',
        icon: Brain,
        keywords: ['ai', 'tagro', 'model', 'memory', 'voice', 'prompt', 'intelligence'],
      },
      {
        id: 'automations',
        label: 'Automatisierungen',
        icon: Lightning,
        keywords: ['automation', 'workflow', 'trigger', 'schedule', 'jobs'],
      },
    ],
  },
  {
    id: 'connect',
    label: 'Verbindungen',
    defaultCollapsed: true,
    items: [
      {
        id: 'integrations',
        label: 'Integrationen',
        icon: Plugs,
        keywords: ['integrations', 'slack', 'vercel', 'supabase', 'linear', 'figma'],
      },
      {
        id: 'api',
        label: 'API',
        icon: Key,
        keywords: ['api', 'keys', 'oauth', 'webhooks', 'sdk', 'rate limit'],
      },
      {
        id: 'storage',
        label: 'Speicher',
        icon: HardDrives,
        keywords: ['storage', 'files', 'images', 'cleanup', 'backup'],
      },
    ],
  },
  {
    id: 'account',
    label: 'Konto',
    defaultCollapsed: true,
    items: [
      {
        id: 'billing',
        label: 'Abrechnung',
        icon: CreditCard,
        keywords: ['billing', 'plan', 'invoice', 'seats', 'credits', 'upgrade'],
      },
      {
        id: 'data',
        label: 'Daten',
        icon: Database,
        keywords: ['data', 'export', 'import', 'gdpr', 'retention', 'löschen'],
      },
      {
        id: 'advanced',
        label: 'Erweitert',
        icon: Flask,
        keywords: ['advanced', 'labs', 'flags', 'debug', 'experimental'],
      },
      {
        id: 'about',
        label: 'Über Festag',
        icon: Info,
        keywords: ['about', 'version', 'legal', 'privacy', 'support', 'roadmap'],
      },
    ],
  },
]

export const DEV_SETTINGS_META: Record<DevSettingsSectionId, { title: string; description: string }> = {
  profile: {
    title: 'Profil',
    description: 'Wie dich Team und Tagro sehen — Verfügbarkeit, Skills und persönliche Angaben.',
  },
  workspace: {
    title: 'Workspace',
    description: 'Name, Identität und grundlegende Workspace-Einstellungen für das Execution Panel.',
  },
  appearance: {
    title: 'Erscheinung',
    description: 'Theme, Dichte und Bewegung — ruhig, bewusst und angenehm für lange Sessions.',
  },
  users: {
    title: 'Benutzer & Rechte',
    description: 'Mitglieder einladen, Rollen verstehen und Zugriffe im Workspace steuern.',
  },
  projects: {
    title: 'Projekte',
    description: 'Standards für neue Projekte, Status-Workflows und Sichtbarkeit gegenüber Clients.',
  },
  developer: {
    title: 'Entwickler-Tools',
    description: 'Branches, Reviews, Secrets und Vorlieben für den täglichen Delivery-Flow.',
  },
  github: {
    title: 'GitHub',
    description: 'Repository-Verbindung, Leserechte und Aktivität, die Tagro für Reviews nutzt.',
  },
  ai: {
    title: 'KI & Tagro',
    description: 'Wie Tagro denkt, was er speichern darf und welche Hinweise er automatisch gibt.',
  },
  automations: {
    title: 'Automatisierungen',
    description: 'Wiederkehrende Abläufe für Status, Clients und Entwickler — ruhig und nachvollziehbar.',
  },
  notifications: {
    title: 'Benachrichtigungen',
    description: 'Wann Festag dich erreicht — und wann es bewusst schweigt.',
  },
  security: {
    title: 'Sicherheit',
    description: 'Zugang, Sessions und Schutz für dein Execution-Konto.',
  },
  billing: {
    title: 'Abrechnung',
    description: 'Plan, Sitze und Nutzung — klar, ohne Ablenkung vom Delivery-Alltag.',
  },
  api: {
    title: 'API',
    description: 'Schlüssel, Webhooks und Zugriffe für eigene Integrationen.',
  },
  integrations: {
    title: 'Integrationen',
    description: 'Externe Tools verbinden, ohne den Execution-Flow zu zerlegen.',
  },
  storage: {
    title: 'Speicher',
    description: 'Dateien, Medien und Aufräumen — Überblick über Workspace-Nutzung.',
  },
  data: {
    title: 'Daten',
    description: 'Export, Aufbewahrung und Löschung — transparent und kontrollierbar.',
  },
  advanced: {
    title: 'Erweitert',
    description: 'Labs, Flags und Diagnose — nur wenn du tiefer eingreifen willst.',
  },
  about: {
    title: 'Über Festag',
    description: 'Version, Rechtliches, Support und der Zustand der Plattform.',
  },
}

export const DEV_SETTINGS_DEFAULT: DevSettingsSectionId = 'profile'

export function resolveDevSettingsSection(slug: string | undefined | null): DevSettingsSectionId {
  if (!slug) return DEV_SETTINGS_DEFAULT
  const found = Object.values(DEV_SETTINGS_NAV)
    .flatMap(g => g.items)
    .find(item => item.id === slug)
  return found?.id ?? DEV_SETTINGS_DEFAULT
}

export function settingsHref(id: DevSettingsSectionId): string {
  return `/dev/settings/${id}`
}

export function searchDevSettings(query: string): DevSettingsNavItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const items = DEV_SETTINGS_NAV.flatMap(g => g.items)
  return items
    .map(item => {
      const hay = [item.label, item.id, ...item.keywords].join(' ').toLowerCase()
      const score =
        item.label.toLowerCase().startsWith(q) ? 0
          : item.id.startsWith(q) ? 1
            : hay.includes(q) ? 2
              : 99
      return { item, score }
    })
    .filter(x => x.score < 99)
    .sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label, 'de'))
    .map(x => x.item)
}

const RECENT_KEY = 'festag-dev-settings-recent'
const COLLAPSED_KEY = 'festag-dev-settings-nav-collapsed'

export function readRecentSettings(): DevSettingsSectionId[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is DevSettingsSectionId =>
      DEV_SETTINGS_NAV.some(g => g.items.some(i => i.id === id)),
    ).slice(0, 6)
  } catch {
    return []
  }
}

export function pushRecentSetting(id: DevSettingsSectionId) {
  try {
    const next = [id, ...readRecentSettings().filter(x => x !== id)].slice(0, 6)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* noop */ }
}

export function readCollapsedSettingGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveCollapsedSettingGroups(state: Record<string, boolean>) {
  try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(state)) } catch { /* noop */ }
}

/** Quiet marker for capabilities that are designed but not yet wired. */
export const SETTINGS_SOON = 'Folgt mit dem nächsten Workspace-Release.'
