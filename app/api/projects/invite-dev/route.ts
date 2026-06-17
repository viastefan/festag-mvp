import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { randomBytes } from 'crypto'
import { sendGenericEmail } from '@/lib/email/send'

export const runtime = 'nodejs'

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
    const devEmail: string = (body?.devEmail ?? '').toString().trim().toLowerCase()
    const devName: string | null = body?.devName ? String(body.devName).trim() : null

    if (!projectId) return NextResponse.json({ error: 'missing_projectId' }, { status: 400 })
    if (!/.+@.+\..+/.test(devEmail)) return NextResponse.json({ error: 'invalid_email' }, { status: 400 })

    const { data: project } = await sb
      .from('projects')
      .select('id,title,user_id')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
    if (project.user_id !== user.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const { data: clientProfile } = await sb
      .from('profiles')
      .select('full_name,first_name')
      .eq('id', user.id)
      .maybeSingle()
    const clientName = clientProfile?.first_name || clientProfile?.full_name || 'Dein Auftraggeber'

    const confirmToken = randomBytes(32).toString('hex')
    const rejectToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await sb.from('projects').update({
      delivery_model: 'invite_new_dev',
    }).eq('id', projectId)

    const { data: invitation, error: invErr } = await sb.from('dev_invitations').insert({
      project_id: projectId,
      invited_by: user.id,
      dev_email: devEmail,
      dev_name: devName,
      confirm_token: confirmToken,
      reject_token: rejectToken,
      expires_at: expiresAt,
    }).select('id').single()

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

    const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const confirmUrl = `${base}/api/dev-invitations/${confirmToken}/confirm`
    const rejectUrl = `${base}/api/dev-invitations/${rejectToken}/reject`

    await sendGenericEmail({
      to: devEmail,
      subject: `${clientName} möchte mit dir über Festag arbeiten`,
      body: [
        `Hallo${devName ? ` ${devName}` : ''},`,
        '',
        `${clientName} möchte dich für das Projekt „${project.title}" auf Festag einladen.`,
        '',
        `Wenn du tatsächlich für ${clientName} arbeitest, bestätige hier:`,
        confirmUrl,
        '',
        `Falls du diese Person nicht kennst oder das Spam ist:`,
        rejectUrl,
        '',
        'Der Link ist 7 Tage gültig.',
        '',
        'Festag — Delivery Intelligence',
      ].join('\n'),
    }).catch(() => {})

    await sb.from('notifications').insert({
      user_id: user.id,
      project_id: projectId,
      audience: 'client',
      kind: 'invite_pending_confirmation',
      type: 'invite_pending_confirmation',
      title: 'Einladung gesendet',
      body: `${devName || devEmail} wurde eingeladen und muss die Zusammenarbeit bestätigen.`,
      message: 'Dev-Einladung wartet auf Bestätigung.',
      read: false,
      payload: {
        dev_email: devEmail,
        dev_name: devName,
        invitation_id: invitation?.id,
      },
    })

    return NextResponse.json({ ok: true, invitationId: invitation?.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'invite_dev_failed' }, { status: 500 })
  }
}
