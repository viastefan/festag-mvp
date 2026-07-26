/** Resolve Tagro @-context label for public legal routes. */

const LEGAL_TAGRO_BY_PATH: Record<string, string> = {
  '/agb': 'AGB',
  '/nutzungsbedingungen': 'Nutzungsbedingungen',
  '/datenschutz': 'Datenschutz',
  '/impressum': 'Impressum',
  '/widerruf': 'Widerruf',
  '/privacy': 'Datenschutz',
  '/terms': 'AGB',
  '/terms-of-use': 'Nutzungsbedingungen',
}

/** Human label for the current legal article (no @ prefix). */
export function legalTagroContextLabel(pathname: string | null | undefined, pageTitle?: string): string {
  const path = (pathname || '').split('?')[0].replace(/\/$/, '') || '/'
  const mapped = LEGAL_TAGRO_BY_PATH[path]
  if (mapped) return mapped
  const title = (pageTitle || '').trim()
  if (title && title !== 'Rechtstext') return title
  const slug = path.split('/').filter(Boolean).pop()
  if (!slug) return 'Rechtstext'
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

/** Pinned composer / overlay mention, e.g. `@Nutzungsbedingungen`. */
export function legalTagroMention(pathname: string | null | undefined, pageTitle?: string): string {
  const label = legalTagroContextLabel(pathname, pageTitle)
  return label.startsWith('@') ? label : `@${label}`
}
