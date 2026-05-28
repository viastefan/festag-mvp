export type TaskGroupKey =
  | 'legal'
  | 'tech'
  | 'integration'
  | 'design'
  | 'content'
  | 'web'
  | 'code'
  | 'process'
  | 'decision'
  | 'blocker'
  | 'client_action'
  | 'follow_up'
  | 'admin'
  | 'planning'

export type TaskGroup = {
  key: TaskGroupKey
  label: string
  color: string
  sortWeight: number
}

type TaskGroupInput = {
  title?: string | null
  priority?: string | null
  task_type?: string | null
  group_key?: string | null
  source?: string | null
}

const GROUPS: Record<TaskGroupKey, TaskGroup> = {
  blocker: { key: 'blocker', label: 'Blocker', color: '#ef4444', sortWeight: 10 },
  decision: { key: 'decision', label: 'Entscheidung', color: '#f59e0b', sortWeight: 20 },
  client_action: { key: 'client_action', label: 'Kunde', color: '#14b8a6', sortWeight: 30 },
  code: { key: 'code', label: 'Code', color: '#6366f1', sortWeight: 40 },
  tech: { key: 'tech', label: 'Technik', color: '#0ea5e9', sortWeight: 45 },
  integration: { key: 'integration', label: 'Integration', color: '#8b5cf6', sortWeight: 50 },
  design: { key: 'design', label: 'Design', color: '#ec4899', sortWeight: 55 },
  web: { key: 'web', label: 'Web', color: '#22c55e', sortWeight: 60 },
  content: { key: 'content', label: 'Inhalt', color: '#f97316', sortWeight: 65 },
  process: { key: 'process', label: 'Ablauf', color: '#64748b', sortWeight: 70 },
  follow_up: { key: 'follow_up', label: 'Follow-up', color: '#64748b', sortWeight: 75 },
  legal: { key: 'legal', label: 'Recht', color: '#64748b', sortWeight: 80 },
  admin: { key: 'admin', label: 'Admin', color: '#64748b', sortWeight: 90 },
  planning: { key: 'planning', label: 'Planung', color: '#4E5567', sortWeight: 100 },
}

const BACKEND_GROUP_MAP: Record<string, TaskGroupKey> = {
  blocker: 'blocker',
  decision: 'decision',
  client_action: 'client_action',
  development: 'code',
  review: 'process',
  follow_up: 'follow_up',
  material: 'content',
  testing: 'process',
  launch: 'web',
  admin: 'admin',
}

function normalizeTaskGroupKey(value?: string | null): TaskGroupKey | null {
  if (!value) return null
  const key = value.toLowerCase()
  if (key in GROUPS) return key as TaskGroupKey
  return BACKEND_GROUP_MAP[key] ?? null
}

export function getTaskGroup(task: TaskGroupInput): TaskGroup {
  const explicitKey = normalizeTaskGroupKey(task.group_key)
  if (explicitKey) return GROUPS[explicitKey]

  const taskTypeKey = normalizeTaskGroupKey(task.task_type)
  if (taskTypeKey) return GROUPS[taskTypeKey]

  const haystack = `${task.title ?? ''} ${task.priority ?? ''}`.toLowerCase()

  if (/datenschutz|impressum|agb|recht|legal|security|sicherheit|compliance/.test(haystack)) return GROUPS.legal
  if (/performance|optimierung|hosting|wordpress|installation|setup|cache|server|deploy/.test(haystack)) return GROUPS.tech
  if (/login|stripe|api|webhook|integration|google|connector|payment|billing/.test(haystack)) return GROUPS.integration
  if (/responsive|theme|design|gestaltung|ui|ux|layout/.test(haystack)) return GROUPS.design
  if (/seo|landing|seite|kontakt|formular|blog|content|inhalt|leistung|über-mich|about/.test(haystack)) return GROUPS.content
  if (/domain|website|web|page/.test(haystack)) return GROUPS.web
  if (/code|refactor|service|sdk|schema|database|db/.test(haystack)) return GROUPS.code
  if (/schulung|test|tests|testplan|dokument|dokumentation|prozess|schnittstelle|architektur|konzept/.test(haystack)) return GROUPS.process

  return GROUPS.planning
}

export function compareTaskGroups(a: TaskGroupInput, b: TaskGroupInput) {
  return getTaskGroup(a).sortWeight - getTaskGroup(b).sortWeight
}
