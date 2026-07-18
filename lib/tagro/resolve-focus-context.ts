/** Resolve the @-context label for the global Tagro focus compose bar. */

export type TagroFocusContext = {
  label: string
  path: string
}

const EXACT: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/statusabfrage': 'Statusabfrage',
  '/projects': 'Projekte',
  '/decisions': 'Entscheidungen',
  '/benachrichtigungen': 'Benachrichtigungen',
  '/messages': 'Nachrichten',
  '/inbox': 'Posteingang',
  '/deliverables': 'Lieferungen',
  '/captures': 'Captures',
  '/executive': 'Führung',
  '/objectives': 'Ziele',
  '/activity': 'Aktivität',
  '/documents': 'Dokumente',
  '/reports': 'Berichte',
  '/connectors': 'Anbindungen',
  '/clients': 'Kunden',
  '/team': 'Team',
  '/settings': 'Einstellungen',
  '/ai': 'Tagro',
}

export function resolveTagroFocusContext(pathname: string): TagroFocusContext {
  const path = String(pathname || '/').split('?')[0] || '/'

  if (EXACT[path]) return { label: EXACT[path], path }

  if (path.startsWith('/project/')) return { label: 'Projekt', path }
  if (path.startsWith('/documents/')) return { label: 'Dokument', path }
  if (path.startsWith('/clients/')) return { label: 'Kunde', path }
  if (path.startsWith('/settings')) return { label: 'Einstellungen', path }
  if (path.startsWith('/decisions')) return { label: 'Entscheidung', path }
  if (path.startsWith('/dev/')) return { label: 'Dev', path }

  const segment = path.split('/').filter(Boolean)[0]
  if (!segment) return { label: 'Festag', path }

  const titled = segment.charAt(0).toUpperCase() + segment.slice(1)
  return { label: titled, path }
}

export function shouldIgnoreTagroFocusTarget(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return true

  if (el.closest('[data-tagro-focus-compose]')) return true
  if (el.closest('.tov-root, .tov-shell, [data-tagro-overlay]')) return true
  if (el.closest('.cp-root, .festag-command-palette, [data-command-palette]')) return true
  if (el.closest('.al-root, .reg-root, .dl-root, .log-root')) return true
  if (el.closest('[data-no-tagro-focus]')) return true

  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase()
    if (['password', 'hidden', 'checkbox', 'radio', 'file', 'submit', 'button', 'range', 'color'].includes(type)) {
      return true
    }
    if (el.readOnly || el.disabled) return true
  }

  if (el instanceof HTMLTextAreaElement && (el.readOnly || el.disabled)) return true

  return false
}

export function isEditableFocusTarget(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return true
  if (el.isContentEditable) return true
  return false
}
