import { NextRequest, NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { translateBudgetClarification } from '@/lib/tagro/translate-negotiation'

export const runtime = 'nodejs'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proposalId } = await params
    const supa = createClient()
    const { data: { user: cookieUser } } = await supa.auth.getUser()
    const user = cookieUser ?? getDevUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
    const sb = service as any

    const { data: proposal } = await sb
      .from('project_proposals')
      .select('id,project_id,dev_id,status')
      .eq('id', proposalId)
      .maybeSingle()
    if (!proposal) return NextResponse.json({ error: 'proposal_not_found' }, { status: 404 })
    if (proposal.dev_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (!['proposed', 'budget_clarification'].includes(proposal.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const proposedPrice = body?.proposedPrice ? Number(body.proposedPrice) : null
    const clarificationRaw = body?.clarificationRaw?.toString().trim() || null
    if (!proposedPrice && !clarificationRaw) {
      return NextResponse.json({ error: 'missing_price_or_clarification' }, { status: 400 })
    }

    const { data: project } = await sb
      .from('projects')
      .select('id,title,scope_summary,budget_min,budget_max,user_id,client_id')
      .eq('id', proposal.project_id)
      .maybeSingle()

    let translatedText: string | null = null
    if (clarificationRaw) {
      try {
        const result = await translateBudgetClarification({
          rawText: clarificationRaw,
          direction: 'dev_to_client',
          context: {
            projectTitle: project?.title || null,
            scopeSummary: project?.scope_summary,
            budgetMin: project?.budget_min,
            budgetMax: project?.budget_max,
            devProposedPrice: proposedPrice,
          },
        })
        translatedText = result.translatedText
      } catch {
        translatedText = clarificationRaw
      }
    }

    await sb.from('project_proposals').update({
      status: 'budget_clarification',
      dev_proposed_price: proposedPrice,
      dev_proposed_currency: 'EUR',
      dev_proposed_start_date: body?.proposedStartDate || null,
      dev_proposed_duration_days: body?.proposedDurationDays ? Number(body.proposedDurationDays) : null,
      dev_clarification_raw: clarificationRaw,
      dev_clarification_translated: translatedText,
    }).eq('id', proposalId)

    const { data: devProfile } = await sb
      .from('profiles')
      .select('full_name,avatar_url,github_avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    const clientId = project?.client_id || project?.user_id
    if (clientId) {
      await sb.from('notifications').insert({
        user_id: clientId,
        project_id: proposal.project_id,
        audience: 'client',
        kind: 'dev_budget_clarification',
        type: 'dev_budget_clarification',
        title: 'Preisvorschlag vom Entwickler',
        body: translatedText || `Der Entwickler schlägt ${proposedPrice} EUR vor.`,
        message: 'Der Entwickler hat einen Preisvorschlag gemacht.',
        read: false,
        payload: {
          proposal_id: proposalId,
          project_id: proposal.project_id,
          dev_proposed_price: proposedPrice,
          budget_min: project?.budget_min,
          budget_max: project?.budget_max,
          dev_clarification: translatedText || clarificationRaw,
          dev_name: devProfile?.full_name,
          dev_avatar: devProfile?.avatar_url || devProfile?.github_avatar_url,
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'clarify_budget_failed' }, { status: 500 })
  }
}
