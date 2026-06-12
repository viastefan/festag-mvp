import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { randomBytes } from 'crypto'
import { sendDevAssignmentEmail, sendGenericEmail } from '@/lib/email/send'

export const runtime = 'nodejs'

type MemberInput = {
  email: string
  name?: string
  role?: string
  isLead?: boolean
}

export async function POST(req: NextRequest) {
  try {
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
    const sb = service as any

    const body = await req.json().catch(() => ({}))
    const projectId: string | undefined = body?.projectId
    const members: MemberInput[] = body?.members ?? []

    if (!projectId) return NextResponse.json({ error: 'missing_projectId' }, { status: 400 })
    if (!members.length) return NextResponse.json({ error: 'missing_members' }, { status: 400 })

    const { data: project } = await sb
      .from('projects')
      .select('id,title,user_id,scope_summary')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
    if (project.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const hasLead = members.some(m => m.isLead)
    if (!hasLead && members.length > 0) members[0].isLead = true

    await sb.from('projects').update({
      delivery_model: 'team_internal',
      is_dev_team: true,
    }).eq('id', projectId)

    const { data: clientProfile } = await sb
      .from('profiles')
      .select('full_name,first_name')
      .eq('id', user.id)
      .maybeSingle()
    const clientName = clientProfile?.first_name || clientProfile?.full_name || 'Dein Auftraggeber'

    const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const results: any[] = []

    for (const member of members) {
      const email = member.email?.toString().trim().toLowerCase()
      if (!email || !/.+@.+\..+/.test(email)) continue

      const { data: devProfile } = await sb
        .from('profiles')
        .select('id,email,full_name,role')
        .ilike('email', email)
        .maybeSingle()

      if (devProfile && (devProfile.role === 'dev' || devProfile.role === 'admin' || devProfile.role === 'project_owner')) {
        await sb.from('project_proposals').upsert({
          project_id: projectId,
          dev_id: devProfile.id,
          invited_by: user.id,
          status: 'proposed',
          role_on_project: member.role || 'developer',
          is_team_lead: !!member.isLead,
        }, { onConflict: 'project_id,dev_id' })

        if (member.isLead) {
          await sb.from('projects').update({ team_lead_dev: devProfile.id }).eq('id', projectId)
        }

        await sb.from('notifications').insert({
          user_id: devProfile.id,
          project_id: projectId,
          audience: 'dev',
          kind: 'proposal_received',
          type: 'proposal_received',
          title: `Team-Projekt: ${project.title}`,
          body: `Du wurdest als ${member.isLead ? 'Team Lead' : 'Teammitglied'} für „${project.title}" vorgeschlagen.`,
          message: `Neues Team-Projektangebot.`,
          read: false,
          payload: { project_id: projectId, is_team_lead: member.isLead, role: member.role },
        })

        await sendDevAssignmentEmail({
          to: email,
          devName: devProfile.full_name || member.name,
          projectTitle: project.title || 'Neues Projekt',
          scope: project.scope_summary,
          devPanelUrl: `${base}/dev`,
          fromName: 'Festag',
        }).catch(() => {})

        results.push({ email, type: 'proposal', devId: devProfile.id })
      } else {
        const confirmToken = randomBytes(32).toString('hex')
        const rejectToken = randomBytes(32).toString('hex')

        await sb.from('dev_invitations').insert({
          project_id: projectId,
          invited_by: user.id,
          dev_email: email,
          dev_name: member.name || null,
          confirm_token: confirmToken,
          reject_token: rejectToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })

        const confirmUrl = `${base}/api/dev-invitations/${confirmToken}/confirm`
        const rejectUrl = `${base}/api/dev-invitations/${rejectToken}/reject`

        await sendGenericEmail({
          to: email,
          subject: `${clientName} möchte mit dir über Festag arbeiten`,
          body: [
            `Hallo${member.name ? ` ${member.name}` : ''},`,
            '',
            `${clientName} möchte dich als ${member.isLead ? 'Team Lead' : 'Teammitglied'} für das Projekt „${project.title}" auf Festag einladen.`,
            '',
            `Bestätige hier: ${confirmUrl}`,
            `Ablehnen: ${rejectUrl}`,
            '',
            'Der Link ist 7 Tage gültig.',
          ].join('\n'),
        }).catch(() => {})

        results.push({ email, type: 'invitation' })
      }
    }

    await sb.from('notifications').insert({
      user_id: user.id,
      project_id: projectId,
      audience: 'client',
      kind: 'dev_team_invites_sent',
      type: 'dev_team_invites_sent',
      title: 'Team-Einladungen gesendet',
      body: `${members.length} Einladungen für „${project.title}" wurden versendet.`,
      message: 'Team-Einladungen versendet.',
      read: false,
      payload: {
        member_count: members.length,
        members: members.map(m => ({ email: m.email, name: m.name, isLead: m.isLead })),
      },
    })

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'assign_team_failed' }, { status: 500 })
  }
}
