export const TASK_SOURCES = [
  'client_manual',
  'client_tagro',
  'status_report',
  'decision',
  'admin',
  'developer',
  'tagro_internal',
  'github_activity',
  'briefing',
  'system',
] as const

export const TASK_TYPES = [
  'client_action',
  'client_request',
  'client_manual_task',
  'tagro_structured_client_task',
  'internal_dev_task',
  'status_report_action',
  'decision_linked_task',
  'admin_review_task',
  'bug_report',
  'change_request',
  'blocker_resolution',
  'follow_up',
  'github_follow_up',
  'briefing_action',
] as const

export const GROUP_KEYS = [
  'client_action',
  'development',
  'decision',
  'blocker',
  'review',
  'material',
  'testing',
  'launch',
  'follow_up',
  'admin',
] as const

export const CLIENT_STATUSES = [
  'submitted',
  'assigned',
  'in_progress',
  'waiting_for_client',
  'waiting_for_assignment',
  'ready_for_review',
  'completed',
  'cancelled',
] as const

export const DEV_STATUSES = [
  'todo',
  'accepted',
  'in_progress',
  'blocked',
  'review',
  'done',
  'cancelled',
] as const

export const VEYRA_RUN_TYPES = [
  'task_proposal',
  'status_report',
  'action_item_extraction',
  'client_safe_transform',
  'decision_detection',
  'github_analysis',
] as const

export type TaskSource = typeof TASK_SOURCES[number]
export type TaskType = typeof TASK_TYPES[number]
export type GroupKey = typeof GROUP_KEYS[number]
export type ClientStatus = typeof CLIENT_STATUSES[number]
export type DevStatus = typeof DEV_STATUSES[number]
export type VeyraRunType = typeof VEYRA_RUN_TYPES[number]
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type Audience = 'client' | 'developer' | 'admin' | 'tagro'

export type ActionItemType =
  | 'client_task'
  | 'dev_task'
  | 'decision'
  | 'admin_task'
  | 'blocker_task'
  | 'follow_up'
  | 'no_action'

export type VeyraActionItem = {
  type: ActionItemType
  title: string
  description?: string
  priority?: Priority | ''
  owner_type?: Audience
  client_visible?: boolean
  requires_approval?: boolean
  related_reason?: string
  source_sentence?: string
  confidence_score?: number
}

export type TaskProposalOutput = {
  client_summary: string
  suggested_title: string
  suggested_description: string
  task_type: TaskType
  priority: Priority
  possible_dev_interpretation: string
  risks: string[]
  open_questions: string[]
  needs_decision: boolean
  confidence_score: number
}

export type StatusReportOutput = {
  summary: string
  completed_work: string[]
  current_work: string[]
  next_steps: string[]
  blockers: string[]
  risks: string[]
  client_required_actions: string[]
  dev_followups: string[]
  decisions_needed: string[]
  suggested_action_items: VeyraActionItem[]
  confidence_score: number
}

export const VEYRA_BACKEND_RULES = [
  'Client darf keine internen Dev-Felder, raw GitHub-Daten, private Admin Notes oder technische Token sehen.',
  'Developer sieht ausführbare technische Aufgaben, Quelle, Status, Acceptance Criteria und interne Updates.',
  'Admin sieht Quellen, Veyra-Runs, Audit Logs, rohe Action Items und Zuweisungszustände.',
  'Keine Task-Erstellung ohne project_id.',
  'Jede Task braucht source, task_type, group_key, audience und auditierbare Herkunft.',
  'Entscheidungen gehören in decisions und nicht nur in tasks.',
  'Statusberichte können 0-2 Action Items erzeugen, aber nicht zwanghaft wenn nichts offen ist.',
  'Manuelle Client Tasks gehen direkt in den Dev Workflow, bleiben aber projektgebunden.',
  'Veyra strukturiert Client-Wünsche, veröffentlicht kritische Entscheidungen aber nicht automatisch.',
  'Client Status und Dev Status bleiben getrennt und werden nur serverseitig gemappt.',
  'Keine technischen Erledigt-Behauptungen ohne Dev/GitHub/Status-Beleg.',
]

export const CLIENT_SOURCE_LABELS: Record<TaskSource, string> = {
  client_manual: 'Manuell erstellt',
  client_tagro: 'Von Veyra vorbereitet',
  status_report: 'Aus Statusbericht',
  decision: 'Aus Entscheidung',
  admin: 'Vom Projektteam',
  developer: 'Vom Projektteam',
  tagro_internal: 'System',
  github_activity: 'System',
  briefing: 'Aus Briefing',
  system: 'System',
}

export const DEV_SOURCE_LABELS: Record<TaskSource, string> = {
  client_manual: 'client_manual',
  client_tagro: 'client_tagro',
  status_report: 'status_report_action',
  decision: 'decision_dependency',
  admin: 'admin_task',
  developer: 'developer',
  tagro_internal: 'tagro_internal',
  github_activity: 'github_activity',
  briefing: 'briefing',
  system: 'system',
}

export function clampPriority(value: unknown, fallback: Priority = 'medium'): Priority {
  return value === 'critical' || value === 'high' || value === 'medium' || value === 'low'
    ? value
    : fallback
}

export function clampConfidence(value: unknown) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0.6
  return Math.max(0, Math.min(1, n))
}
