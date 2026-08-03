/** Open the Phase 2 workspace creation popup slider from anywhere in Festag OS. */

export const OPEN_WORKSPACE_CREATE_EVENT = 'festag:open-workspace-create'
export const WORKSPACE_CREATED_EVENT = 'festag:workspace-created'

export function openWorkspaceCreateWizard() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_WORKSPACE_CREATE_EVENT))
}

export function emitWorkspaceCreated(name: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_CREATED_EVENT, { detail: { name } }),
  )
}
