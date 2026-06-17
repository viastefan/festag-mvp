import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { translateBudgetClarification } from '@/lib/tagro/translate-negotiation'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; propId: string }> }
) {
  try {
    const { id: projectId, propId: proposalId } = await params
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
    const sb = service as any

    const { data: project } = await sb
      .from('projects')
      .select('id,title,user_id,client_id,scope_summary,budget_min,budget_max')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
    if (project.user_id !== user.id && project.client_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const { data: proposal } = await sb
      .from('project_proposals')
      .select('id,project_id,dev_id,status,dev_proposed_price')
      .eq('id', proposalId)
      .eq('project_id', projectId)
      .maybeSingle()
    if (!proposal) return NextResponse.json({ error: 'proposal_not_found' }, { status: 404 })
    if (proposal.status !== 'budget_clarification') {
      return NextResponse.json({ error: 'not_in_budget_clarification' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const action: string = body?.action
    if (!['accept', 'adjust', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 })
    }

    if (action === 'accept') {
      await sb.from('project_proposals').update({ status: 'accepted' }).eq('id', proposalId)
      return NextResponse.json({ ok: true, result: 'accepted' })
    }

    if (action === 'decline') {
      await sb.from('project_proposals').update({ status: 'declined' }).eq('id', proposalId)

      await sb.from('notifications').insert({
        user_id: proposal.dev_id,
        project_id: projectId,
        audience: 'dev',
        kind: 'proposal_declined',
        type: 'proposal_declined',
        title: 'Projektangebot abgelehnt',
        body: `Der Auftraggeber hat den Preisvorschlag für „${project.title}" abgelehnt.`,
        message: 'Preisvorschlag abgelehnt.',
        read: false,
        payload: { proposal_id: proposalId },
      })

      return NextResponse.json({ ok: true, result: 'declined' })
    }

    // action === 'adjust'
    const clientResponseRaw = body?.clientResponseRaw?.toString().trim() || null
    const adjustedPrice = body?.adjustedPrice ? Number(body.adjustedPrice) : null

    let clientResponseTranslated: string | null = null
    if (clientResponseRaw) {
      try {
        const result = await translateBudgetClarification({
          rawText: clientResponseRaw,
          direction: 'client_to_dev',
          context: {
            projectTitle: project.title,
            scopeSummary: project.scope_summary,
            budgetMin: project.budget_min,
            budgetMax: project.budget_max,
            devProposedPrice: proposal.dev_proposed_price,
          },
        })
        clientResponseTranslated = result.translatedText
      } catch {
        clientResponseTranslated = clientResponseRaw
      }
    }

    const updateFields: Record<string, unknown> = {
      client_response_raw: clientResponseRaw,
      client_response_translated: clientResponseTranslated,
    }
    if (adjustedPrice) {
      updateFields.dev_proposed_price = adjustedPrice
    }
    await sb.from('project_proposals').update(updateFields).eq('id', proposalId)

    if (adjustedPrice) {
      await sb.from('projects').update({
        budget_max: adjustedPrice,
      }).eq('id', projectId)
    }

    await sb.from('notifications').insert({
      user_id: proposal.dev_id,
      project_id: projectId,
      audience: 'dev',
      kind: 'client_budget_adjustment',
      type: 'client_budget_adjustment',
      title: 'Budget-Anpassung vom Auftraggeber',
      body: clientResponseTranslated || `Der Auftraggeber hat auf deinen Preisvorschlag geantwortet.`,
      message: 'Budget-Anpassung eingegangen.',
      read: false,
      payload: {
        proposal_id: proposalId,
        adjusted_price: adjustedPrice,
        client_response: clientResponseTranslated || clientResponseRaw,
      },
    })

    return NextResponse.json({ ok: true, result: 'adjusted' })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'respond_failed' }, { status: 500 })
  }
}
