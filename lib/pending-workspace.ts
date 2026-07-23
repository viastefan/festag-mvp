/** Pending workspace name captured on /register before auth completes. */

const PENDING_KEY = 'festag_pending_workspace_name'
const LAST_WS_KEY = 'festag_last_workspace_name'

/** Workspace / Benutzername — one token, no spaces, max 64 chars. */
export function normalizeWorkspaceName(raw: string): string {
  return String(raw || '').replace(/\s+/g, '').trim().slice(0, 64)
}

export function slugifyWorkspaceName(value: string): string {
  return normalizeWorkspaceName(value)
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

export function setPendingWorkspaceName(name: string) {
  if (typeof window === 'undefined') return
  const next = normalizeWorkspaceName(name)
  try {
    if (next) {
      window.localStorage.setItem(PENDING_KEY, next)
      window.localStorage.setItem(LAST_WS_KEY, next)
    } else {
      window.localStorage.removeItem(PENDING_KEY)
    }
  } catch { /* noop */ }
}

export function getPendingWorkspaceName(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return normalizeWorkspaceName(window.localStorage.getItem(PENDING_KEY) || '') || null
  } catch {
    return null
  }
}

export function clearPendingWorkspaceName() {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(PENDING_KEY) } catch { /* noop */ }
}

export function rememberWorkspaceName(name: string) {
  if (typeof window === 'undefined') return
  const next = normalizeWorkspaceName(name)
  if (!next) return
  try { window.localStorage.setItem(LAST_WS_KEY, next) } catch { /* noop */ }
}

export function getRememberedWorkspaceName(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return (
      normalizeWorkspaceName(window.localStorage.getItem(LAST_WS_KEY) || '') ||
      getPendingWorkspaceName()
    )
  } catch {
    return null
  }
}

export function resolveSignupWorkspaceName(input: string): string | null {
  return normalizeWorkspaceName(input) || getPendingWorkspaceName()
}
