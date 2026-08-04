/**
 * Active workspace selection for Festag OS.
 * Name greeting stays in pending-workspace; this stores the UUID SSOT.
 */

import { rememberWorkspaceName } from '@/lib/pending-workspace'

const ACTIVE_WS_ID_KEY = 'festag_active_workspace_id'
const ACTIVE_WS_COOKIE = 'festag_active_workspace_id'
export const WORKSPACE_SWITCHED_EVENT = 'festag:workspace-switched'

export type WorkspaceSwitchedDetail = {
  id: string
  name?: string
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function writeCookie(id: string | null) {
  if (typeof document === 'undefined') return
  try {
    if (!id) {
      document.cookie = `${ACTIVE_WS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
      return
    }
    document.cookie = `${ACTIVE_WS_COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; SameSite=Lax`
  } catch { /* noop */ }
}

export function getActiveWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ACTIVE_WS_ID_KEY) || ''
    return isUuid(raw) ? raw : null
  } catch {
    return null
  }
}

export function rememberActiveWorkspace(id: string, name?: string) {
  if (typeof window === 'undefined') return
  if (!isUuid(id)) return
  try {
    window.localStorage.setItem(ACTIVE_WS_ID_KEY, id)
  } catch { /* noop */ }
  writeCookie(id)
  if (name?.trim()) rememberWorkspaceName(name.trim())
}

export function clearActiveWorkspaceId() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ACTIVE_WS_ID_KEY)
  } catch { /* noop */ }
  writeCookie(null)
}

export function emitWorkspaceSwitched(detail: WorkspaceSwitchedDetail) {
  if (typeof window === 'undefined') return
  rememberActiveWorkspace(detail.id, detail.name)
  window.dispatchEvent(new CustomEvent(WORKSPACE_SWITCHED_EVENT, { detail }))
}

/** Cookie value for server routes (optional). */
export function readActiveWorkspaceIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/(?:^|;\s*)festag_active_workspace_id=([^;]+)/)
  if (!match?.[1]) return null
  try {
    const raw = decodeURIComponent(match[1].trim())
    return isUuid(raw) ? raw : null
  } catch {
    return null
  }
}
