import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
    const sb = service as any

    const { data: profile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.role !== 'admin') {
      const { data: payment } = await sb
        .from('payments')
        .select('project_id')
        .eq('id', paymentId)
        .maybeSingle()
      if (payment?.project_id) {
        const { data: project } = await sb
          .from('projects')
          .select('user_id,workspace_id')
          .eq('id', payment.project_id)
          .maybeSingle()
        if (!project || project.user_id !== user.id) {
          return NextResponse.json({ error: 'admin_or_owner_only' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: 'admin_or_owner_only' }, { status: 403 })
      }
    }

    const { data: payment } = await sb
      .from('payments')
      .select('id,milestone_id,project_id,status,amount')
      .eq('id', paymentId)
      .maybeSingle()
    if (!payment) return NextResponse.json({ error: 'payment_not_found' }, { status: 404 })
    if (payment.status === 'paid') return NextResponse.json({ error: 'already_paid' }, { status: 400 })

    await sb
      .from('payments')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', paymentId)

    if (payment.milestone_id) {
      await sb
        .from('milestones')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_amount: payment.amount,
        })
        .eq('id', payment.milestone_id)
    }

    const { data: project } = await sb
      .from('projects')
      .select('id,title,assigned_dev,user_id,client_id')
      .eq('id', payment.project_id)
      .maybeSingle()

    if (project?.assigned_dev) {
      await sb.from('notifications').insert({
        user_id: project.assigned_dev,
        project_id: project.id,
        audience: 'dev',
        kind: 'milestone_paid',
        type: 'milestone_paid',
        title: 'Milestone bezahlt',
        body: `Ein Milestone in „${project.title}" wurde als bezahlt markiert.`,
        message: 'Milestone-Zahlung bestätigt.',
        read: false,
        payload: { milestone_id: payment.milestone_id, amount: payment.amount },
      })
    }

    const clientId = project?.client_id || project?.user_id
    if (clientId) {
      await sb.from('notifications').insert({
        user_id: clientId,
        project_id: project.id,
        audience: 'client',
        kind: 'payment_confirmed',
        type: 'payment_confirmed',
        title: 'Zahlung bestätigt',
        body: `Die Zahlung für „${project.title}" wurde bestätigt.`,
        message: 'Zahlung bestätigt.',
        read: false,
        payload: { milestone_id: payment.milestone_id, amount: payment.amount },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'mark_paid_failed' }, { status: 500 })
  }
}
