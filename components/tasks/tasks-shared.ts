import type { ClientVisibleStatus } from '@/lib/tasks/work-types'
import {
  clientProgress,
  clientStatusHint,
  clientStatusLabelDe,
  clientSummaryText,
  clientViewBucket,
  resolveClientVisibleStatus,
  type ClientTaskShape,
  type ClientTaskView,
} from '@/lib/tasks/client-view'

export type TaskRow = ClientTaskShape & {
  developer_name?: string | null
  owner?: string | null
  assigned_to?: string | null
}

export type ProjectRow = {
  id: string
  title: string
  color?: string | null
}

export type TaskView = ClientTaskView | 'all'
export type SortMode = 'newest' | 'updated' | 'priority' | 'project' | 'group'
export type ComposerMode = 'tagro' | 'manual'

export type TagroPreview = {
  client_summary?: string
  suggested_title?: string
  suggested_description?: string
  priority?: string
  possible_dev_interpretation?: string
  possible_dev_tasks?: string[]
  risks?: string[]
  open_questions?: string[]
  recommended_next_step?: string
  confidence_score?: number
  used_operational_dna?: boolean
}

export const PRIORITY_OPTIONS = [
  { id: 'none', label: 'Keine Priorität' },
  { id: 'critical', label: 'Kritisch' },
  { id: 'high', label: 'Hoch' },
  { id: 'medium', label: 'Mittel' },
  { id: 'low', label: 'Niedrig' },
] as const

export const TASK_VIEWS: { id: TaskView; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'open', label: 'Offen' },
  { id: 'active', label: 'In Arbeit' },
  { id: 'decision', label: 'Warten' },
  { id: 'review', label: 'In Prüfung' },
  { id: 'done', label: 'Erledigt' },
]

export const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'newest', label: 'Neueste zuerst' },
  { id: 'updated', label: 'Letztes Update' },
  { id: 'priority', label: 'Priorität' },
  { id: 'project', label: 'Projekt' },
  { id: 'group', label: 'Nach Bereich' },
]

export function taskBucket(task: TaskRow): Exclude<TaskView, 'all'> {
  return clientViewBucket(resolveClientVisibleStatus(task))
}

export function taskStatusLabel(task: TaskRow): string {
  return clientStatusLabelDe(resolveClientVisibleStatus(task))
}

export function taskStatusHint(task: TaskRow): string {
  return clientStatusHint(resolveClientVisibleStatus(task))
}

export function taskSummary(task: TaskRow): string {
  return clientSummaryText(task)
}

export function taskProgress(task: TaskRow): number {
  return clientProgress(task)
}

export function taskStatusDotColor(status: ClientVisibleStatus): string {
  switch (status) {
    case 'completed':
      return '#16a34a'
    case 'in_progress':
      return '#d97706'
    case 'in_review':
      return '#6366f1'
    case 'waiting':
    case 'on_hold':
      return '#ea580c'
    default:
      return '#64748b'
  }
}

export function priorityLabel(priority?: string | null): string {
  if (!priority) return 'Normal'
  if (priority === 'critical') return 'Kritisch'
  if (priority === 'high') return 'Hoch'
  if (priority === 'medium') return 'Mittel'
  if (priority === 'low') return 'Niedrig'
  return priority
}

export function sourceLabel(source?: string | null): string {
  if (source === 'client_manual') return 'Von dir'
  if (source === 'client_tagro') return 'Mit Tagro'
  if (source === 'status_report') return 'Statusbericht'
  if (source === 'decision') return 'Entscheidung'
  if (source === 'briefing') return 'Briefing'
  if (source === 'github_activity' || source === 'tagro_internal' || source === 'system') return 'System'
  return 'Projektteam'
}

export function dateLabel(value?: string | null): string {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(new Date(value))
  } catch {
    return '—'
  }
}

export function buildTaskLeadLine(counts: {
  open: number
  active: number
  review: number
}): string {
  return `${counts.open} offen · ${counts.active} in Arbeit · ${counts.review} in Prüfung`
}
