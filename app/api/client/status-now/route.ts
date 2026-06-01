import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { translateStatusDigest } from '@/lib/tagro/translate-update'

/**
 * GET  /api/client/status-now?projectId=…   → fetch the latest client-safe status
 * POST /api/client/status-now { projectId? } → force-generate a fresh one from today's
 *                                              dev_updates + tagro_verifications
 *
 * The client uses this when they hit "Status jetzt abrufen" on the
 * dashboard. We log every call into client_status_queries so we can
 * show "Stand vom 16:42" and gate accidental hammering.
 *
 * Cooldown: 60 seconds between fresh generations per user+project.
 */
export const runtime = 'nodejs'

const REFRESH_COOLDOWN_MS = 60_000

function todayBerlin(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())
}

function clamp(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + '…' : s }

async function resolveScope(supabase: any, user: any, projectId: string | null) {
  // For now: if projectId is given, scope to that. Otherwise pick the user's most-active project.
  if (projectId) {
    const { data } = await supabase.from('projects').select('id,title,user_id,client_id').eq('id', projectId).maybeSingle()
    return data
  }
  const { data: list } = await supabase.from('projects').select('id,title,user_id,client_id,status,created_at').order('created_at', { ascending: false }).limit(5)
  const prio: Record<string, number> = { active: 0, testing: 1, planning: 2, intake: 3, done: 4 }
  const sorted = (list ?? []).sort((a: any, b: any) => (prio[a.status] ?? 9) - (prio[b.status] ?? 9))
  return sorted[0] ?? null
}

export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const url = new URL(req.url)
    const projectId = url.searchParams.get('projectId')
    const project = await resolveScope(supabase, user, projectId)
    if (!project) return NextResponse.json({ ok: true, report: null, project: null })

    const { data: latest } = await supabase
      .from('status_reports')
      .select('id, title, summary, content, blockers_json, current_work_json, next_steps_json, visible_to_client, created_at, generated_on')
      .eq('project_id', project.id)
      .eq('visible_to_client', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    // Log a passive query (doesn't trigger fresh generation).
    await supabase.from('client_status_queries').insert({
      user_id: user.id,
      project_id: project.id,
      scope: projectId ? 'project' : 'overall',
      source: 'client_portal',
      status_report_id: (latest as any)?.id ?? null,
      generated_fresh: false,
    }).then(() => null, () => null)

    return NextResponse.json({ ok: true, project, report: latest ?? null, generatedFresh: false })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const projectId = body?.projectId ? String(body.projectId) : null
    const project = await resolveScope(supabase, user, projectId)
    if (!project) return NextResponse.json({ error: 'no_project' }, { status: 404 })

    // Cooldown check.
    const { data: lastFresh } = await supabase
      .from('client_status_queries')
      .select('created_at, status_report_id, generated_fresh')
      .eq('user_id', user.id)
      .eq('project_id', project.id)
      .eq('generated_fresh', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (lastFresh && Date.now() - new Date((lastFresh as any).created_at).getTime() < REFRESH_COOLDOWN_MS) {
      // Return the most recent report without re-generating.
      const { data: cached } = await supabase
        .from('status_reports')
        .select('id, title, summary, content, blockers_json, current_work_json, next_steps_json, visible_to_client, created_at, generated_on')
        .eq('id', (lastFresh as any).status_report_id)
        .maybeSingle()
      return NextResponse.json({ ok: true, project, report: cached ?? null, generatedFresh: false, cooldown: true })
    }

    // Gather recent dev_updates (today + last 24h).
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data: updates } = await supabase
      .from('developer_updates')
      .select('update_text, status, blocker, blocker_description, created_at, developer_id')
      .eq('project_id', project.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false }).limit(8)

    const rows = ((updates as any[]) ?? [])
    const projectTitle = (project as any).title || 'das Projekt'

    // Veyra digests the last 24h into one calm reading (LLM, heuristic fallback).
    const digest = await translateStatusDigest({
      projectTitle,
      updates: rows.map(r => ({
        text: clamp(String(r.update_text ?? ''), 400),
        blocker: !!r.blocker || /blockiert|blocker/i.test(String(r.update_text ?? '')),
      })),
    })
    const summary = digest.clientSummary

    // Write a fresh status_report via service role so RLS lets the client see it.
    const sb = getServiceClient() ?? supabase
    const { data: report } = await sb.from('status_reports').insert({
      project_id: project.id,
      created_by: user.id,
      generated_by: 'tagro',
      audience: 'client',
      title: `${projectTitle} · Statusabfrage`,
      content: summary,
      summary,
      completed_work_json: [],
      current_work_json: digest.currentWork,
      next_steps_json: digest.nextSteps,
      blockers_json: digest.blockers,
      risks_json: [],
      client_actions_json: [],
      dev_followups_json: [],
      decisions_needed_json: [],
      action_items_json: [],
      visible_to_client: true,
      generated_on: todayBerlin(),
    }).select('id, title, summary, content, blockers_json, current_work_json, next_steps_json, visible_to_client, created_at, generated_on').maybeSingle()

    await supabase.from('client_status_queries').insert({
      user_id: user.id,
      project_id: project.id,
      scope: projectId ? 'project' : 'overall',
      source: 'client_portal',
      status_report_id: (report as any)?.id ?? null,
      generated_fresh: true,
    }).then(() => null, () => null)

    return NextResponse.json({ ok: true, project, report, generatedFresh: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
