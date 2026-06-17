import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { sendDevCredentialsEmail } from '@/lib/email/send'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

function genPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function slugifyUsernameBase(email: string, name?: string | null): string {
  const fromName = (name ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
  if (fromName.length >= 3) return fromName.slice(0, 18)
  const local = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]+/g, '') ?? 'dev'
  return (local || 'dev').slice(0, 18)
}

async function uniqueUsername(sb: any, base: string): Promise<string> {
  const root = (base || 'dev').slice(0, 18) || 'dev'
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? root : `${root}${Math.floor(10 + Math.random() * 90)}`
    const { data } = await sb.from('profiles').select('id').eq('dev_username', candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${root}${Date.now().toString().slice(-4)}`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const service = getServiceClient()
  if (!service) return new NextResponse('Service unavailable', { status: 503 })
  const sb = service as any

  const { data: invitation } = await sb
    .from('dev_invitations')
    .select('id,project_id,invited_by,dev_email,dev_name,status,expires_at')
    .eq('confirm_token', token)
    .maybeSingle()

  if (!invitation) return redirectWithMessage(req, 'Ungültiger Bestätigungslink.')
  if (invitation.status !== 'awaiting_confirmation') return redirectWithMessage(req, 'Dieser Link wurde bereits verwendet.')
  if (new Date(invitation.expires_at) < new Date()) {
    await sb.from('dev_invitations').update({ status: 'expired' }).eq('id', invitation.id)
    return redirectWithMessage(req, 'Dieser Einladungslink ist abgelaufen.')
  }

  await sb.from('dev_invitations').update({
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  }).eq('id', invitation.id)

  const { data: existing } = await sb
    .from('profiles')
    .select('id,dev_username,dev_pin')
    .ilike('email', invitation.dev_email)
    .maybeSingle()

  let devId: string
  let username: string
  let pin: string

  if (existing?.id) {
    devId = existing.id
    username = existing.dev_username || await uniqueUsername(sb, slugifyUsernameBase(invitation.dev_email, invitation.dev_name))
    pin = existing.dev_pin || genPin()
    await sb.from('profiles').update({
      role: 'dev',
      approval_status: 'approved',
      dev_username: username,
      dev_pin: pin,
    }).eq('id', devId)
  } else {
    devId = randomUUID()
    username = await uniqueUsername(sb, slugifyUsernameBase(invitation.dev_email, invitation.dev_name))
    pin = genPin()
    const firstName = invitation.dev_name ? invitation.dev_name.split(/\s+/)[0] : null
    await sb.from('profiles').insert({
      id: devId,
      email: invitation.dev_email,
      full_name: invitation.dev_name,
      first_name: firstName,
      role: 'dev',
      approval_status: 'approved',
      access_mode: 'pool',
      dev_username: username,
      dev_pin: pin,
      onboarding_completed: true,
    })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  await sendDevCredentialsEmail({
    to: invitation.dev_email,
    devName: invitation.dev_name,
    username,
    pin,
    loginUrl: `${base}/dev/login?prefill=${encodeURIComponent(username)}`,
    fromName: 'Festag',
  }).catch(() => {})

  if (invitation.project_id) {
    await sb.from('project_proposals').upsert({
      project_id: invitation.project_id,
      dev_id: devId,
      invited_by: invitation.invited_by,
      status: 'proposed',
      role_on_project: 'developer',
    }, { onConflict: 'project_id,dev_id' })
  }

  if (invitation.invited_by) {
    await sb.from('notifications').insert({
      user_id: invitation.invited_by,
      project_id: invitation.project_id,
      audience: 'client',
      kind: 'invite_confirmed',
      type: 'invite_confirmed',
      title: 'Einladung bestätigt',
      body: `${invitation.dev_name || invitation.dev_email} hat die Zusammenarbeit bestätigt.`,
      message: 'Dev-Einladung bestätigt.',
      read: false,
      payload: {
        dev_email: invitation.dev_email,
        dev_name: invitation.dev_name,
        dev_id: devId,
      },
    })
  }

  await sb.from('dev_invitations').update({
    status: 'onboarded',
    onboarded_at: new Date().toISOString(),
  }).eq('id', invitation.id)

  return NextResponse.redirect(new URL(`/dev/login?prefill=${encodeURIComponent(username)}&welcome=1`, base))
}

function redirectWithMessage(req: NextRequest, message: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  return NextResponse.redirect(new URL(`/dev/login?message=${encodeURIComponent(message)}`, base))
}
