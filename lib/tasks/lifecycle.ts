/**
 * Festag — Task lifecycle.
 *
 * The TypeScript mirror of the state machine that lives in the database
 * (`festag_tasks_sync_lifecycle`, migration `20260819_tasks_system_v1`).
 *
 *   dev_status  = canonical execution lifecycle
 *        ↓ derived, never hand-written
 *   client_visible_status · status · progress · lifecycle timestamps
 *
 * Nothing in the UI may invent a state. Every button maps to exactly one
 * `TaskAction` here, which maps to exactly one target lifecycle state and
 * one set of roles allowed to trigger it. The API validates against this
 * same table, so a hidden button and a forged request fail identically.
 */

import type { DevFlow } from '@/lib/tasks/work-types'
import type { ClientVisibleStatus } from '@/lib/tasks/work-types'

export type TaskLifecycle = DevFlow

export const TASK_LIFECYCLE: readonly TaskLifecycle[] = [
  'new', 'assigned', 'in_progress', 'needs_review', 'blocked', 'on_hold',
  'finished_by_dev', 'verified_by_tagro', 'approved_by_owner', 'completed', 'cancelled',
] as const

export function isTaskLifecycle(value: unknown): value is TaskLifecycle {
  return typeof value === 'string' && (TASK_LIFECYCLE as readonly string[]).includes(value)
}

/* ── Roles ──────────────────────────────────────────────────────────────
 * Role lenses, not separate products (Architecture confirmation §one platform).
 *   owner    — project owner / workspace owner: decides, approves, deletes
 *   lead     — admin or lead dev: full execution control
 *   member   — executes assigned work
 *   client   — requests, approves delivery, sees the translated lens
 *   observer — read only
 */
export type TaskViewerRole = 'owner' | 'lead' | 'member' | 'client' | 'observer'

export const EXECUTION_ROLES: readonly TaskViewerRole[] = ['owner', 'lead', 'member']

/* ── German lifecycle vocabulary (the only labels the UI may print) ───── */

export type LifecycleTone = 'neutral' | 'active' | 'review' | 'warn' | 'done' | 'off'

type LifecycleMeta = {
  /** what the execution side calls this state */
  label: string
  /** what the client lens calls it */
  clientLabel: string
  /** one calm sentence: what is actually happening */
  hint: string
  tone: LifecycleTone
  color: string
}

export const LIFECYCLE_DE: Record<TaskLifecycle, LifecycleMeta> = {
  new: {
    label: 'Neu',
    clientLabel: 'Geplant',
    hint: 'Die Aufgabe ist erfasst und wartet auf eine verantwortliche Person.',
    tone: 'neutral',
    color: '#8790a5',
  },
  assigned: {
    label: 'Zugewiesen',
    clientLabel: 'Geplant',
    hint: 'Verantwortlich ist geklärt — die Umsetzung startet als Nächstes.',
    tone: 'neutral',
    color: '#6a738c',
  },
  in_progress: {
    label: 'In Arbeit',
    clientLabel: 'In Arbeit',
    hint: 'Es wird aktiv daran gearbeitet.',
    tone: 'active',
    color: '#d97706',
  },
  needs_review: {
    label: 'Rückfrage',
    clientLabel: 'In Prüfung',
    hint: 'Etwas muss geklärt werden, bevor es weitergeht.',
    tone: 'review',
    color: '#6366f1',
  },
  blocked: {
    label: 'Blockiert',
    clientLabel: 'Wartet',
    hint: 'Die Aufgabe hängt an einer Abhängigkeit oder Entscheidung.',
    tone: 'warn',
    color: '#ea580c',
  },
  on_hold: {
    label: 'Pausiert',
    clientLabel: 'Pausiert',
    hint: 'Die Aufgabe wurde bewusst zurückgestellt.',
    tone: 'off',
    color: '#94a3b8',
  },
  finished_by_dev: {
    label: 'Fertig gemeldet',
    clientLabel: 'In Prüfung',
    hint: 'Die Umsetzung ist gemeldet — die Prüfung läuft.',
    tone: 'review',
    color: '#6366f1',
  },
  verified_by_tagro: {
    label: 'Von Tagro geprüft',
    clientLabel: 'In Prüfung',
    hint: 'Tagro hat die Umsetzung geprüft — sie wartet auf deine Freigabe.',
    tone: 'review',
    color: '#5b647d',
  },
  approved_by_owner: {
    label: 'Freigegeben',
    clientLabel: 'Erledigt',
    hint: 'Die Aufgabe ist freigegeben und abgeschlossen.',
    tone: 'done',
    color: '#16a34a',
  },
  completed: {
    label: 'Erledigt',
    clientLabel: 'Erledigt',
    hint: 'Die Aufgabe ist abgeschlossen.',
    tone: 'done',
    color: '#16a34a',
  },
  cancelled: {
    label: 'Abgebrochen',
    clientLabel: 'Verworfen',
    hint: 'Die Aufgabe wird nicht weiterverfolgt.',
    tone: 'off',
    color: '#64748b',
  },
}

