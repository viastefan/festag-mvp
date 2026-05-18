import type { SupabaseClient } from '@supabase/supabase-js'
import { CLIENT_VISIBLE_LABEL, clientStatusFromDevFlow, type DevFlow } from '@/lib/tasks/work-types'

/**
 * Tagro Sync Bus — the single place that fans dev-side task events out
 * into the surfaces the client and the dev workspaces consume:
 *
 *   1. `task_activity_logs`  — audit trail (per-task, RLS-scoped, the
 *                              client only sees rows with `visible_to_client = true`).
 *   2. `notifications`       — per-user inbox entry. We compute who needs
 *                              to know (assigned dev, project owner,
 *                              client) and write one row per recipient.
 *   3. `messages`            — for client-facing announcements (the
 *                              client portal already renders messages
 *                              with `is_ai=true` as Tagro updates).
 *
 * The translation layer (`translateForClient`) hides every technical
 * artifact behind a calm sentence. The verbose dev story stays inside
 * `task_activity_logs` and Tagro internal summaries.
 */

export type DevEventKind =
  | 'status_changed'
  | 'finished_by_dev'
  | 'tagro_verified'
  | 'needs_review'
  | 'proof_missing'
  | 'quality_issue'
  | 'approved_by_owner'
  | 'owner_changes_requested'
  | 'work_log'
  | 'blocker_reported'
  | 'proof_added'
  | 'client_request_created'
  | 'task_assigned'

export type EmitContext = {
  taskId: string
  projectId: string | null
  actorId: string | null
  actorKind?: 'human' | 'tagro' | 'system' | 'client'
  taskTitle: string
  payload?: Record<string, unknown>
}

/**
 * Emit a task event. Idempotent enough for the simple cases — we always
 * append. Callers decide which event kind fits best.
 */
export async function emitTaskEvent(
  sb: SupabaseClient<any>,
  event: DevEventKind,
  ctx: EmitContext,
) {
  const visibleToClient = isClientVisible(event)
  const actorKind = ctx.actorKind ?? (event.startsWith('tagro_') || event === 'needs_review' || event === 'proof_missing' || event === 'quality_issue' ? 'tagro' : 'human')

  // 1) Activity log (always)
  await sb.from('task_activity_logs').insert({
    task_id: ctx.taskId,
    project_id: ctx.projectId,
    actor_id: ctx.actorId,
    actor_kind: actorKind,
    event,
    metadata: ctx.payload ?? {},
    visible_to_client: visibleToClient,
  }).then(() => null, () => null)

  // 2) Mirror to client message stream for "loud" events
  if (visibleToClient && ctx.projectId) {
    const text = translateForClient(event, ctx)
    if (text) {
      await sb.from('messages').insert({
        project_id: ctx.projectId,
        sender_id: ctx.actorId,
        message: text,
        is_ai: true,
      }).then(() => null, () => null)
    }
  }

  // 3) Notifications — fan out to the right inbox(es)
  await fanoutNotifications(sb, event, ctx, visibleToClient)
}

function isClientVisible(event: DevEventKind): boolean {
  switch (event) {
    case 'approved_by_owner':
    case 'blocker_reported':
    case 'tagro_verified':
      return true
    case 'work_log':
    case 'proof_added':
    case 'proof_missing':
    case 'quality_issue':
    case 'needs_review':
    case 'finished_by_dev':
    case 'status_changed':
    case 'owner_changes_requested':
    case 'task_assigned':
      return false
    case 'client_request_created':
      return false   // dev-facing only — clients already saw their own input
  }
}

/**
 * Calm, jargon-free translation. Returns null when the event has no
 * meaningful client-facing copy (we still log it internally).
 */
