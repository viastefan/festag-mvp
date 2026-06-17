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
}

export type TagroExecuteInput = {
  preview: string
  suggestedAction?: string
  ctx: TagroExecuteContext
}

export type TagroExecuteResult = {
  ok: boolean
  mode: 'task' | 'decision' | 'status_report' | 'clipboard' | 'noop'
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

export async function executeTagroPreview(input: TagroExecuteInput): Promise<TagroExecuteResult> {
  const preview = (input.preview || '').trim()
  if (!preview) {
    return { ok: false, mode: 'noop', message: 'Kein Entwurf zum Übernehmen.' }
  }

  const action = (input.suggestedAction || 'note') as TagroSuggestedAction
  const ctx = input.ctx
  const projectId = await resolveProjectId(ctx)

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