/** The label a given viewer is allowed to see. Clients get the translated lens. */
export function lifecycleLabel(flow: TaskLifecycle, role: TaskViewerRole): string {
  const meta = LIFECYCLE_DE[flow] ?? LIFECYCLE_DE.new
  return role === 'client' || role === 'observer' ? meta.clientLabel : meta.label
}

export function lifecycleHint(flow: TaskLifecycle): string {
  return (LIFECYCLE_DE[flow] ?? LIFECYCLE_DE.new).hint
}

export function lifecycleColor(flow: TaskLifecycle): string {
  return (LIFECYCLE_DE[flow] ?? LIFECYCLE_DE.new).color
}

/* ── Buckets — the five columns the list actually offers ─────────────── */

export type TaskBucket = 'open' | 'active' | 'waiting' | 'review' | 'done'

export function bucketOf(flow: TaskLifecycle): TaskBucket {
  switch (flow) {
    case 'in_progress': return 'active'
    case 'needs_review':
    case 'finished_by_dev':
    case 'verified_by_tagro': return 'review'
    case 'blocked':
    case 'on_hold': return 'waiting'
    case 'approved_by_owner':
    case 'completed':
    case 'cancelled': return 'done'
    default: return 'open'
  }
}

export const BUCKET_LABEL: Record<TaskBucket, string> = {
  open: 'Offen',
  active: 'In Arbeit',
  waiting: 'Wartet',
  review: 'Prüfung',
  done: 'Erledigt',
}

export function clientStatusOf(flow: TaskLifecycle): ClientVisibleStatus {
  switch (flow) {
    case 'in_progress': return 'in_progress'
    case 'needs_review':
    case 'finished_by_dev':
    case 'verified_by_tagro': return 'in_review'
    case 'blocked': return 'waiting'
    case 'on_hold':
    case 'cancelled': return 'on_hold'
    case 'approved_by_owner':
    case 'completed': return 'completed'
    default: return 'planned'
  }
}

/* ── Actions — every button in the product ───────────────────────────── */

export type TaskAction =
  | 'start'
  | 'pause'
  | 'resume'
  | 'block'
  | 'unblock'
  | 'ask'
  | 'submit'
  | 'approve'
  | 'request_changes'
  | 'reopen'
  | 'cancel'
  | 'restore'

type ActionDef = {
  /** target lifecycle state */
  to: TaskLifecycle
  label: string
  /** what the person is told will happen — used in confirmations */
  consequence: string
  /** lifecycle states this action can be triggered from */
  from: readonly TaskLifecycle[]
  roles: readonly TaskViewerRole[]
  tone: 'primary' | 'default' | 'danger'
  /** needs a short reason before it can run */
  reason?: 'required' | 'optional'
  confirm?: boolean
}

