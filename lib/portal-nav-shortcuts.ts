/**
 * Portal sidebar — Linear-style G-then-X navigation shortcuts.
 * Display + keyboard handler share this map.
 */

import { PORTAL_NAV } from '@/lib/portal-nav'

const BY_HREF: Record<string, readonly [string, string]> = {
  '/tagro': ['G', 'U'],
  '/reports': ['G', 'B'],
  '/projects': ['G', 'P'],
  '/tasks': ['G', 'K'],
  '/decisions': ['G', 'E'],
  '/workspace': ['G', 'W'],
  '/settings': ['G', 'S'],
  /* Legacy routes — reachable via command palette, not sidebar */
  '/dashboard': ['G', 'D'],
  '/executive': ['G', 'F'],
  '/messages': ['G', 'I'],
  '/captures': ['G', 'R'],
  '/deliverables': ['G', 'L'],
  '/objectives': ['G', 'Z'],
  '/issues': ['G', 'V'],
  '/activity': ['G', 'A'],
  '/docs': ['G', 'O'],
  '/connectors': ['G', 'N'],
  '/teams': ['G', 'M'],
}

const LABEL_BY_HREF: Record<string, string> = {
  ...Object.fromEntries(PORTAL_NAV.map(item => [item.href, item.label])),
  '/settings': 'Einstellungen',
}

/** Routes always reachable via G-then-X even when not in the sidebar rail. */
export const PORTAL_SHORTCUT_ALWAYS_ALLOWED = ['/settings'] as const

const BY_SECOND_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(BY_HREF).map(([href, [, second]]) => [second.toLowerCase(), href]),
)

export type PortalShortcutRow = {
  href: string
  label: string
  keys: readonly [string, string]
}

export function portalNavShortcutKeys(href: string): string[] | null {
  const row = BY_HREF[href]
  return row ? [row[0], row[1]] : null
}

export function portalNavShortcutLabel(href: string): string | null {
  const keys = portalNavShortcutKeys(href)
  return keys ? keys.join(' ') : null
}

/** Resolve the second key after G (e.g. "e" → /decisions). */
export function portalGotoFromSecondKey(key: string): string | null {
  return BY_SECOND_KEY[key.toLowerCase()] ?? null
}

/** G-then-X map limited to routes visible in the current workspace sidebar (+ settings). */
export function portalGotoDestMapForHrefs(hrefs: readonly string[]): Record<string, string> {
  const allowed = new Set<string>([...hrefs, ...PORTAL_SHORTCUT_ALWAYS_ALLOWED])
  return Object.fromEntries(
    Object.entries(BY_SECOND_KEY).filter(([, href]) => allowed.has(href)),
  )
}

export function portalGotoDestMap(): Record<string, string> {
  return { ...BY_SECOND_KEY }
}

export function portalShortcutRowsForHrefs(hrefs: readonly string[]): PortalShortcutRow[] {
  const allowed = new Set<string>([...hrefs, ...PORTAL_SHORTCUT_ALWAYS_ALLOWED])
  return Object.entries(BY_HREF)
    .filter(([href]) => allowed.has(href))
    .map(([href, keys]) => ({
      href,
      keys,
      label: LABEL_BY_HREF[href] || href,
    }))
}

export function allPortalShortcutRows(): PortalShortcutRow[] {
  return Object.entries(BY_HREF).map(([href, keys]) => ({
    href,
    keys,
    label: LABEL_BY_HREF[href] || href,
  }))
}
