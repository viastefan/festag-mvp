import { NextRequest, NextResponse } from 'next/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { fanOutProposalAccepted } from '@/lib/inbox/proposal-accepted'

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
      .select('id,project_id,dev_id,status,is_team_lead')
      .eq('id', proposalId)
      .maybeSingle()
    if (!proposal) return NextResponse.json({ error: 'proposal_not_found' }, { status: 404 })
    if (proposal.dev_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (!['proposed', 'budget_clarification'].includes(proposal.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))

    await sb.from('project_proposals').update({ status: 'accepted' }).eq('id', proposalId)

    const { data: project } = await sb
      .from('projects')
      .select('id,title,user_id,client_id,color,is_dev_team')
      .eq('id', proposal.project_id)
      .maybeSingle()

    const { data: profile } = await sb
      .from('profiles')
      .select('full_name,avatar_url,github_avatar_url,github_username,email')
      .eq('id', user.id)
      .maybeSingle()

    const devDisplayName = profile?.full_name
      || (profile?.github_username ? `@${profile.github_username}` : null)
      || profile?.email || 'Ein Developer'
    const devAvatar = profile?.avatar_url || profile?.github_avatar_url || null

    const clientId = project?.client_id || project?.user_id
    const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

    if (clientId && project) {
      await fanOutProposalAccepted({
        sb,
        projectId: project.id,
        projectTitle: project.title || 'Dein Projekt',
        devId: user.id,
        devDisplayName,
        devAvatar,
        clientId,
        projectColor: project.color,
        baseUrl: base,
      })
    }

    if (project?.is_dev_team) {
      const { data: allProposals } = await sb
        .from('project_proposals')
        .select('status')
        .eq('project_id', project.id)
      const allAccepted = (allProposals ?? []).every((p: any) => p.status === 'accepted')
      if (allAccepted && clientId) {
        await sb.from('notifications').insert({
          user_id: clientId,
          project_id: project.id,
          audience: 'client',
          kind: 'dev_team_complete',
          type: 'dev_team_complete',
          title: 'Dein Team ist komplett',
          body: `Alle Entwickler haben für „${project.title}" zugesagt.`,
          message: 'Das gesamte Dev-Team hat zugesagt.',
          read: false,
          payload: { project_id: project.id, project_title: project.title },
        })
      }
    }

    if (proposal.is_team_lead && project) {
      await sb.from('projects').update({ team_lead_dev: user.id }).eq('id', project.id)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'accept_failed' }, { status: 500 })
  }
}
