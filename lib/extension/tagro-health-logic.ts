import { FESTAG_CHROME_EXTENSION } from '@/lib/extension/chrome-extension'

export type ExtensionSessionState = 'unknown' | 'pending' | 'ok' | 'fail'
export type BackendState = 'unknown' | 'ready' | 'fail'

export type TagroHealthSnapshot = {
  installed: boolean
  version: string | null
  versionCurrent: boolean
  browserSessionOk: boolean
  browserBackendReady: boolean | null
  browserUserEmail: string | null
  extensionSessionOk: boolean | null
  extensionBackendReady: boolean | null
  extensionUserEmail: string | null
}

export type TagroChecklistItem = {
  id: string
  label: string
  detail: string
  done: boolean
  action?: { label: string; href: string }
}

export function isExtensionVersionCurrent(version: string | null): boolean {
  if (!version) return false
  return version === FESTAG_CHROME_EXTENSION.version
}

export function parseExtensionDataset(root: HTMLElement = document.documentElement) {
  const version = root.dataset.festagExtension || null
  const session = (root.dataset.festagExtensionSession || 'unknown') as ExtensionSessionState
  const backend = (root.dataset.festagExtensionBackend || 'unknown') as BackendState
  const email = root.dataset.festagExtensionEmail || null
  return { version, session, backend, email }
}

export function buildTagroChecklist(snapshot: TagroHealthSnapshot, sessionLoading: boolean): TagroChecklistItem[] {
  const versionCurrent = snapshot.versionCurrent

  return [
    {
      id: 'extension',
      label: 'Chrome-Erweiterung installiert',
      detail: snapshot.installed
        ? snapshot.version
          ? `Version ${snapshot.version}${versionCurrent ? '' : ` — Update ${FESTAG_CHROME_EXTENSION.version} verfügbar`}`
          : 'Erkannt'
        : 'ZIP laden, in Chrome entpacken und Ordner laden',
      done: snapshot.installed,
      action: !snapshot.installed
        ? { label: 'Erweiterung laden', href: FESTAG_CHROME_EXTENSION.downloadPath }
        : !versionCurrent
          ? { label: 'Update laden', href: FESTAG_CHROME_EXTENSION.downloadPath }
          : undefined,
    },
    {
      id: 'login',
      label: 'Bei festag.app angemeldet',
      detail: snapshot.browserSessionOk
        ? snapshot.browserUserEmail ?? 'Angemeldet'
        : sessionLoading
          ? 'Wird geprüft…'
          : 'Im selben Chrome-Profil bei festag.app einloggen',
      done: snapshot.browserSessionOk,
      action: !snapshot.browserSessionOk && !sessionLoading
        ? { label: 'Anmelden', href: '/login?returnTo=/settings/apps' }
        : undefined,
    },
    {
      id: 'extension-auth',
      label: 'Extension mit Festag verbunden',
      detail: !snapshot.installed
        ? 'Nach Installation automatisch geprüft'
        : snapshot.extensionSessionOk === true
          ? snapshot.extensionUserEmail ?? 'Extension erreicht Festag-API'
          : snapshot.extensionSessionOk === false
            ? 'Extension findet keine Session — gleiches Chrome-Profil nutzen, Popup öffnen'
            : sessionLoading
              ? 'Extension-Session wird geprüft…'
              : 'Wird geprüft…',
      done: snapshot.extensionSessionOk === true,
      action: snapshot.installed && snapshot.extensionSessionOk === false
        ? { label: 'Popup öffnen', href: '/settings/apps' }
        : undefined,
    },
    {
      id: 'backend',
      label: 'KI-Backend bereit',
      detail: effectiveBackendReady(snapshot) === true
        ? 'Schreibhilfe und Live-Feedback sind einsatzbereit'
        : effectiveBackendReady(snapshot) === false
          ? 'Backend noch nicht bereit — kurz warten oder Support kontaktieren'
          : sessionLoading
            ? 'Wird geprüft…'
            : 'Nach Verbindung automatisch geprüft',
      done: effectiveBackendReady(snapshot) === true,
    },
    {
      id: 'test',
      label: 'Auf Testseite ausprobiert',
      detail: 'Beliebige Seite mit F5 neu laden, Text markieren oder Feld fokussieren',
      done: false,
    },
  ]
}

export function effectiveBackendReady(snapshot: TagroHealthSnapshot): boolean | null {
  if (snapshot.extensionBackendReady === true || snapshot.browserBackendReady === true) return true
  if (snapshot.extensionBackendReady === false && snapshot.browserBackendReady === false) return false
  if (snapshot.browserBackendReady === false) return false
  if (snapshot.extensionBackendReady === false) return false
  return null
}

export function computeTagroReady(snapshot: TagroHealthSnapshot): boolean {
  return (
    snapshot.installed
    && snapshot.browserSessionOk
    && snapshot.extensionSessionOk === true
    && effectiveBackendReady(snapshot) === true
    && snapshot.versionCurrent
  )
}

export function countChecklistDone(items: TagroChecklistItem[]): number {
  return items.filter((item) => item.done).length
}
