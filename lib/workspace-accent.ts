/**
 * Workspace accent — the per-workspace brand colour the owner picks in
 * Settings → Workspace. Stored in workspaces.metadata.settings.workspace_color
 * and applied app-wide as the CSS variable `--workspace-accent`.
 *
 * Components that should follow the workspace colour read
 * `var(--workspace-accent, var(--btn-prim))` so they fall back to the slate
 * primary when no colour is set.
 */

export const WORKSPACE_COLOR_SYNC_EVENT = 'festag-workspace-color'

/** Set (or clear) the global --workspace-accent variable. Safe on the server. */
export function applyWorkspaceAccent(color?: string | null): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (color && color.trim()) root.style.setProperty('--workspace-accent', color)
  else root.style.removeProperty('--workspace-accent')
}

/** Broadcast a live change so other mounted views update without a reload. */
export function broadcastWorkspaceAccent(color?: string | null): void {
  if (typeof window === 'undefined') return
  applyWorkspaceAccent(color)
  window.dispatchEvent(new CustomEvent(WORKSPACE_COLOR_SYNC_EVENT, { detail: color ?? null }))
}
