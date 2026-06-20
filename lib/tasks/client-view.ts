/**
 * Client-facing task presentation — single source for list + detail UI.
 * Reads `client_visible_status` (synced from dev workflow) with safe fallbacks.
 */

import {
  CLIENT_VISIBLE_LABEL,
  type ClientVisibleStatus,
  clientStatusFromDevFlow,
  devFlowFromLegacy,
  progressFromDevFlow,
} from '@/lib/tasks/work-types'

export type ClientTaskView = 'all' | 'open' | 'active' | 'decision' | 'review' | 'done'

export type ClientTaskShape = {
  id: string
  title: string
  project_id?: string | null
  priority?: string | null
  client_visible?: boolean | null
  client_visible_status?: string | null
  client_status?: string | null
  dev_status?: string | null
  status?: string | null
  latest_client_update?: string | null
  tagro_client_summary?: string | null
  customer_update?: string | null
  latest_dev_update?: string | null
  task_type?: string | null
  audience?: string | null
  group_key?: string | null
  source?: string | null
  progress?: number | null
  due_date?: string | null
  updated_at?: string | null
  created_at?: string | null
  completed_at?: string | null
}

const CLIENT_VISIBLE_DE: Record<ClientVisibleStatus, string> = {
  planned: 'Geplant',
  in_progress: 'In Arbeit',
  in_review: 'In Prüfung',
  waiting: 'Wartet',
  on_hold: 'Pausiert',
  completed: 'Erledigt',
}

const CLIENT_STATUS_HINT: Record<ClientVisibleStatus, string> = {
  planned: 'Tagro hat die Aufgabe eingeordnet — Umsetzung startet bald.',
  in_progress: 'Das Projektteam arbeitet an der Umsetzung.',
  in_review: 'Festag prüft die Umsetzung, bevor sie abgeschlossen wird.',
  waiting: 'Es wird auf eine Klärung oder Entscheidung gewartet.',
  on_hold: 'Die Aufgabe ist vorübergehend pausiert.',
  completed: 'Die Aufgabe ist abgeschlossen.',
}

export function resolveClientVisibleStatus(task: Pick<ClientTaskShape, 'client_visible_status' | 'dev_status' | 'status' | 'client_status'>): ClientVisibleStatus {
  const raw = String(task.client_visible_status || '').toLowerCase()
  if (raw && raw in CLIENT_VISIBLE_DE) return raw as ClientVisibleStatus
  const flow = devFlowFromLegacy(task.status, task.dev_status ?? task.client_status)
  return clientStatusFromDevFlow(flow)
}

export function clientStatusLabelDe(status: ClientVisibleStatus): string {
  return CLIENT_VISIBLE_DE[status] ?? CLIENT_VISIBLE_LABEL[status] ?? 'Geplant'
}

export function clientStatusHint(status: ClientVisibleStatus): string {
  return CLIENT_STATUS_HINT[status] ?? CLIENT_STATUS_HINT.planned
}

export function clientViewBucket(status: ClientVisibleStatus): ClientTaskView {
  switch (status) {
    case 'completed':
      return 'done'
    case 'in_review':
      return 'review'
    case 'waiting':
    case 'on_hold':
      return 'decision'
    case 'in_progress':
      return 'active'
    case 'planned':
    default:
      return 'open'
  }
}

export function clientProgress(task: ClientTaskShape): number {
  if (typeof task.progress === 'number' && task.progress > 0) return Math.min(100, task.progress)
  return progressFromDevFlow(devFlowFromLegacy(task.status, task.dev_status ?? task.client_status))
}

export function clientSummaryText(task: ClientTaskShape): string {
  const trimmed = (task.tagro_client_summary || task.latest_client_update || task.customer_update || '').trim()
  if (trimmed) return trimmed
  return clientStatusHint(resolveClientVisibleStatus(task))
}

export function isClientVisibleTask(task: Pick<ClientTaskShape, 'client_visible' | 'audience' | 'task_type'>): boolean {
  if (task.client_visible === false) return false
  if (task.audience === 'internal') return false
  if (task.task_type === 'internal') return false
  return true
}

export function activityEventLabel(event: string, metadata?: Record<string, unknown> | null): string {
  const title = typeof metadata?.taskTitle === 'string' ? metadata.taskTitle : null
  switch (event) {
    case 'approved_by_owner':
      return title ? `„${title}" ist abgeschlossen.` : 'Aufgabe abgeschlossen.'
    case 'tagro_verified':
      return title ? `Tagro hat „${title}" geprüft.` : 'Tagro hat die Umsetzung geprüft.'
    case 'blocker_reported':
      return title ? `„${title}" wartet auf Klärung.` : 'Es wird auf eine Klärung gewartet.'
    case 'client_request_created':
      return 'Neue Aufgabe eingereicht.'
    case 'status_changed':
      return 'Status aktualisiert.'
    case 'finished_by_dev':
      return 'Umsetzung abgeschlossen — Prüfung läuft.'
    case 'task_assigned':
      return 'Aufgabe zugewiesen.'
    default:
      return event.replace(/_/g, ' ')
  }
}
