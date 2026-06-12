import { NextRequest, NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { proposeMilestones } from '@/lib/tagro/propose-milestones'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supa = createClient()
    const { data: { user: cookieUser } } = await supa.auth.getUser()
    const user = cookieUser ?? getDevUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
    const sb = service as any

    const { data: proposal } = await sb
      .from('project_proposals')
      .select('id,dev_id,status,dev_proposed_price')
      .eq('project_id', projectId)
      .eq('dev_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!proposal) return NextResponse.json({ error: 'no_accepted_proposal' }, { status: 400 })

    const { data: project } = await sb
      .from('projects')
      .select('id,title,budget_max,budget_currency,project_type,scope_summary,user_id,client_id')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

    const totalAmount = proposal.dev_proposed_price || project.budget_max || 0
    const currency = project.budget_currency || 'EUR'

    const milestoneTemplates = proposeMilestones({
      totalAmount,
      currency,
      projectType: project.project_type,
      scopeSummary: project.scope_summary,
    })

    const rows = milestoneTemplates.map((m, i) => ({
      project_id: projectId,
      title: m.title,
      template_key: m.template_key,
      percentage: m.percentage,
      amount: Math.round(totalAmount * m.percentage) / 100,
      currency,
      status: 'locked',
      order_index: i,
      confirmed_by_dev_at: new Date().toISOString(),
    }))

    const { data: existing } = await sb
      .from('milestones')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'milestones_already_exist' }, { status: 400 })
    }

    const { data: milestones, error: insErr } = await sb
      .from('milestones')
      .insert(rows)
      .select('id,title,template_key,percentage,amount,status,order_index')

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    const clientId = project.client_id || project.user_id
    if (clientId) {
      await sb.from('notifications').insert({
        user_id: clientId,
        project_id: projectId,
        audience: 'client',
        kind: 'milestones_proposed',
        type: 'milestones_proposed',
        title: 'Zahlungsplan vorgeschlagen',
        body: `Der Entwickler hat einen Zahlungsplan für „${project.title}" vorgeschlagen — bitte prüfen.`,
        message: 'Zahlungsplan-Vorschlag eingegangen.',
        read: false,
        payload: {
          milestone_count: milestones?.length,
          total_amount: totalAmount,
          currency,
        },
      })
    }

    return NextResponse.json({ ok: true, milestones })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'propose_milestones_failed' }, { status: 500 })
  }
}
