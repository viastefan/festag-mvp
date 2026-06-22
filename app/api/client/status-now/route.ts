import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import {
  generateOverallStatusDigest,
  generateProjectStatusDigest,
  logTagroStatusRun,
} from '@/lib/tagro/generate-status-digest'

/**
 * GET  /api/client/status-now?projectId=…&scope=overall
 * POST /api/client/status-now { projectId?, scope?: 'overall' | 'project' }
 *
 * POST runs Tagro (Claude → Gemini → heuristic) with full project context:
 * tasks, decisions, members, prior reports, dev updates, activity signals.
 */
export const runtime = 'nodejs'

const REFRESH_COOLDOWN_MS = 60_000

function todayBerlin(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())
}

function pickLeadProject(list: any[]) {
  const prio: Record<string, number> = { active: 0, testing: 1, planning: 2, intake: 3, done: 4 }
  return [...list].sort((a, b) => (prio[a.status] ?? 9) - (prio[b.status] ?? 9))[0] ?? null
}

async function listProjects(supabase: any) {
  const { data: list } = await supabase
    .from('projects')
    .select('id,title,user_id,client_id,status,created_at')
    .order('created_at', { ascending: false })
  return (list ?? []) as any[]
}

async function resolveScope(supabase: any, projectId: string | null) {
  if (projectId) {
    const { data } = await supabase.from('projects').select('id,title,user_id,client_id,status').eq('id', projectId).maybeSingle()
    return data
  }
  const list = await listProjects(supabase)
  return pickLeadProject(list)
}

