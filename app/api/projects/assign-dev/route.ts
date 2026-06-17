import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { sendDevCredentialsEmail, sendDevAssignmentEmail } from '@/lib/email/send'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

/**
 * POST /api/projects/assign-dev
 *
 * White-label / agency routing. The workspace owner picks a developer by
 * email while creating a project; this hands the project to that developer.
 *
 *   • If the email already belongs to a Festag developer, we just link the
 *     project (projects.assigned_dev + project_assignments) and send the
 *     "new assignment" email.
 *   • If the email is new, we provision a developer account directly in
 *     Supabase — a dev_username + dev_pin pair that works on /dev/login —
 *     then send TWO emails: the credentials, then the assignment.
 *
 * Body: { projectId, devEmail, devName?, projectTitle?, scope? }
 *
 * The dev login mechanism is PIN-based (verify_dev_pin RPC reads
 * profiles.dev_username / dev_pin), so provisioning means writing those
 * fields on a profile row — not creating an email/password auth user.
 */

function appBaseUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin ?? 'https://festag.io'
}

function genPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function slugifyUsernameBase(email: string, name?: string | null): string {
  const fromName = (name ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
  if (fromName.length >= 3) return fromName.slice(0, 18)
  const local = email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]+/g, '') ?? 'dev'
  return (local || 'dev').slice(0, 18)
}

export async function POST(req: NextRequest) {
  try {
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 })
    const sb = service as any

    const body = await req.json().catch(() => ({}))
    const projectId: string | undefined = body?.projectId
    const rawEmail: string = (body?.devEmail ?? '').toString().trim().toLowerCase()
    const devName: string | null = body?.devName ? String(body.devName).trim() : null
    if (!projectId) return NextResponse.json({ ok: false, error: 'missing_projectId' }, { status: 400 })
    if (!/.+@.+\..+/.test(rawEmail)) return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })

    // The caller must own the project they're routing.
    const { data: project } = await sb
      .from('projects')
      .select('id,title,user_id,assigned_dev,scope_summary')
      .eq('id', projectId)
      .maybeSingle()
    if (!project) return NextResponse.json({ ok: false, error: 'project_not_found' }, { status: 404 })
    if (project.user_id && project.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    const projectTitle: string = (body?.projectTitle?.toString().trim()) || project.title || 'Dein Projekt'
    const scope: string | null = (body?.scope?.toString().trim()) || project.scope_summary || null
    const base = appBaseUrl(req)
    const devPanelUrl = `${base}/dev`
    const loginUrl = `${base}/dev/login`

    // ── Look the developer up by email ──────────────────────────────────
    const { data: existing } = await sb
      .from('profiles')
      .select('id,email,role,full_name,first_name,dev_username,dev_pin,approval_status,access_mode')
      .ilike('email', rawEmail)
      .maybeSingle()

    let devId: string
    let provisioned = false
    let credsResult: any = null
    let usernameForMail = ''
    let pinForMail = ''

    if (existing?.id) {
      // Account exists. Promote to a usable dev account if it isn't one yet.
      devId = existing.id as string
      const patch: Record<string, unknown> = {}
      if (existing.role !== 'dev' && existing.role !== 'admin') patch.role = 'dev'
      if (existing.approval_status !== 'approved') patch.approval_status = 'approved'

      let username = existing.dev_username as string | null
      let pin = existing.dev_pin as string | null
      const needsCreds = !username || !pin
      if (needsCreds) {
        username = username || (await uniqueUsername(sb, slugifyUsernameBase(rawEmail, devName || existing.full_name)))
        pin = pin || genPin()
        patch.dev_username = username
        patch.dev_pin = pin
        if (existing.access_mode == null) patch.access_mode = 'pool'
      }
      if (Object.keys(patch).length) {
        await sb.from('profiles').update(patch).eq('id', devId)
      }

      // Only mail credentials when we just minted them.
      if (needsCreds && username && pin) {
        provisioned = true
        usernameForMail = username
        pinForMail = pin
      }
    } else {
      // Provision a fresh developer profile. dev login is PIN-based, so a
      // profiles row with dev_username + dev_pin is a complete account.
      devId = randomUUID()
      const username = await uniqueUsername(sb, slugifyUsernameBase(rawEmail, devName))
      const pin = genPin()
      const firstName = devName ? devName.split(/\s+/)[0] : null
      const { error: insErr } = await sb.from('profiles').insert({
        id: devId,
        email: rawEmail,
        full_name: devName,
        first_name: firstName,
        role: 'dev',
        approval_status: 'approved',
        access_mode: 'pool',
        dev_username: username,
        dev_pin: pin,
        onboarding_completed: true,
      })
      if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 })
      provisioned = true
      usernameForMail = username
      pinForMail = pin
    }

    // ── Link the project to the developer ───────────────────────────────
    if (!project.assigned_dev || project.assigned_dev !== devId) {
      await sb.from('projects').update({ assigned_dev: devId }).eq('id', projectId)
    }
    await sb.from('project_assignments').upsert({
      project_id: projectId,
      user_id: devId,
      role_on_project: 'developer',
      assigned_by: user.id,
      active: true,
    }, { onConflict: 'project_id,user_id' })

    // ── Emails ──────────────────────────────────────────────────────────
    if (provisioned) {
      credsResult = await sendDevCredentialsEmail({
        to: rawEmail,
        devName,
        username: usernameForMail,
        pin: pinForMail,
        loginUrl,
        fromName: 'Festag',
      })
    }
    const assignResult = await sendDevAssignmentEmail({
      to: rawEmail,
      devName,
      projectTitle,
      scope,
      devPanelUrl,
      fromName: 'Festag',
    })

    return NextResponse.json({
      ok: true,
      devId,
      provisioned,
      mails: {
        credentials: credsResult ? { sent: !!credsResult.ok } : null,
        assignment: { sent: !!assignResult.ok },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'assign_failed' }, { status: 500 })
  }
}

/** Find a free dev_username starting from `base`, appending digits on clash. */
async function uniqueUsername(sb: any, base: string): Promise<string> {
  const root = (base || 'dev').slice(0, 18) || 'dev'
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? root : `${root}${Math.floor(10 + Math.random() * 90)}`
    const { data } = await sb
      .from('profiles')
      .select('id')
      .eq('dev_username', candidate)
      .maybeSingle()
    if (!data) return candidate
  }
  return `${root}${Date.now().toString().slice(-4)}`
}
