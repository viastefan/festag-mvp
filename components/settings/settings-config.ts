import type { Icon } from '@phosphor-icons/react'
import {
  UserCircle, SunHorizon, ShieldCheck, Bell, LinkSimple,
  Briefcase, Receipt, GearSix, Sparkle, Eye, LockKey, Keyboard, PuzzlePiece, FileText,
  ChatTeardropDots, CheckCircle, Newspaper, CurrencyEur,
} from '@phosphor-icons/react'

export type SettingsSectionId =
  | 'profile'
  | 'appearance'
  | 'security'
  | 'notifications'
  | 'connected'
  | 'workspace'
  | 'company'
  | 'billing'
  | 'documents'
  | 'earnings'
  | 'intelligence'
  | 'portal'
  | 'privacy'
  | 'shortcuts'
  | 'apps'

export const SLUG_TO_SECTION: Record<string, SettingsSectionId> = {
  '': 'profile',
  appearance: 'appearance',
  security: 'security',
  notifications: 'notifications',
  connected: 'connected',
  workspace: 'workspace',
  company: 'company',
  billing: 'billing',
  documents: 'documents',
  earnings: 'earnings',
  intelligence: 'intelligence',
  portal: 'portal',
  privacy: 'privacy',
  shortcuts: 'shortcuts',
  apps: 'apps',
}

export const SECTION_TITLE: Record<SettingsSectionId, string> = {
  profile: 'Profil',
  appearance: 'Erscheinung',
  security: 'Sicherheit',
  notifications: 'Benachrichtigungen',
  connected: 'Verbundene Konten',
  workspace: 'Workspace',
  company: 'Unternehmen',
  billing: 'Abrechnung & Steuer',
  documents: 'Dokumente',
  earnings: 'Einnahmen & Auszahlungen',
  intelligence: 'Tagro & Klarheit',
  portal: 'Client Portal',
  privacy: 'Datenschutz',
  shortcuts: 'Tastenkürzel',
  apps: 'Apps & Erweiterung',
}

export type SettingsNavAction = 'support' | 'replay-tour'

export type SettingsNavItem = {
  slug: string
  label: string
  icon: Icon
  /** Interner Link ausserhalb von /settings */
  href?: string
  action?: SettingsNavAction
}

export type SettingsNavGroup = { label: string; items: SettingsNavItem[] }

/**
 * Full nav (mobile sheets, command palette helpers, legacy).
 * Support actions stay here — not on the Client settings rail.
 */
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: 'Konto',
    items: [
      { slug: '', label: 'Profil', icon: UserCircle },
      { slug: 'appearance', label: 'Erscheinung', icon: SunHorizon },
      { slug: 'security', label: 'Sicherheit', icon: ShieldCheck },
      { slug: 'notifications', label: 'Benachrichtigungen', icon: Bell },
      { slug: 'connected', label: 'Verbundene Konten', icon: LinkSimple },
      { slug: 'apps', label: 'Apps & Erweiterung', icon: PuzzlePiece },
      { slug: 'shortcuts', label: 'Tastenkürzel', icon: Keyboard },
    ],
  },
  {
    label: 'Delivery Intelligence',
    items: [
      { slug: 'intelligence', label: 'Tagro & Klarheit', icon: Sparkle },
      { slug: 'portal', label: 'Client Portal', icon: Eye },
      { slug: 'workspace', label: 'Workspace', icon: GearSix },
    ],
  },
  {
    label: 'Organisation',
    items: [
      { slug: 'company', label: 'Unternehmen', icon: Briefcase },
      { slug: 'documents', label: 'Dokumente', icon: FileText },
      { slug: 'earnings', label: 'Einnahmen & Auszahlungen', icon: CurrencyEur },
      { slug: 'billing', label: 'Abrechnung & Steuer', icon: Receipt },
      { slug: 'privacy', label: 'Datenschutz', icon: LockKey },
    ],
  },
  {
    label: 'Support & Ressourcen',
    items: [
      { slug: 'support-contact', label: 'Kontakt', icon: ChatTeardropDots, action: 'support' },
      { slug: 'support-status', label: 'Festag Status', icon: CheckCircle, href: '/updates' },
      { slug: 'support-news', label: 'Was ist neu', icon: Newspaper, href: '/whats-new' },
      { slug: 'support-tour', label: 'Einführung starten', icon: Sparkle, action: 'replay-tour' },
    ],
  },
]

/**
 * Sparse Client settings rail — icons + labels only, no Support menu clutter.
 * Mirrors Dev settings workspace: calm groups, quiet density.
 */
export type ClientSettingsRailGroup = {
  id: string
  label: string
  defaultCollapsed?: boolean
  items: Array<{ slug: string; label: string; icon: Icon }>
}

export const CLIENT_SETTINGS_RAIL: ClientSettingsRailGroup[] = [
  {
    id: 'you',
    label: 'Du',
    items: [
      { slug: '', label: 'Profil', icon: UserCircle },
      { slug: 'appearance', label: 'Erscheinung', icon: SunHorizon },
      { slug: 'security', label: 'Sicherheit', icon: ShieldCheck },
      { slug: 'notifications', label: 'Benachrichtigungen', icon: Bell },
      { slug: 'connected', label: 'Verbundene Konten', icon: LinkSimple },
      { slug: 'shortcuts', label: 'Tastenkürzel', icon: Keyboard },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { slug: 'workspace', label: 'Workspace', icon: GearSix },
      { slug: 'intelligence', label: 'Tagro', icon: Sparkle },
      { slug: 'portal', label: 'Client Portal', icon: Eye },
      { slug: 'privacy', label: 'Datenschutz', icon: LockKey },
      { slug: 'apps', label: 'Apps', icon: PuzzlePiece },
    ],
  },
  {
    id: 'org',
    label: 'Organisation',
    defaultCollapsed: true,
    items: [
      { slug: 'company', label: 'Unternehmen', icon: Briefcase },
      { slug: 'documents', label: 'Dokumente', icon: FileText },
      { slug: 'billing', label: 'Abrechnung', icon: Receipt },
      { slug: 'earnings', label: 'Einnahmen', icon: CurrencyEur },
    ],
  },
]

export const CLIENT_SETTINGS_RAIL_ITEMS = CLIENT_SETTINGS_RAIL.flatMap(g => g.items)

export function searchClientSettingsRail(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return CLIENT_SETTINGS_RAIL_ITEMS.filter(item =>
    item.label.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q),
  )
}

/** Flat list — mobile sheets / search that don't need group headings. */
export const SETTINGS_NAV_ITEMS = SETTINGS_NAV_GROUPS.flatMap(g => g.items)

export function settingsHref(slug: string) {
  return slug ? `/settings/${slug}` : '/settings'
}

export function settingsSlugFromPath(pathname: string | null) {
  if (!pathname) return ''
  const m = pathname.match(/^\/settings(?:\/([^/?#]+))?/)
  return m?.[1] || ''
}

export function resolveSettingsSection(slug: string): { section: SettingsSectionId; invalid: boolean } {
  if (!slug) return { section: 'profile', invalid: false }
  const section = SLUG_TO_SECTION[slug]
  if (!section) return { section: 'profile', invalid: true }
  return { section, invalid: false }
}

const RECENT_KEY = 'festag-client-settings-recent'

export function readRecentClientSettings(): SettingsSectionId[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SettingsSectionId[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(id => id in SECTION_TITLE).slice(0, 6)
  } catch {
    return []
  }
}

export function pushRecentClientSetting(id: SettingsSectionId) {
  try {
    const next = [id, ...readRecentClientSettings().filter(x => x !== id)].slice(0, 6)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* noop */ }
}
