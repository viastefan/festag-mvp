/**
 * Execute Tagro preview results against the existing Festag backend routes
 * (task-proposal, status-report-action-items, decisions/request).
 */

export type TagroSuggestedAction =
  | 'handoff' | 'task' | 'decision' | 'message' | 'note' | 'review'

export type TagroExecuteContext = {
  contextType: string
  id?: string
  projectId?: string
  title?: string
  /** When set, created-item links route to dev panel paths. */
  surface?: 'client' | 'dev'
}

export type TagroExecuteInput = {
  preview: string
  suggestedAction?: string
  ctx: TagroExecuteContext
}

export type TagroExecuteResult = {
  ok: boolean
  mode: 'task' | 'decision' | 'status_report' | 'clipboard' | 'noop' | 'dev_finish' | 'dev_status' | 'dev_update'
  message: string
  created?: Array<{ type: string; id: string; title: string }>
}

export type { TagroCreatedItem } from '@/lib/tagro/created-links'
export { tagroCreatedHref } from '@/lib/tagro/created-links'

export function applyLabelForAction(action?: string): string {
  switch (action as TagroSuggestedAction) {
    case 'task': return 'Als Aufgabe anlegen'
    case 'decision': return 'Als Entscheidung anlegen'
    case 'handoff': return 'Als Übergabe übernehmen'
    case 'message': return 'Als Nachricht übernehmen'
    case 'note': return 'Als Notiz übernehmen'
    case 'review': return 'Zur Prüfung senden'
    default: return 'Übernehmen'
  }
}

export function buildMessageActions(
  suggestedAction: string | undefined,
  contextType: string,
  defaults: string[],
): string[] {
  const primary = applyLabelForAction(suggestedAction)
  const merged = [primary, ...defaults.filter(d => d !== primary)]
  return merged.slice(0, 4)
}

async function resolveProjectId(ctx: TagroExecuteContext): Promise<string | null> {
  if (ctx.projectId) return ctx.projectId
  if (ctx.contextType === 'project' && ctx.id) return ctx.id
  if (!ctx.id) return null

  if (ctx.contextType === 'task') {
    const { createClient } = await import('@/lib/supabase/client')
    const sb = createClient() as any
    const { data } = await sb.from('tasks').select('project_id').eq('id', ctx.id).maybeSingle()
    return data?.project_id ?? null
  }

  if (ctx.contextType === 'status_report' || ctx.contextType === 'report') {
    const { createClient } = await import('@/lib/supabase/client')
    const sb = createClient() as any
    const { data } = await sb.from('status_reports').select('project_id').eq('id', ctx.id).maybeSingle()
    return data?.project_id ?? null
  }

  if (ctx.contextType === 'decision') {
    const { createClient } = await import('@/lib/supabase/client')
    const sb = createClient() as any
    const { data } = await sb.from('decisions').select('project_id').eq('id', ctx.id).maybeSingle()
    return data?.project_id ?? null
  }

  return null
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function isDevSurface(ctx: TagroExecuteContext): boolean {
  if (ctx.surface === 'dev') return true
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/dev')) return true
  return false
}

const BLOCKER_HINT = /blocker|blockiert|warte auf|stuck|festgefahren/i

/** Dev execution layer — prefer Tagro-orchestrated API calls over clipboard. */
async function tryDevExecution(
  action: TagroSuggestedAction,
  preview: string,
  ctx: TagroExecuteContext,
  projectId: string | null,
): Promise<TagroExecuteResult | null> {
  if (!isDevSurface(ctx)) return null

  const taskId = ctx.contextType === 'task' ? ctx.id : undefined

  if (taskId && action === 'review') {
    const res = await fetch('/api/dev/tasks/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, mode: 'dev_finish', message: data?.error || 'Review konnte nicht gesendet werden.' }
    }
    return {
      ok: true,
      mode: 'dev_finish',
      message: 'Arbeit zur Prüfung übergeben — Tagro verifiziert im Hintergrund.',
      created: [{ type: 'task', id: taskId, title: ctx.title || 'Task' }],
    }
  }

  if (taskId && (action === 'message' || action === 'note') && BLOCKER_HINT.test(preview)) {
    const res = await fetch('/api/dev/tasks/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        devStatus: 'blocked',
        blockerDescription: preview.slice(0, 2000),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, mode: 'dev_status', message: data?.error || 'Blocker konnte nicht gemeldet werden.' }
    }
    return {
      ok: true,
      mode: 'dev_status',
      message: 'Blocker gemeldet — Owner und Client werden informiert.',
      created: [{ type: 'task', id: taskId, title: ctx.title || 'Task' }],
    }
  }

  if (
    projectId
    && (ctx.contextType === 'dev_item' || ctx.contextType === 'project')
    && (action === 'message' || action === 'handoff' || action === 'note')
  ) {
    const res = await fetch('/api/dev/daily-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, text: preview }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data?.ok) {
      return {
        ok: true,
        mode: 'dev_update',
        message: data?.skipped
          ? 'Update übersprungen.'
          : 'Status-Update an Lead gesendet — Tagro übersetzt für den Client.',
      }
    }
  }

  if ((ctx.contextType === 'dev_item' || ctx.contextType === 'task') && action === 'decision' && projectId) {
    const res = await fetch('/api/decisions/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        task_id: taskId,
        question: preview,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data?.error) {
      return { ok: false, mode: 'decision', message: 'Entscheidung konnte nicht angefordert werden.' }
    }
    const outcome = data?.outcome
    const decision = outcome?.status === 'created'
      ? outcome.result?.decision
      : outcome?.status === 'refreshed'
        ? outcome.existing
        : null
    if (!decision) {
      return {
        ok: false,
        mode: 'decision',
        message: outcome?.status === 'skipped'
          ? 'Tagro hat keine neue Entscheidung angelegt.'
          : 'Entscheidung konnte nicht angefordert werden.',
      }
    }
    return {
      ok: true,
      mode: 'decision',
      message: `Lead-Entscheidung „${decision.client_title || decision.title || 'Neu'}" vorbereitet.`,
      created: [{ type: 'decision', id: decision.id, title: decision.client_title || decision.title || 'Entscheidung' }],
    }
  }

  return null
}