async function latestOverallReport(supabase: any, userId: string) {
  const { data: lastQuery } = await supabase
    .from('client_status_queries')
    .select('status_report_id, created_at')
    .eq('user_id', userId)
    .eq('scope', 'overall')
    .not('status_report_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!(lastQuery as any)?.status_report_id) return null

  const { data: report } = await supabase
    .from('status_reports')
    .select('id, title, summary, content, blockers_json, current_work_json, next_steps_json, risks_json, decisions_needed_json, visible_to_client, created_at, generated_on')
    .eq('id', (lastQuery as any).status_report_id)
    .eq('visible_to_client', true)
    .maybeSingle()

  return report ?? null
}

const REPORT_SELECT = 'id, title, summary, content, blockers_json, current_work_json, next_steps_json, risks_json, decisions_needed_json, visible_to_client, created_at, generated_on'

export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const url = new URL(req.url)
    const scope = url.searchParams.get('scope') === 'overall' ? 'overall' : 'project'
    const projectId = url.searchParams.get('projectId')

    if (scope === 'overall') {
      const projects = await listProjects(supabase)
      const lead = pickLeadProject(projects)
      const report = await latestOverallReport(supabase, user.id)
      if (lead) {
        await supabase.from('client_status_queries').insert({
          user_id: user.id,
          project_id: lead.id,
          scope: 'overall',
          source: 'client_portal',
          status_report_id: (report as any)?.id ?? null,
          generated_fresh: false,
        }).then(() => null, () => null)
      }
      return NextResponse.json({
        ok: true,
        scope: 'overall',
        project: lead,
        projects,
        report: report ?? null,
        generatedFresh: false,
      })
    }

    const project = await resolveScope(supabase, projectId)
    if (!project) return NextResponse.json({ ok: true, scope: 'project', report: null, project: null })

    const { data: latest } = await supabase
      .from('status_reports')
      .select(REPORT_SELECT)
      .eq('project_id', project.id)
      .eq('visible_to_client', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    await supabase.from('client_status_queries').insert({
      user_id: user.id,
      project_id: project.id,
      scope: 'project',
      source: 'client_portal',
      status_report_id: (latest as any)?.id ?? null,
      generated_fresh: false,
    }).then(() => null, () => null)

    return NextResponse.json({ ok: true, scope: 'project', project, report: latest ?? null, generatedFresh: false })
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
    const scope = body?.scope === 'overall' ? 'overall' : 'project'
    const projectId = body?.projectId ? String(body.projectId) : null
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

    if (scope === 'overall') {
      const projects = await listProjects(supabase)
      const lead = pickLeadProject(projects)
      if (!lead) return NextResponse.json({ error: 'no_project' }, { status: 404 })

      const { data: lastFresh } = await supabase
        .from('client_status_queries')
        .select('created_at, status_report_id, generated_fresh')
        .eq('user_id', user.id)
        .eq('scope', 'overall')
        .eq('generated_fresh', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()

      if (lastFresh && Date.now() - new Date((lastFresh as any).created_at).getTime() < REFRESH_COOLDOWN_MS) {
        const { data: cached } = await supabase
          .from('status_reports')
          .select(REPORT_SELECT)
          .eq('id', (lastFresh as any).status_report_id)
          .maybeSingle()
        return NextResponse.json({
          ok: true,
          scope: 'overall',
          project: lead,
          projects,
          report: cached ?? null,
          generatedFresh: false,
          cooldown: true,
        })
      }

      const digest = await generateOverallStatusDigest(supabase, projects, { since })
      const summary = digest.clientSummary
      const fields = digest.reportFields

      const sb = getServiceClient() ?? supabase
      const { data: report } = await sb.from('status_reports').insert({
        project_id: lead.id,
        created_by: user.id,
        generated_by: 'tagro',
        audience: 'client',
        title: 'Gesamtbericht, Statusabfrage',
        content: summary,
        summary,
        completed_work_json: fields.completed_work_json,
        current_work_json: fields.current_work_json,
        next_steps_json: fields.next_steps_json,
        blockers_json: fields.blockers_json,
        risks_json: fields.risks_json,
        client_actions_json: fields.client_actions_json,
        dev_followups_json: fields.dev_followups_json,
        decisions_needed_json: fields.decisions_needed_json,
        action_items_json: fields.action_items_json,
        visible_to_client: true,
        generated_on: todayBerlin(),
      }).select(REPORT_SELECT).maybeSingle()

      await logTagroStatusRun(sb, {
        projectId: lead.id,
        runType: 'status_report_overall',
        inputJson: { scope: 'overall', projectCount: projects.length, since },
        outputJson: { summary, confidence: digest.confidence, model: digest.model },
        model: digest.model,
      })

      await supabase.from('client_status_queries').insert({
        user_id: user.id,
        project_id: lead.id,
        scope: 'overall',
        source: 'client_portal',
        status_report_id: (report as any)?.id ?? null,
        generated_fresh: true,
      }).then(() => null, () => null)

      return NextResponse.json({
        ok: true,
        scope: 'overall',
        project: lead,
        projects,
        report,
        generatedFresh: true,
        model: digest.model,
        confidence: digest.confidence,
      })
    }

    const project = await resolveScope(supabase, projectId)
    if (!project) return NextResponse.json({ error: 'no_project' }, { status: 404 })

    const { data: lastFresh } = await supabase
      .from('client_status_queries')
      .select('created_at, status_report_id, generated_fresh')
      .eq('user_id', user.id)
      .eq('project_id', project.id)
      .eq('scope', 'project')
      .eq('generated_fresh', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (lastFresh && Date.now() - new Date((lastFresh as any).created_at).getTime() < REFRESH_COOLDOWN_MS) {
      const { data: cached } = await supabase
        .from('status_reports')
        .select(REPORT_SELECT)
        .eq('id', (lastFresh as any).status_report_id)
        .maybeSingle()
      return NextResponse.json({ ok: true, scope: 'project', project, report: cached ?? null, generatedFresh: false, cooldown: true })
    }

    const projectTitle = (project as any).title || 'das Projekt'
    const digest = await generateProjectStatusDigest(supabase, project.id, { since, projectTitle })
    const summary = digest.clientSummary
    const fields = digest.reportFields

    const sb = getServiceClient() ?? supabase
    const { data: report } = await sb.from('status_reports').insert({
      project_id: project.id,
      created_by: user.id,
      generated_by: 'tagro',
      audience: 'client',
      title: `${projectTitle}, Statusabfrage`,
      content: summary,
      summary,
      completed_work_json: fields.completed_work_json,
      current_work_json: fields.current_work_json,
      next_steps_json: fields.next_steps_json,
      blockers_json: fields.blockers_json,
      risks_json: fields.risks_json,
      client_actions_json: fields.client_actions_json,
      dev_followups_json: fields.dev_followups_json,
      decisions_needed_json: fields.decisions_needed_json,
      action_items_json: fields.action_items_json,
      visible_to_client: true,
      generated_on: todayBerlin(),
    }).select(REPORT_SELECT).maybeSingle()

    await logTagroStatusRun(sb, {
      projectId: project.id,
      runType: 'status_report',
      inputJson: { scope: 'project', since },
      outputJson: { summary, confidence: digest.confidence, model: digest.model },
      model: digest.model,
    })

    await supabase.from('client_status_queries').insert({
      user_id: user.id,
      project_id: project.id,
      scope: 'project',
      source: 'client_portal',
      status_report_id: (report as any)?.id ?? null,
      generated_fresh: true,
    }).then(() => null, () => null)

    return NextResponse.json({
      ok: true,
      scope: 'project',
      project,
      report,
      generatedFresh: true,
      model: digest.model,
      confidence: digest.confidence,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'server_error' }, { status: 500 })
  }
}