export const TASK_ACTIONS: Record<TaskAction, ActionDef> = {
  start: {
    to: 'in_progress',
    label: 'Umsetzung starten',
    consequence: 'Die Aufgabe wird als „In Arbeit" geführt und im Projektstatus sichtbar.',
    from: ['new', 'assigned', 'on_hold', 'blocked', 'needs_review'],
    roles: ['owner', 'lead', 'member'],
    tone: 'primary',
  },
  pause: {
    to: 'on_hold',
    label: 'Pausieren',
    consequence: 'Die Aufgabe wird zurückgestellt. Der Fortschritt bleibt erhalten.',
    from: ['new', 'assigned', 'in_progress', 'needs_review', 'blocked'],
    roles: ['owner', 'lead', 'member', 'client'],
    tone: 'default',
    reason: 'optional',
  },
  resume: {
    to: 'in_progress',
    label: 'Fortsetzen',
    consequence: 'Die Aufgabe läuft wieder.',
    from: ['on_hold'],
    roles: ['owner', 'lead', 'member', 'client'],
    tone: 'primary',
  },
  block: {
    to: 'blocked',
    label: 'Als blockiert melden',
    consequence: 'Die Aufgabe wird als blockiert geführt und erscheint als Blocker im Projektstatus.',
    from: ['new', 'assigned', 'in_progress', 'needs_review', 'finished_by_dev'],
    roles: ['owner', 'lead', 'member'],
    tone: 'default',
    reason: 'required',
  },
  unblock: {
    to: 'in_progress',
    label: 'Blocker aufgelöst',
    consequence: 'Die Aufgabe läuft weiter.',
    from: ['blocked'],
    roles: ['owner', 'lead', 'member'],
    tone: 'primary',
  },
  ask: {
    to: 'needs_review',
    label: 'Rückfrage stellen',
    consequence: 'Die Aufgabe wartet auf eine Klärung. Die Projektverantwortlichen werden informiert.',
    from: ['new', 'assigned', 'in_progress'],
    roles: ['owner', 'lead', 'member'],
    tone: 'default',
    reason: 'required',
  },
  submit: {
    to: 'finished_by_dev',
    label: 'Fertig melden',
    consequence: 'Die Umsetzung geht in die Prüfung. Erst nach Freigabe gilt sie als erledigt.',
    from: ['in_progress', 'needs_review', 'blocked'],
    roles: ['owner', 'lead', 'member'],
    tone: 'primary',
  },
  approve: {
    to: 'approved_by_owner',
    label: 'Freigeben',
    consequence: 'Die Aufgabe gilt als abgeschlossen und zählt in den Projektfortschritt.',
    from: ['finished_by_dev', 'verified_by_tagro', 'in_progress', 'needs_review'],
    roles: ['owner', 'lead', 'client'],
    tone: 'primary',
    confirm: true,
  },
  request_changes: {
    to: 'in_progress',
    label: 'Änderungen anfordern',
    consequence: 'Die Aufgabe geht zurück in die Umsetzung — mit deiner Begründung als Kontext.',
    from: ['finished_by_dev', 'verified_by_tagro'],
    roles: ['owner', 'lead', 'client'],
    tone: 'default',
    reason: 'required',
  },
  reopen: {
    to: 'in_progress',
    label: 'Wieder öffnen',
    consequence: 'Die Aufgabe wird erneut geöffnet und aus dem abgeschlossenen Stand geholt.',
    from: ['approved_by_owner', 'completed', 'cancelled'],
    roles: ['owner', 'lead'],
    tone: 'default',
    reason: 'optional',
    confirm: true,
  },
  cancel: {
    to: 'cancelled',
    label: 'Verwerfen',
    consequence: 'Die Aufgabe wird nicht weiterverfolgt. Sie bleibt im Verlauf nachvollziehbar.',
    from: ['new', 'assigned', 'in_progress', 'needs_review', 'blocked', 'on_hold', 'finished_by_dev', 'verified_by_tagro'],
    roles: ['owner', 'lead'],
    tone: 'danger',
    reason: 'optional',
    confirm: true,
  },
  restore: {
    to: 'new',
    label: 'Zurückholen',
    consequence: 'Die Aufgabe wird wieder aufgenommen und landet im offenen Stapel.',
    from: ['cancelled'],
    roles: ['owner', 'lead'],
    tone: 'default',
  },
}

export function actionsFor(flow: TaskLifecycle, role: TaskViewerRole): TaskAction[] {
  return (Object.keys(TASK_ACTIONS) as TaskAction[]).filter((key) => {
    const def = TASK_ACTIONS[key]
    return def.from.includes(flow) && def.roles.includes(role)
  })
}

export function canRunAction(action: TaskAction, flow: TaskLifecycle, role: TaskViewerRole): boolean {
  const def = TASK_ACTIONS[action]
  if (!def) return false
  return def.from.includes(flow) && def.roles.includes(role)
}

