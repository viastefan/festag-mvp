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

export const SECTION_LEAD: Record<SettingsSectionId, string> = {
  profile: 'Wer du bist — sichtbar für dein Team und in Briefings.',
  appearance: 'Wie Festag aussieht und sich anfühlt.',
  security: 'Anmeldung, Passkeys und Konto-Schutz.',
  notifications: 'Wann Festag dich erreicht.',
  connected: 'Externe Konten und OAuth-Verbindungen.',
  workspace: 'Modus, Team, Tagro und White Label.',
  company: 'Rechtliche Angaben zu deinem Unternehmen.',
  billing: 'Plan, Steuerdaten und Rechnungsadresse.',
  documents: 'Rechnungssteller für Angebote, Rechnungen und Verträge.',
  earnings: 'Rechnungen oder Verdienste und Auszahlungen, je nach Workspace-Modus.',
  intelligence: 'Wie Tagro Signale in client-ready Klarheit übersetzt.',
  portal: 'Was Kunden sehen — und wie du es vorab prüfst.',
  privacy: 'Datenexport, Transparenz und Löschung.',
  shortcuts: 'Schnell durch Festag navigieren.',
  apps: 'Tagro im Browser und Festag auf dem Desktop.',
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

/** Flat list for sidebar / mobile sheet — no group headings. */
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
