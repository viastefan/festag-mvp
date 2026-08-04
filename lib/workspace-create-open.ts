/** Open / signal Festag OS workspace creation and setup. */

export const OPEN_WORKSPACE_CREATE_EVENT = 'festag:open-workspace-create'
export const WORKSPACE_CREATED_EVENT = 'festag:workspace-created'
export const WORKSPACE_SETUP_DONE_EVENT = 'festag:workspace-setup-done'

export type WorkspaceCreatedDetail = {
  name: string
  id?: string
}

export function openWorkspaceCreateWizard() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_WORKSPACE_CREATE_EVENT))
}

export function emitWorkspaceCreated(detail: WorkspaceCreatedDetail | string) {
  if (typeof window === 'undefined') return
  const payload: WorkspaceCreatedDetail =
    typeof detail === 'string' ? { name: detail } : detail
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_CREATED_EVENT, { detail: payload }),
  )
}

export function emitWorkspaceSetupDone(detail: {
  workspaceId?: string
  projectId?: string
  name?: string
}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_SETUP_DONE_EVENT, { detail }),
  )
}