/** The one action the list surfaces inline — never more than one per row. */
export function primaryAction(flow: TaskLifecycle, role: TaskViewerRole): TaskAction | null {
  const order: TaskAction[] = flow === 'finished_by_dev' || flow === 'verified_by_tagro'
    ? ['approve', 'request_changes']
    : flow === 'blocked'
      ? ['unblock']
      : flow === 'on_hold'
        ? ['resume']
        : flow === 'in_progress'
          ? ['submit']
          : ['start', 'resume']
  return order.find((action) => canRunAction(action, flow, role)) ?? null
}

/* ── Attention — what needs a human, and whom ────────────────────────── */

export type AttentionKind = 'blocked' | 'approval' | 'overdue' | 'unassigned' | 'question' | null

export type AttentionInput = {
  dev_status?: string | null
  due_date?: string | null
  assigned_to?: string | null
  blocked_reason?: string | null
}

export type Attention = {
  kind: Exclude<AttentionKind, null>
  /** short reason shown next to the task */
  label: string
  /** ordering weight — lower is more urgent */
  weight: number
}

export function attentionOf(task: AttentionInput, role: TaskViewerRole): Attention | null {
  const flow = isTaskLifecycle(task.dev_status) ? task.dev_status : 'new'
  if (flow === 'cancelled' || flow === 'completed' || flow === 'approved_by_owner') return null

  if (flow === 'finished_by_dev' || flow === 'verified_by_tagro') {
    if (role === 'owner' || role === 'lead' || role === 'client') {
      return { kind: 'approval', label: 'Wartet auf deine Freigabe', weight: 0 }
    }
  }
  if (flow === 'blocked') {
    return { kind: 'blocked', label: task.blocked_reason?.trim() || 'Blockiert', weight: 1 }
  }
  if (flow === 'needs_review') {
    return { kind: 'question', label: 'Rückfrage offen', weight: 2 }
  }
  if (isOverdue(task.due_date, flow)) {
    return { kind: 'overdue', label: `Termin überschritten · ${dueLabel(task.due_date)}`, weight: 3 }
  }
  if (!task.assigned_to && (flow === 'new') && role !== 'client' && role !== 'observer') {
    return { kind: 'unassigned', label: 'Noch niemand verantwortlich', weight: 4 }
  }
  return null
}

export function isOverdue(dueDate?: string | null, flow?: string | null): boolean {
  if (!dueDate) return false
  if (flow === 'completed' || flow === 'approved_by_owner' || flow === 'cancelled') return false
  const due = new Date(`${dueDate}T23:59:59`)
  if (Number.isNaN(due.getTime())) return false
  return due.getTime() < Date.now()
}

export function dueLabel(dueDate?: string | null): string {
  if (!dueDate) return 'Kein Termin'
  const due = new Date(`${dueDate}T12:00:00`)
  if (Number.isNaN(due.getTime())) return 'Kein Termin'
  const today = new Date()
  const days = Math.round((due.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime()) / 86_400_000)
  if (days === 0) return 'Heute'
  if (days === 1) return 'Morgen'
  if (days === -1) return 'Gestern'
  if (days > 1 && days <= 7) return `In ${days} Tagen`
  if (days < -1) return `${Math.abs(days)} Tage überfällig`
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(due)
}

/* ── Priority ────────────────────────────────────────────────────────── */

export const TASK_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const PRIORITY_DE: Record<TaskPriority, { label: string; color: string; rank: number }> = {
  critical: { label: 'Kritisch', color: '#ef4444', rank: 0 },
  high: { label: 'Hoch', color: '#f59e0b', rank: 1 },
  medium: { label: 'Mittel', color: '#6a738c', rank: 2 },
  low: { label: 'Niedrig', color: '#94a3b8', rank: 3 },
}

export function priorityRank(priority?: string | null): number {
  const meta = PRIORITY_DE[(priority ?? '') as TaskPriority]
  return meta ? meta.rank : 2.5
}

export function normalizePriority(value: unknown): TaskPriority | null {
  const raw = String(value ?? '').toLowerCase()
  if (raw === 'none' || raw === '') return null
  return (TASK_PRIORITIES as readonly string[]).includes(raw) ? (raw as TaskPriority) : null
}
