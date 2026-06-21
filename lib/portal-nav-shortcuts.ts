/**
 * Portal sidebar — Linear-style G-then-X navigation shortcuts.
 * Display + keyboard handler share this map.
 */

const BY_HREF: Record<string, readonly [string, string]> = {
  '/dashboard': ['G', 'D'],
  '/executive': ['G', 'F'],
  '/messages': ['G', 'I'],
  '/projects': ['G', 'P'],
  '/decisions': ['G', 'E'],
  '/captures': ['G', 'R'],
  '/deliverables': ['G', 'L'],
  '/objectives': ['G', 'Z'],
  '/issues': ['G', 'V'],
  '/activity': ['G', 'A'],
  '/tasks': ['G', 'T'],
  '/docs': ['G', 'U'],
  '/connectors': ['G', 'N'],
  '/teams': ['G', 'M'],
  '/settings': ['G', 'S'],
}

const BY_SECOND_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(BY_HREF).map(([href, [, second]]) => [second.toLowerCase(), href]),
)

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

/** G-then-X map limited to routes visible in the current workspace sidebar. */
export function portalGotoDestMapForHrefs(hrefs: readonly string[]): Record<string, string> {
  const allowed = new Set(hrefs)
  return Object.fromEntries(
    Object.entries(BY_SECOND_KEY).filter(([, href]) => allowed.has(href)),
  )
}

export function portalGotoDestMap(): Record<string, string> {
  return { ...BY_SECOND_KEY }
}
