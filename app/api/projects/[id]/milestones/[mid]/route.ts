import { NextRequest, NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  try {
    const { id: projectId, mid: milestoneId } = await params
    const supa = createClient()
    const { data: { user: cookieUser } } = await supa.auth.getUser()
    const user = cookieUser ?? getDevUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
    const sb = service as any

    const { data: milestone } = await sb
      .from('milestones')
      .select('id,project_id,confirmed_by_client_at')
      .eq('id', milestoneId)
      .eq('project_id', projectId)
      .maybeSingle()
    if (!milestone) return NextResponse.json({ error: 'milestone_not_found' }, { status: 404 })
    if (milestone.confirmed_by_client_at) {
      return NextResponse.json({ error: 'already_confirmed_by_client' }, { status: 400 })
    }

    const { data: project } = await sb
      .from('projects')
      .select('user_id,client_id,assigned_dev')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

    const isDevOrClient =
      user.id === project.assigned_dev ||
      user.id === project.user_id ||
      user.id === project.client_id
    if (!isDevOrClient) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const allowedFields: Record<string, unknown> = {}
    if (body.title !== undefined) allowedFields.title = String(body.title).trim()
    if (body.description !== undefined) allowedFields.description = String(body.description).trim()
    if (body.amount !== undefined) allowedFields.amount = Number(body.amount)
    if (body.percentage !== undefined) allowedFields.percentage = Number(body.percentage)
    if (body.order_index !== undefined) allowedFields.order_index = Number(body.order_index)

    if (!Object.keys(allowedFields).length) {
      return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 })
    }

    const { data: updated, error: upErr } = await sb
      .from('milestones')
      .update(allowedFields)
      .eq('id', milestoneId)
      .select('id,title,description,amount,percentage,order_index,status')
      .single()

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, milestone: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'milestone_update_failed' }, { status: 500 })
  }
}
