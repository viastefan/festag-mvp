import type { SupabaseClient } from '@supabase/supabase-js'
import { CLIENT_VISIBLE_LABEL, clientStatusFromDevFlow, type DevFlow } from '@/lib/tasks/work-types'
import { getServiceClient } from '@/lib/supabase/service'

/**
 * Veyra Sync Bus — the single place that fans dev-side task events out
 * into the surfaces the client and the dev workspaces consume:
 *
 *   1. `task_activity_logs`  — audit trail (per-task, RLS-scoped, the
 *                              client only sees rows with `visible_to_client = true`).
 *   2. `notifications`       — per-user inbox entry. We compute who needs
 *                              to know (assigned dev, project owner,
 *                              client) and write one row per recipient.
 *   3. `messages`            — for client-facing announcements (the
 *                              client portal already renders messages
 *                              with `is_ai=true` as Veyra updates).
 *
 * The translation layer (`translateForClient`) hides every technical
 * artifact behind a calm sentence. The verbose dev story stays inside
 * `task_activity_logs` and Veyra internal summaries.
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
 *
 * Writes go through the **service-role client** when available so the
 * three fan-out tables (task_activity_logs, messages, notifications)
 * bypass RLS. That's correct here because the *event input* is already
 * authorised at the calling API route — the bus is just the persistence
 * fan-out, not a user-driven mutation.
 *
 * Falls back to the supplied (user-session) client when the service key
 * is missing, e.g. local dev without env wiring.
 */
export async function emitTaskEvent(
  sb: SupabaseClient<any>,
  event: DevEventKind,
  ctx: EmitContext,
) {
  const writer: SupabaseClient<any> = (getServiceClient() as any) ?? sb
  const visibleToClient = isClientVisible(event)
  const actorKind = ctx.actorKind ?? (event === 'needs_review' || event === 'proof_missing' || event === 'quality_issue' || event === 'tagro_verified' ? 'tagro' : 'human')

  // 1) Activity log (always)
  await writer.from('task_activity_logs').insert({
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
      await writer.from('messages').insert({
        project_id: ctx.projectId,
        sender_id: ctx.actorId,
        message: text,
        is_ai: true,
      }).then(() => null, () => null)
    }
  }

  // 3) Notifications — fan out to the right inbox(es)
  await fanoutNotifications(writer, sb, event, ctx, visibleToClient)
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
      return `Veyra hat „${title}" geprüft — bereit zur finalen Freigabe.`
    case 'blocker_reported':
      return `„${title}" wartet aktuell auf eine Klärung. Veyra bereitet die nächsten Schritte vor.`
    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────
// Fan-out
// ─────────────────────────────────────────────────────────────────────

type Recipient = { userId: string; audience: 'client' | 'dev' | 'admin' }

async function fanoutNotifications(
  writer: SupabaseClient<any>,
  reader: SupabaseClient<any>,
  event: DevEventKind,
  ctx: EmitContext,
  visibleToClient: boolean,
) {
  // Recipient lookup runs against the user-session client so RLS still
  // ensures we can only enumerate projects the caller may see. The
  // *insert* then goes via the service-role writer.
  const recipients: Recipient[] = await computeRecipients(reader, event, ctx, visibleToClient)
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
  await writer.from('notifications').insert(rows).then(() => null, () => null)

  // Email fan-out for the loud events. Best-effort, fire-and-forget,
  // never blocks the response or the notifications insert above.
  if (EMAIL_TRIGGERING_EVENTS.has(event)) {
    void sendEmailFanout(writer, recipients, event, title, body, link).catch(() => undefined)
  }
}

// Events that earn an email on top of the in-app inbox row. Anything
// outside this set stays in-app only — we don't want to spam.
const EMAIL_TRIGGERING_EVENTS = new Set<DevEventKind>([
  'client_request_created' as DevEventKind,
  'finished_by_dev' as DevEventKind,
  'needs_review' as DevEventKind,
  'blocker_reported' as DevEventKind,
  'owner_changes_requested' as DevEventKind,
  'approved_by_owner' as DevEventKind,
])

async function sendEmailFanout(
  writer: SupabaseClient<any>,
  recipients: Recipient[],
  event: DevEventKind,
  title: string,
  body: string | null,
  link: string,
) {
  // Look up emails for the recipients via service-role-safe profiles read.
  const ids = recipients.map(r => r.userId).filter(Boolean)
  if (!ids.length) return
  const { data: profs } = await writer
    .from('profiles')
    .select('id,email,full_name,notif_email')
    .in('id', ids)

  // Respect the user's notif_email opt-out when the column exists; if
  // it's null (legacy rows) default to allow.
  const eligible = ((profs as any[]) ?? [])
    .filter(p => p?.email && p.notif_email !== false)
    .map(p => p.email as string)

  if (!eligible.length) return

  try {
    const { sendGenericEmail } = await import('@/lib/email/send')
    const origin = process.env.NEXT_PUBLIC_FESTAG_URL || 'https://festag.app'
    await sendGenericEmail({
      to: eligible,
      title,
      subtitle: 'Festag · Veyra Update',
      preheader: body ?? undefined,
      body: `<p>${(body || '').replace(/</g, '&lt;')}</p>
<p style="margin-top:18px;"><a href="${origin}${link}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#5B647D;color:#FFFFFF;text-decoration:none;font-weight:500;">In Festag öffnen</a></p>`,
    })
  } catch {
    // swallow — email backend down should never break the in-app flow
  }
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

  // 1b) On client-driven creation events the task usually has no
  //     assigned_to yet — fan out to every active project_assignment
  //     dev so the whole pool team sees the request land. This is what
  //     wires "client creates task → dev panel" end-to-end.
  const projectWideEvents: DevEventKind[] = ['client_request_created']
  if (projectWideEvents.includes(event) && (task as any).project_id) {
    const { data: paRows } = await sb.from('project_assignments')
      .select('user_id')
      .eq('project_id', (task as any).project_id)
      .eq('active', true)
    for (const row of (paRows as any[]) ?? []) {
      if (row?.user_id && row.user_id !== ctx.actorId) {
        out.push({ userId: row.user_id, audience: 'dev' })
      }
    }
  }

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
      return { title: `Verifiziert: ${title}`, body: 'Veyra hat den Task geprüft und freigegeben.', link: taskLinkDev }
    case 'needs_review':
      return { title: `Review nötig: ${title}`, body: 'Veyra fand Hinweise — ein Owner sollte prüfen.', link: taskLinkDev }
    case 'proof_missing':
      return { title: `Nachweise fehlen: ${title}`, body: 'Veyra wartet auf Belege bevor verifiziert werden kann.', link: taskLinkDev }
    case 'quality_issue':
      return { title: `Qualitätsfrage: ${title}`, body: 'Veyra hat Unstimmigkeiten gefunden.', link: taskLinkDev }
    case 'approved_by_owner':
      return { title: `Abgeschlossen: ${title}`, body: 'Im Workspace freigegeben.', link: taskLinkClient }
    case 'owner_changes_requested':
      return { title: `Änderungen angefordert: ${title}`, body: String(ctx.payload?.reason ?? '') || 'Owner hat Änderungen angefordert.', link: taskLinkDev }
    case 'blocker_reported':
      return { title: `Blocker: ${title}`, body: 'Veyra bereitet die Klärung vor.', link: taskLinkClient }
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
