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