export function translateForClient(event: DevEventKind, ctx: EmitContext): string | null {
  const title = ctx.taskTitle || 'Aufgabe'
  switch (event) {
    case 'approved_by_owner':
      return `„${title}" ist abgeschlossen und im Workspace sichtbar.`
    case 'tagro_verified':
      return `Tagro hat „${title}" geprüft — bereit zur finalen Freigabe.`
    case 'blocker_reported':
      return `„${title}" wartet aktuell auf eine Klärung. Tagro bereitet die nächsten Schritte vor.`
    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────
// Fan-out
// ─────────────────────────────────────────────────────────────────────

type Recipient = { userId: string; audience: 'client' | 'dev' | 'admin' }

async function fanoutNotifications(
  sb: SupabaseClient<any>,
  event: DevEventKind,
  ctx: EmitContext,
  visibleToClient: boolean,
) {
  const recipients: Recipient[] = await computeRecipients(sb, event, ctx, visibleToClient)
  if (recipients.length === 0) return

  const { title, body, link } = renderNotification(event, ctx)
  const rows = recipients
    .filter(r => r.userId && r.userId !== ctx.actorId) // never notify yourself
    .map(r => ({
      user_id: r.userId,
      project_id: ctx.projectId,
      task_id: ctx.taskId,
      audience: r.audience,
      kind: event,
      type: event,           // legacy column
      title,
      body,
      message: body,         // legacy column
      link,
      payload: ctx.payload ?? {},
      read: false,
    }))
  if (rows.length === 0) return
  await sb.from('notifications').insert(rows).then(() => null, () => null)
}

async function computeRecipients(
  sb: SupabaseClient<any>,
  event: DevEventKind,
  ctx: EmitContext,
  visibleToClient: boolean,
): Promise<Recipient[]> {
  const out: Recipient[] = []

  // Pull task with both client + assigned dev + project context.
  const { data: task } = await sb.from('tasks')
    .select('id,assigned_to,project_id,projects(user_id,client_id)')
    .eq('id', ctx.taskId).maybeSingle()
  if (!task) return out

  const assignedDev = (task as any).assigned_to as string | null
  const clientId = (task as any).projects?.client_id || (task as any).projects?.user_id
  // Workspace owner == project owner.
  const owner = (task as any).projects?.user_id

  // 1) Dev side — assigned dev is interested in almost every event except
  //    the ones THEY caused (filtered later in fanout).
  if (assignedDev) out.push({ userId: assignedDev, audience: 'dev' })

  // 2) Owner / admin — for handoff events (finished, verified, blocker,
  //    needs review, quality issue, owner-actionable).
  const ownerEvents: DevEventKind[] = [
    'finished_by_dev', 'tagro_verified', 'needs_review', 'quality_issue',
    'proof_missing', 'blocker_reported', 'client_request_created',
  ]
  if (ownerEvents.includes(event) && owner && owner !== assignedDev) {
    out.push({ userId: owner, audience: 'admin' })
  }

  // 3) Client — only for events that are flagged visible.
  if (visibleToClient && clientId) {
    out.push({ userId: clientId, audience: 'client' })
  }

  // De-dupe (a single user might fit multiple roles).
  const seen = new Set<string>()
  return out.filter(r => {
    const key = `${r.userId}:${r.audience}`
    if (seen.has(key)) return false
    seen.add(key); return true
  })
}

function renderNotification(event: DevEventKind, ctx: EmitContext): { title: string; body: string | null; link: string } {
  const title = ctx.taskTitle || 'Aufgabe'
  const taskLinkDev = `/dev/tasks?id=${ctx.taskId}`
  const taskLinkClient = `/tasks?taskId=${ctx.taskId}`

  switch (event) {
    case 'finished_by_dev':
      return { title: `Bereit zur Prüfung: ${title}`, body: 'Der Developer hat den Task abgeschlossen.', link: taskLinkDev }
    case 'tagro_verified':
      return { title: `Verifiziert: ${title}`, body: 'Tagro hat den Task geprüft und freigegeben.', link: taskLinkDev }
    case 'needs_review':
      return { title: `Review nötig: ${title}`, body: 'Tagro fand Hinweise — ein Owner sollte prüfen.', link: taskLinkDev }
    case 'proof_missing':
      return { title: `Nachweise fehlen: ${title}`, body: 'Tagro wartet auf Belege bevor verifiziert werden kann.', link: taskLinkDev }
    case 'quality_issue':
      return { title: `Qualitätsfrage: ${title}`, body: 'Tagro hat Unstimmigkeiten gefunden.', link: taskLinkDev }
    case 'approved_by_owner':
      return { title: `Abgeschlossen: ${title}`, body: 'Im Workspace freigegeben.', link: taskLinkClient }
    case 'owner_changes_requested':
      return { title: `Änderungen angefordert: ${title}`, body: String(ctx.payload?.reason ?? '') || 'Owner hat Änderungen angefordert.', link: taskLinkDev }
    case 'blocker_reported':
      return { title: `Blocker: ${title}`, body: 'Tagro bereitet die Klärung vor.', link: taskLinkClient }
    case 'task_assigned':
      return { title: `Neue Aufgabe: ${title}`, body: 'Du wurdest einem Task zugewiesen.', link: taskLinkDev }
    case 'client_request_created':
      return { title: `Neue Anfrage: ${title}`, body: 'Der Client hat eine neue Aufgabe gestellt.', link: taskLinkDev }
    case 'work_log':
      return { title: `Update: ${title}`, body: String(ctx.payload?.preview ?? ''), link: taskLinkDev }
    case 'status_changed':
      return { title: `Status: ${title}`, body: `→ ${ctx.payload?.to ?? '–'}`, link: taskLinkDev }
    case 'proof_added':
      return { title: `Nachweis: ${title}`, body: `${ctx.payload?.proof_type ?? 'neuer Beleg'} hinzugefügt.`, link: taskLinkDev }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers callers can reuse
// ─────────────────────────────────────────────────────────────────────

export function clientCopyForStatus(devFlow: DevFlow | string): string {
  const f = devFlow as DevFlow
  const status = clientStatusFromDevFlow(f) as keyof typeof CLIENT_VISIBLE_LABEL
  return CLIENT_VISIBLE_LABEL[status] ?? status
}
