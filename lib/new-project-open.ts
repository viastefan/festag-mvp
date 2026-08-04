/**
 * Open Create Project / „Neues Projekt“ (Tagro Intent Intake).
 * First project after Workspace Ready: name + optional description → draft → confirm → project.
 * Later: freestyle intake. Architecture v3.7 — docs/festag-create-project-flow.md
 */

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
