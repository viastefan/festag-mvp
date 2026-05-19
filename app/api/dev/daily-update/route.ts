import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

/**
 * POST /api/dev/daily-update
 *
 * Body: { promptId?: string, projectId?: string, text: string, skip?: boolean }
 *
 * Persists the developer's daily status:
 *   • marks the matching `dev_daily_prompts` row as submitted / skipped
 *   • inserts a `developer_updates` row (the raw text — internal only)
 *   • generates a calm, client-safe `status_reports` row so the client
 *     can see the same translated copy. (Heuristic translation now;
 *     Tagro LLM rewrite is plugged in later via the existing
 *     /api/tagro/* infrastructure.)
 *   • emits a 'work_log' event through the sync bus — owner + relevant
 *     parties get the inbox entry.
 */
export const runtime = 'nodejs'

function todayBerlin(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())
}

function translateForClient(devText: string, projectTitle: string | null): string {
  const clean = devText.trim()
  // Keep simple: strip dev jargon-y leading verbs, lower the temperature.
  const trimmed = clean.replace(/^(heute|today|today's)\s*[:\-,]?\s*/i, '')
  const intro = projectTitle ? `Update zu ${projectTitle}: ` : 'Heutiger Stand: '
  // Cap length so we don't accidentally surface long internal notes.
  const sentence = trimmed.length > 280 ? trimmed.slice(0, 277) + '…' : trimmed
  return `${intro}${sentence}`
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const promptId  = body?.promptId ? String(body.promptId) : null
    const projectId = body?.projectId ? String(body.projectId) : null
    const skip      = !!body?.skip
    const text      = String(body?.text || '').trim()

    if (!skip && !text) return NextResponse.json({ error: 'text_required' }, { status: 400 })

    // Locate the prompt — either by id (preferred) or by (user + project + today).
    let prompt: any = null
    if (promptId) {
      const { data } = await supabase.from('dev_daily_prompts').select('*').eq('id', promptId).maybeSingle()
      prompt = data
    } else if (projectId) {
      const date = todayBerlin()
      const { data } = await supabase.from('dev_daily_prompts')
        .select('*').eq('developer_id', user.id).eq('project_id', projectId).eq('prompt_date', date).maybeSingle()
      prompt = data
    }
    if (prompt && (prompt as any).developer_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Handle skip first — short-circuit.
    if (skip) {
      if (prompt) {
        await supabase.from('dev_daily_prompts').update({
          state: 'skipped',
          submitted_at: new Date().toISOString(),
        }).eq('id', (prompt as any).id)
      }
      return NextResponse.json({ ok: true, skipped: true })
    }

    const effectiveProjectId: string | null = (prompt as any)?.project_id ?? projectId ?? null

    // 1) Internal dev update
    const { data: devUpdate, error: duErr } = await supabase.from('developer_updates').insert({
      developer_id: user.id,
      project_id: effectiveProjectId,
      update_text: text,
      status: 'in_progress',
      blocker: /blocker|warte|blockiert|stuck/i.test(text),
    }).select('*').single()
    if (duErr) return NextResponse.json({ error: duErr.message, stage: 'dev_update' }, { status: 400 })

    // 2) Client-safe status_report row.
    // Generated through the service role so RLS doesn't block the client
    // from seeing it via the project policy.
    let projectTitle: string | null = null
    let clientReportId: string | null = null
    if (effectiveProjectId) {
      const { data: projectRow } = await supabase.from('projects')
        .select('id,title').eq('id', effectiveProjectId).maybeSingle()
      projectTitle = (projectRow as any)?.title ?? null

      const sb = getServiceClient() ?? supabase
      const summary = translateForClient(text, projectTitle)
      const { data: reportRow } = await sb.from('status_reports').insert({
        project_id: effectiveProjectId,
        created_by: user.id,
        generated_by: 'tagro',
        audience: 'client',
        title: projectTitle ? `${projectTitle} · Tagesstand` : 'Tagesstand',
        content: summary,
        summary,
        completed_work_json: [],
        current_work_json: [text.slice(0, 400)],
        next_steps_json: [],
        blockers_json: /blocker|blockiert/i.test(text) ? [text.slice(0, 200)] : [],
        risks_json: [],
        client_actions_json: [],
        dev_followups_json: [],
        decisions_needed_json: [],
        action_items_json: [],
        visible_to_client: true,
        generated_on: todayBerlin(),
      }).select('id').maybeSingle()
      clientReportId = (reportRow as any)?.id ?? null
    }

    // 3) Mark the prompt submitted.
    if (prompt) {
      await supabase.from('dev_daily_prompts').update({
        state: 'submitted',
        submitted_at: new Date().toISOString(),
        related_update_id: (devUpdate as any).id,
      }).eq('id', (prompt as any).id)
    }

    // 4) Notify the client directly (no task to anchor the activity log
    //    to, so we use notifications + messages instead of the bus).
    if (effectiveProjectId) {
      const sb = getServiceClient() ?? supabase
      const { data: projectMeta } = await sb.from('projects')
        .select('user_id, client_id').eq('id', effectiveProjectId).maybeSingle()
      const clientId = (projectMeta as any)?.client_id ?? (projectMeta as any)?.user_id
      if (clientId && clientId !== user.id) {
        await sb.from('notifications').insert({
          user_id: clientId,
          project_id: effectiveProjectId,
          audience: 'client',
          kind: 'tagro_daily_status',
          type: 'tagro_daily_status',
          title: projectTitle ? `${projectTitle} · neuer Stand` : 'Neuer Tagesstand',
          body: 'Tagro hat den heutigen Stand übersetzt — kannst du im Workspace einsehen.',
          message: 'Tagro hat den heutigen Stand übersetzt — kannst du im Workspace einsehen.',
          link: `/reports?project=${effectiveProjectId}`,
          payload: { source: 'daily_update', statusReportId: clientReportId },
          read: false,
        }).then(() => null, () => null)
      }
    }

    return NextResponse.json({
      ok: true,
      devUpdateId: (devUpdate as any).id,
      statusReportId: clientReportId,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
