import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from '@/lib/supabase/server'
import { ensureProjectAccess, logAudit, saveTagroRun } from '@/lib/tagro/task-actions'
import { createTasksAndDecisionsFromActionItems, extractActionItemsFromStatusReport } from '@/lib/tagro/status-report-actions'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function serviceClient(fallback: any) {
  return SERVICE_KEY
    ? createServiceClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    : fallback
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const reportId = String(body.statusReportId || body.status_report_id || '').trim()
    let projectId = String(body.projectId || body.project_id || '').trim()
    let reportContent = String(body.content || body.reportContent || '').trim()

    const cookieClient = createCookieClient()
    const { data: { user } } = await cookieClient.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    const sb = serviceClient(cookieClient)

    if (reportId) {
      const { data: report, error } = await (sb as any).from('status_reports').select('*').eq('id', reportId).maybeSingle()
      if (error) throw error
      if (!report) return NextResponse.json({ ok: false, error: 'status_report_not_found' }, { status: 404 })
      projectId = projectId || report.project_id
      reportContent = reportContent || report.content || report.summary || ''
    }

    const providedActionItems = Array.isArray(body.actionItems)
      ? body.actionItems
      : Array.isArray(body.action_items)
        ? body.action_items
        : null

    if (!projectId) return NextResponse.json({ ok: false, error: 'project_id_required' }, { status: 400 })
    if (!reportContent && !providedActionItems?.length) {
      return NextResponse.json({ ok: false, error: 'report_content_required' }, { status: 400 })
    }

    await ensureProjectAccess(sb as any, projectId, user.id)
    let actionItems = providedActionItems || []

    if (!providedActionItems) {
      const result = await extractActionItemsFromStatusReport({ sb: sb as any, projectId, reportContent })
      actionItems = (result.output as any).action_items || []
      await saveTagroRun(sb as any, {
        projectId,
        runType: 'action_item_extraction',
        inputJson: { reportId, reportContent },
        outputJson: result.output as Record<string, unknown>,
        model: result.model,
        status: result.status,
        errorMessage: (result as any).error ?? null,
      })
    }

    let created: Array<{ type: string; id: string; title: string }> = []
    if (body.autoProcess || body.process) {
      created = await createTasksAndDecisionsFromActionItems({
        sb: sb as any,
        actorId: user.id,
        projectId,
        sourceReportId: reportId || null,
        actionItems,
      })
      await logAudit(sb as any, {
        actorId: user.id,
        action: 'tagro_extracted_action_items',
        entityType: 'status_report',
        entityId: reportId || null,
        metadata: { project_id: projectId, report_id: reportId || null, created },
      })
    }

    return NextResponse.json({ ok: true, action_items: actionItems, created })
  } catch (error: any) {
    const message = error?.message || 'status_report_action_items_failed'
    const status = message === 'project_access_denied' ? 403 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
