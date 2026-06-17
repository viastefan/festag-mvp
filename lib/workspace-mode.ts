/**
 * Workspace mode — per-workspace operating posture.
 *
 *   client_delivery  → default. The agency uses Festag to run client work.
 *                      Client-facing surfaces (portals, public approvals,
 *                      cliented status reports) are primary.
 *
 *   internal_company → the same workspace, used to run the agency's OWN
 *                      team & projects (no external client). Tagro and the
 *                      sidebar adapt their language so 'Kunde X braucht Y'
 *                      becomes 'Team X braucht Y'. This is the queued
 *                      'Internal Company Mode' from the master prompt list.
 *
 * Persisted per workspace key in localStorage and broadcast on change so any
 * open tab updates immediately — same pattern as workspace-symbol. This is a
 * UX-layer flag for now; row-level data scoping (RLS) is a separate slice.
 */

export type WorkspaceMode = 'client_delivery' | 'internal_company'

export const WORKSPACE_MODE_SYNC_EVENT = 'festag-workspace-mode-change'
const STORAGE_PREFIX = 'festag_workspace_mode::'

export const DEFAULT_WORKSPACE_MODE: WorkspaceMode = 'client_delivery'

export function loadWorkspaceMode(key: string): WorkspaceMode {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_MODE
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === 'internal_company' || raw === 'client_delivery') return raw
  } catch {}
  return DEFAULT_WORKSPACE_MODE
}

export function saveWorkspaceMode(key: string, mode: WorkspaceMode) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, mode)
    window.dispatchEvent(new CustomEvent(WORKSPACE_MODE_SYNC_EVENT, { detail: { key, mode } }))
  } catch {}
}

export function onWorkspaceModeChange(cb: (key: string, mode: WorkspaceMode) => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ key: string; mode: WorkspaceMode }>).detail
    if (detail) cb(detail.key, detail.mode)
  }
  window.addEventListener(WORKSPACE_MODE_SYNC_EVENT, handler)
  return () => window.removeEventListener(WORKSPACE_MODE_SYNC_EVENT, handler)
}

export const WORKSPACE_MODE_LABEL: Record<WorkspaceMode, string> = {
  client_delivery: 'Kunden-Delivery',
  internal_company: 'Intern',
}

export const WORKSPACE_MODE_DESCRIPTION: Record<WorkspaceMode, string> = {
  client_delivery: 'Festag begleitet deine Arbeit für Kunden — mit Portalen, Statusberichten und Freigaben.',
  internal_company: 'Festag begleitet dein eigenes Team — interne Projekte, keine Kundenfreigaben.',
}
