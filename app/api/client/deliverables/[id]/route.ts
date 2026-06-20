import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { emitDevActionToClient } from '@/lib/client/connection-bridge'

export const runtime = 'nodejs'

type ActionBody =
  | { action: 'approve' }
  | { action: 'reject'; reason?: string }
  | { action: 'request_changes'; feedback: string }

/**
 * PATCH /api/client/deliverables/:id
 * Client approval actions on project_assets deliverables.
 */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: ActionBody
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  const assetId = ctx.params.id

  const { data: asset } = await supa
    .from('project_assets')
    .select('id,title,project_id,status,analysis_result,projects(client_id,title,work_type)')
    .eq('id', assetId)
    .maybeSingle()

  if (!asset) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const project = (asset as any).projects
  const isClient = project?.client_id === user.id
  const { data: prof } = await supa.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isOwner = ['admin', 'project_owner'].includes((prof as any)?.role ?? '')
  if (!isClient && !isOwner) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const now = new Date().toISOString()
  const title = (asset as any).title || 'Deliverable'

  if (body.action === 'approve') {
    await supa.from('project_assets').update({ status: 'approved', updated_at: now }).eq('id', assetId)

    await emitDevActionToClient(supa as any, {
      projectId: (asset as any).project_id,
      type: 'approval_received',
      content: `Deliverable freigegeben: ${title}`,
      source: 'client_approval',
      visibility: 'client',
      createdBy: user.id,
      clientTranslation: `${title} wurde freigegeben. Das Team setzt die nächsten Schritte um.`,
      inboxTitle: `${project?.title ?? 'Projekt'} · Freigabe`,
      workType: project?.work_type ?? null,
    })

    await supa.from('audit_logs').insert({
      actor_id: user.id,
      action: 'deliverable_approved',
      entity_type: 'project_asset',
      entity_id: assetId,
      metadata: { title },
    }).then(() => null, () => null)

    return NextResponse.json({ ok: true, status: 'approved' })
  }

  if (body.action === 'reject') {
    const reason = (body.reason || '').trim().slice(0, 600)
    await supa.from('project_assets').update({
      status: 'uploaded',
      metadata: { client_rejection: reason, rejected_at: now },
      updated_at: now,
    }).eq('id', assetId)

    await emitDevActionToClient(supa as any, {
      projectId: (asset as any).project_id,
      type: 'approval_requested',
      content: `Deliverable abgelehnt: ${title}${reason ? ` — ${reason}` : ''}`,
      source: 'client_approval',
      visibility: 'team',
      createdBy: user.id,
      notifyClient: false,
      workType: project?.work_type ?? null,
    })

    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  if (body.action === 'request_changes') {
    const feedback = (body.feedback || '').trim().slice(0, 800)
    if (!feedback) return NextResponse.json({ error: 'feedback_required' }, { status: 400 })

    await supa.from('project_assets').update({
      metadata: { client_feedback: feedback, feedback_at: now },
      updated_at: now,
    }).eq('id', assetId)

    await emitDevActionToClient(supa as any, {
      projectId: (asset as any).project_id,
      type: 'comment_added',
      content: `Änderungswunsch zu ${title}: ${feedback}`,
      source: 'client_approval',
      visibility: 'team',
      createdBy: user.id,
      notifyClient: false,
      workType: project?.work_type ?? null,
    })

    return NextResponse.json({ ok: true, status: 'changes_requested' })
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
}
