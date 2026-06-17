import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
    const sb = service as any

    const { data: project } = await sb
      .from('projects')
      .select('id,title,user_id,client_id,assigned_dev,budget_max,milestone_structure_confirmed')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

    const isClient = user.id === project.user_id || user.id === project.client_id
    if (!isClient) return NextResponse.json({ error: 'client_only' }, { status: 403 })

    if (project.milestone_structure_confirmed) {
      return NextResponse.json({ error: 'already_confirmed' }, { status: 400 })
    }

    const { data: milestones } = await sb
      .from('milestones')
      .select('id,amount,status')
      .eq('project_id', projectId)
    if (!milestones?.length) return NextResponse.json({ error: 'no_milestones' }, { status: 400 })

    const totalMilestoneAmount = milestones.reduce((s: number, m: any) => s + (Number(m.amount) || 0), 0)

    const { data: acceptedProposal } = await sb
      .from('project_proposals')
      .select('dev_proposed_price')
      .eq('project_id', projectId)
      .eq('status', 'accepted')
      .limit(1)
      .maybeSingle()

    const expectedTotal = acceptedProposal?.dev_proposed_price || project.budget_max || 0
    if (expectedTotal > 0 && Math.abs(totalMilestoneAmount - expectedTotal) > 0.01) {
      return NextResponse.json({
        error: 'amount_mismatch',
        detail: `Milestone-Summe (${totalMilestoneAmount}) ≠ Gesamtpreis (${expectedTotal})`,
      }, { status: 400 })
    }

    const now = new Date().toISOString()
    await sb
      .from('milestones')
      .update({ status: 'pending', confirmed_by_client_at: now })
      .eq('project_id', projectId)
      .in('status', ['locked'])

    await sb.from('projects').update({
      milestone_structure_confirmed: true,
      milestone_structure_confirmed_at: now,
      status: 'in_progress',
    }).eq('id', projectId)

    if (project.assigned_dev) {
      await sb.from('notifications').insert({
        user_id: project.assigned_dev,
        project_id: projectId,
        audience: 'dev',
        kind: 'project_kickoff_ready',
        type: 'project_kickoff_ready',
        title: 'Projekt ist startklar',
        body: `Der Client hat den Zahlungsplan für „${project.title}" bestätigt. Die Anzahlung wird den Start freischalten.`,
        message: 'Zahlungsplan bestätigt — Projekt startklar.',
        read: false,
        payload: { project_id: projectId },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'confirm_milestones_failed' }, { status: 500 })
  }
}
