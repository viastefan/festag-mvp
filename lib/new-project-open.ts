/** Open Festag OS / Workspace „Neues Projekt“ popup (Tagro Intent Intake). */

export const OPEN_NEW_PROJECT_EVENT = 'festag:open-new-project'
export const PROJECT_CREATED_EVENT = 'festag:project-created'

export type ProjectCreatedDetail = {
  id: string
  title?: string
}

export function openNewProject() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_NEW_PROJECT_EVENT))
}

export function emitProjectCreated(detail: ProjectCreatedDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PROJECT_CREATED_EVENT, { detail }))
}
