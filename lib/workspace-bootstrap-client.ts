/**
 * Client helper for POST /api/workspaces/bootstrap.
 * Used by AuthLanding, auth callback, create-workspace, and onboarding.
 */
import {
  clearPendingWorkspaceName,
  normalizeWorkspaceName,
  rememberWorkspaceName,
  setPendingWorkspaceName,
} from '@/lib/pending-workspace'

export type BootstrapWorkspaceResult =
  | { ok: true; workspace: { id: string; name: string; slug: string; region?: string } }
  | { ok: false; reason: string; message: string; status: number }

export async function bootstrapPersonalWorkspace(
  rawName: string,
  opts: { region?: 'eu' | 'us' | 'global' } = {},
): Promise<BootstrapWorkspaceResult> {
  const name = normalizeWorkspaceName(rawName)
  if (!name) {
    return {
      ok: false,
      reason: 'name_required',
      message: 'Bitte einen Workspace-Namen eingeben.',
      status: 400,
    }
  }

  setPendingWorkspaceName(name)

  try {
    const res = await fetch('/api/workspaces/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ...(opts.region ? { region: opts.region } : {}) }),
      credentials: 'include',
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        reason: String(data?.reason || 'bootstrap_failed'),
        message:
          data?.message ||
          (res.status === 409
            ? 'Dieser Workspace-Name ist bereits vergeben.'
            : 'Workspace konnte nicht erstellt werden.'),
        status: res.status,
      }
    }
    clearPendingWorkspaceName()
    rememberWorkspaceName(name)
    return {
      ok: true,
      workspace: {
        id: String(data.workspace?.id || ''),
        name: String(data.workspace?.name || name),
        slug: String(data.workspace?.slug || ''),
        region: data.workspace?.region,
      },
    }
  } catch {
    return {
      ok: false,
      reason: 'network',
      message: 'Netzwerkproblem. Prüfe deine Verbindung und versuche es erneut.',
      status: 0,
    }
  }
}
