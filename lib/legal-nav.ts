/** Shared legal page routes for nav, footers, and auth landing. */

export const LEGAL_NAV = [
  { href: '/agb', label: 'AGB' },
  { href: '/nutzungsbedingungen', label: 'Nutzung' },
  { href: '/datenschutz', label: 'Datenschutz' },
  { href: '/impressum', label: 'Impressum' },
] as const

export const LEGAL_EXTRA = [
  { href: '/widerruf', label: 'Widerruf' },
] as const

export const AUTH_LEGAL_LINKS = [
  { href: '/blog', label: 'Blog' },
  ...LEGAL_NAV,
] as const

/**
 * Calm availability note under AGB in the auth ··· menu.
 * Festag ships first in DACH — including because of US instability.
 */
export const AUTH_DACH_REGION_NOTE =
  'Aktuell nur in der DACH-Region (Deutschland, Österreich, Schweiz). Wir starten hier bewusst — auch wegen der Unsicherheiten und Krisen in den USA.'