export async function executeTagroPreview(input: TagroExecuteInput): Promise<TagroExecuteResult> {
  const preview = (input.preview || '').trim()
  if (!preview) {
    return { ok: false, mode: 'noop', message: 'Kein Entwurf zum Übernehmen.' }
  }

  const action = (input.suggestedAction || 'note') as TagroSuggestedAction
  const ctx = input.ctx
  const projectId = await resolveProjectId(ctx)

  const devResult = await tryDevExecution(action, preview, ctx, projectId)
  if (devResult) return devResult

  if (action === 'task') {
    if (!projectId) {
      const copied = await copyToClipboard(preview)
      return {
        ok: copied,
        mode: 'clipboard',
        message: copied
          ? 'Kein Projekt gefunden — Entwurf in die Zwischenablage kopiert.'
          : 'Kein Projekt gefunden. Bitte Entwurf manuell kopieren.',
      }
    }
    const res = await fetch('/api/tagro/task-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        title: ctx.title || preview.split(/\s+/).slice(0, 9).join(' '),
        description: preview,
        confirmCreate: true,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.ok || !data?.task) {
      return { ok: false, mode: 'task', message: 'Die Aufgabe konnte gerade nicht angelegt werden.' }
    }
    return {
      ok: true,
      mode: 'task',
      message: `Aufgabe „${data.task.title || 'Neu'}" angelegt.`,
      created: [{ type: 'task', id: data.task.id, title: data.task.title || 'Aufgabe' }],
    }
  }

  if (action === 'decision') {
    if (!projectId) {
      const copied = await copyToClipboard(preview)
      return {
        ok: copied,
        mode: 'clipboard',
        message: copied
          ? 'Kein Projekt gefunden — Entwurf in die Zwischenablage kopiert.'
          : 'Kein Projekt gefunden. Bitte Entwurf manuell kopieren.',
      }
    }
    const taskId = ctx.contextType === 'task' ? ctx.id : undefined
    const res = await fetch('/api/decisions/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        task_id: taskId,
        question: preview,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data?.error) {
      return { ok: false, mode: 'decision', message: 'Die Entscheidung konnte gerade nicht angelegt werden.' }
    }
    const outcome = data?.outcome
    const decision = outcome?.status === 'created'
      ? outcome.result?.decision
      : outcome?.status === 'refreshed'
        ? outcome.existing
        : null
    if (!decision) {
      return {
        ok: false,
        mode: 'decision',
        message: outcome?.status === 'skipped'
          ? 'Tagro hat keine neue Entscheidung angelegt (Limit oder Duplikat).'
          : 'Die Entscheidung konnte gerade nicht angelegt werden.',
      }
    }
    return {
      ok: true,
      mode: 'decision',
      message: decision.client_title || decision.title
        ? `Entscheidung „${decision.client_title || decision.title}" vorbereitet.`
        : 'Entscheidung wurde vorbereitet.',
      created: [{ type: 'decision', id: decision.id, title: decision.client_title || decision.title || 'Entscheidung' }],
    }
  }

  if (
    action === 'handoff'
    || (action === 'review' && (ctx.contextType === 'status_report' || ctx.contextType === 'report'))
    || ((ctx.contextType === 'status_report' || ctx.contextType === 'report') && action !== 'message' && action !== 'note')
  ) {
    if (!projectId) {
      const copied = await copyToClipboard(preview)
      return {
        ok: copied,
        mode: 'clipboard',
        message: copied ? 'Entwurf kopiert.' : 'Entwurf konnte nicht kopiert werden.',
      }
    }
    const res = await fetch('/api/tagro/status-report-action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        statusReportId: ctx.contextType === 'status_report' || ctx.contextType === 'report' ? ctx.id : undefined,
        content: preview,
        autoProcess: true,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.ok) {
      return { ok: false, mode: 'status_report', message: 'Aufgaben konnten gerade nicht abgeleitet werden.' }
    }
    const created = Array.isArray(data.created) ? data.created : []
    return {
      ok: true,
      mode: 'status_report',
      message: created.length
        ? `${created.length} Eintrag${created.length === 1 ? '' : 'e'} übernommen.`
        : 'Tagro hat den Bericht verarbeitet.',
      created,
    }
  }

  if (action === 'note' || action === 'message') {
    if (projectId) {
      const res = await fetch('/api/notes/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: preview, project_id: projectId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.note?.id) {
        return {
          ok: true,
          mode: 'clipboard',
          message: `Notiz „${data.note.title || 'Neu'}" gespeichert.`,
          created: [{ type: 'note', id: data.note.id, title: data.note.title || 'Notiz' }],
        }
      }
    }
    const copied = await copyToClipboard(preview)
    return {
      ok: copied,
      mode: 'clipboard',
      message: copied ? 'Entwurf in die Zwischenablage kopiert.' : 'Entwurf konnte nicht kopiert werden.',
    }
  }

  const copied = await copyToClipboard(preview)
  return {
    ok: copied,
    mode: 'clipboard',
    message: copied ? 'Entwurf in die Zwischenablage kopiert.' : 'Entwurf konnte nicht kopiert werden.',
  }
}
