/**
 * Typed browser client for the task API.
 *
 * Every mutation the UI can perform goes through exactly one function here,
 * so there is no path where a button writes to Supabase directly and skips
 * permissions, the lifecycle table or the audit trail.
 */

import type { TaskAction, TaskViewerRole } from '@/lib/tasks/lifecycle'

export type TaskRecord = {
  id: string
  project_id: string
  title: string
  description?: string | null
  client_description?: string | null
  dev_description?: string | null
  dev_status: string
  client_visible_status?: string | null
  status?: string | null
  priority?: string | null
  progress?: number | null
  assigned_to?: string | null
  created_by?: string | null
  due_date?: string | null
  blocked_reason?: string | null
  label?: string | null
  tags?: string[] | null
  task_type?: string | null
  group_key?: string | null
  work_type?: string | null
  audience?: string | null
  client_visible?: boolean | null
  source?: string | null
  origin?: string | null
  latest_client_update?: string | null
  latest_dev_update?: string | null
  tagro_client_summary?: string | null
  customer_update?: string | null
  definition_of_done?: string | null
  expected_outcome?: string | null
  created_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
  started_at?: string | null
  source_decision_id?: string | null
  parent_task_id?: string | null
}

export type ProjectRecord = {
  id: string
  title: string
  color?: string | null
  status?: string | null
  phase?: string | null
}

export type PersonRecord = {
  id: string
  name: string
  email?: string | null
  avatar_url?: string | null
  projects?: string[]
}

export type AccessRecord = {
  projectId: string
  role: TaskViewerRole
  executionDepth: boolean
  canCreate: boolean
  canEdit: boolean
  canAssign: boolean
  canDelete: boolean
}

export type TaskBoardPayload = {
  tasks: TaskRecord[]
  projects: ProjectRecord[]
  people: PersonRecord[]
  access: Record<string, AccessRecord>
  counts: { all: number; open: number; active: number; waiting: number; review: number; done: number; attention: number }
  viewer: { id: string }
}

export class TaskApiError extends Error {
  status: number
  code: string
  constructor(code: string, status: number, message?: string) {
    super(message || messageForCode(code))
    this.code = code
    this.status = status
  }
}

/** Backend errors become sentences a person can act on — never raw codes. */
function messageForCode(code: string): string {
  switch (code) {
    case 'unauthenticated':     return 'Deine Sitzung ist abgelaufen. Bitte melde dich neu an.'
    case 'task_not_found':      return 'Diese Aufgabe existiert nicht mehr oder du hast keinen Zugriff darauf.'
    case 'project_not_found':   return 'Dieses Projekt existiert nicht mehr.'
    case 'not_allowed':         return 'Für diese Aktion fehlt dir die Berechtigung in diesem Projekt.'
    case 'assign_not_allowed':  return 'Nur Projektverantwortliche können Aufgaben zuweisen.'
    case 'action_not_available':return 'Dieser Schritt ist im aktuellen Status nicht möglich. Die Ansicht wurde aktualisiert.'
    case 'reason_required':     return 'Bitte gib kurz an, worum es geht.'
    case 'title_required':      return 'Die Aufgabe braucht einen Titel.'
    case 'project_required':    return 'Bitte wähle ein Projekt.'
    case 'body_required':       return 'Bitte schreibe zuerst etwas.'
    case 'network':             return 'Keine Verbindung. Deine Änderung wurde nicht gespeichert.'
    default:                    return 'Das hat gerade nicht funktioniert. Bitte versuche es erneut.'
  }
}

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(input, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new TaskApiError('network', 0)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new TaskApiError(String(data?.error || 'server_error'), response.status, data?.message)
  }
  return data as T
}

export type TaskQuery = {
  project?: string
  view?: string
  q?: string
  assignee?: string
  priority?: string
  limit?: number
}

export function fetchTaskBoard(query: TaskQuery = {}): Promise<TaskBoardPayload> {
  const params = new URLSearchParams()
  if (query.project && query.project !== 'all') params.set('project', query.project)
  if (query.q) params.set('q', query.q)
  if (query.assignee && query.assignee !== 'all') params.set('assignee', query.assignee)
  if (query.priority && query.priority !== 'all') params.set('priority', query.priority)
  if (query.limit) params.set('limit', String(query.limit))
  const qs = params.toString()
  return call<TaskBoardPayload>(`/api/tasks${qs ? `?${qs}` : ''}`)
}

export type CreateTaskInput = {
  projectId: string
  mode: 'manual' | 'tagro'
  title?: string
  description?: string
  priority?: string | null
  dueDate?: string | null
  labels?: string[]
  assignedTo?: string | null
  definitionOfDone?: string | null
  workType?: string | null
  checklist?: string[]
  proposal?: unknown
  confirm?: boolean
  regenerate?: boolean
}

export function createTask(input: CreateTaskInput) {
  return call<{ ok: true; task?: TaskRecord; proposal?: any }>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function transitionTask(taskId: string, action: TaskAction, reason?: string | null) {
  return call<{ ok: true; task: TaskRecord; message: string; from: string; to: string }>(
    `/api/tasks/${taskId}/transition`,
    { method: 'POST', body: JSON.stringify({ action, reason: reason ?? null }) },
  )
}

export type TaskPatch = {
  title?: string
  description?: string
  priority?: string | null
  dueDate?: string | null
  labels?: string[]
  assignedTo?: string | null
  definitionOfDone?: string | null
}

export function patchTask(taskId: string, patch: TaskPatch) {
  return call<{ ok: true; task: TaskRecord; changed: string[] }>(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function deleteTask(taskId: string) {
  return call<{ ok: true; deleted: string }>(`/api/tasks/${taskId}`, { method: 'DELETE' })
}

export function commentOnTask(taskId: string, body: string, internal = false) {
  return call<{ ok: true }>(`/api/tasks/${taskId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ body, internal }),
  })
}

export type TaskDetailPayload = {
  task: TaskRecord
  project: ProjectRecord | null
  checklist: { id: string; label: string; done: boolean; done_at?: string | null; position: number }[]
  activity: {
    id: string
    event: string
    actor_id?: string | null
    actor_kind?: string | null
    metadata?: Record<string, any> | null
    visible_to_client?: boolean | null
    created_at?: string | null
  }[]
  people: PersonRecord[]
  decision: { id: string; title: string; status?: string | null } | null
  access: AccessRecord
}

export function fetchTaskDetail(taskId: string) {
  return call<TaskDetailPayload>(`/api/tasks/${taskId}`)
}

export function addChecklistItem(taskId: string, label: string) {
  return call<{ ok: true; item: { id: string; label: string; done: boolean; position: number } }>(
    `/api/tasks/${taskId}/checklist`,
    { method: 'POST', body: JSON.stringify({ label }) },
  )
}

export function toggleChecklistItem(taskId: string, itemId: string, done: boolean) {
  return call<{ ok: true; item: { id: string; label: string; done: boolean; position: number } }>(
    `/api/tasks/${taskId}/checklist`,
    { method: 'PATCH', body: JSON.stringify({ itemId, done }) },
  )
}

export function removeChecklistItem(taskId: string, itemId: string) {
  return call<{ ok: true }>(`/api/tasks/${taskId}/checklist?itemId=${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
  })
}
