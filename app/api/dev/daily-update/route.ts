import { NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { translateDevUpdate } from '@/lib/tagro/translate-update'
import { createInboxItem } from '@/lib/inbox/create-item'

/**
 * POST /api/dev/daily-update
 *
 * Body: { promptId?: string, projectId?: string, text: string, skip?: boolean }
 *
 * Persists the developer's daily status:
 *   • marks the matching `dev_daily_prompts` row as submitted / skipped
 *   • inserts a `developer_updates` row (the raw text — internal only)
 *   • runs the raw note through Tagro's LLM translation
 *     (lib/tagro/translate-update → OpenAI, heuristic fallback when no key)
 *   • writes a calm, client-safe `status_reports` row
 *   • notifies the client's project owner
 */
export const runtime = 'nodejs'

function todayBerlin(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user: cookieUser } } = await supabase.auth.getUser()
    // PIN-Dev fallback: kein Supabase-Cookie, aber signierter Dev-Token.
    const user = cookieUser ?? getDevUserFromRequest(req)
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

    // 2) Tagro translates the raw note → calm, client-safe status_report.
    // Written through the service role so RLS doesn't block the client
    // from seeing it via the project policy.
    let projectTitle: string | null = null
    let clientReportId: string | null = null
    let clientSummary = ''
    if (effectiveProjectId) {
      const { data: projectRow } = await supabase.from('projects')
        .select('id,title').eq('id', effectiveProjectId).maybeSingle()
      projectTitle = (projectRow as any)?.title ?? null

      // Recent context for continuity (last 3 dev updates on this project).
      const { data: recent } = await supabase.from('developer_updates')
        .select('update_text').eq('project_id', effectiveProjectId)
        .neq('id', (devUpdate as any).id)
        .order('created_at', { ascending: false }).limit(3)
      const recentContext = ((recent as any[]) ?? []).map(r => String(r.update_text)).filter(Boolean)

      const translated = await translateDevUpdate({ devText: text, projectTitle, recentContext })
      clientSummary = translated.clientSummary

      const sb = getServiceClient() ?? supabase
      const { data: reportRow } = await sb.from('status_reports').insert({
        project_id: effectiveProjectId,
        created_by: user.id,
        generated_by: 'tagro',
        audience: 'client',
        title: projectTitle ? `${projectTitle} · Tagesstand` : 'Tagesstand',
        content: translated.clientSummary,
        summary: translated.clientSummary,
        completed_work_json: [],
        current_work_json: translated.currentWork,
        next_steps_json: translated.nextSteps,
        blockers_json: translated.blockers,
        risks_json: [],
        client_actions_json: [],
        dev_followups_json: [],
        decisions_needed_json: [],
        action_items_json: [],
        visible_to_client: true,
        generated_on: todayBerlin(),
      }).select('id').maybeSingle()
      clientReportId = (reportRow as any)?.id ?? null

      // Audit the Tagro run so the translation has a trace.
      await sb.from('tagro_runs').insert({
        project_id: effectiveProjectId,
        run_type: 'status_translation',
        input_json: { dev_text: text },
        output_json: { client_summary: translated.clientSummary, confidence: translated.confidence },
        model: translated.model,
        status: 'completed',
      }).then(() => null, () => null)
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

        // Live dev → client connection: the translated update also lands
        // in the client's structured inbox as a project status entry.
        if (clientReportId) {
          await createInboxItem(sb, {
            userId: clientId,
            projectId: effectiveProjectId,
            category: 'client',
            type: 'status_update',
            title: projectTitle ? `${projectTitle} · neuer Stand` : 'Neuer Tagesstand',
            body: clientSummary || 'Es gibt einen neuen Projektstand.',
            actorId: user.id,
            sourceTable: 'status_reports',
            sourceId: clientReportId,
            metadata: { source_label: 'Tagro', thread_title: projectTitle ?? 'Projekt', link: `/reports?project=${effectiveProjectId}` },
          })
        }
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
