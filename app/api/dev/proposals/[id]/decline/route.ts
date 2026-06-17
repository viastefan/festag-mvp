import { NextRequest, NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

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
    if (['accepted', 'declined'].includes(proposal.status)) {
      return NextResponse.json({ error: 'already_finalized' }, { status: 400 })
    }

    await sb.from('project_proposals').update({ status: 'declined' }).eq('id', proposalId)

    const { data: project } = await sb
      .from('projects')
      .select('id,title,user_id,client_id')
      .eq('id', proposal.project_id)
      .maybeSingle()

    const clientId = project?.client_id || project?.user_id
    if (clientId) {
      await sb.from('notifications').insert({
        user_id: clientId,
        project_id: proposal.project_id,
        audience: 'client',
        kind: 'proposal_declined',
        type: 'proposal_declined',
        title: 'Projektangebot abgelehnt',
        body: `Ein Entwickler hat das Angebot für „${project?.title}" abgelehnt.`,
        message: 'Ein Dev hat das Projektangebot abgelehnt.',
        read: false,
        payload: { proposal_id: proposalId, project_id: proposal.project_id },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'decline_failed' }, { status: 500 })
  }
}
