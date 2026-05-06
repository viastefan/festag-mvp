import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendInviteEmail } from '@/lib/email/send'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

// Force Node.js runtime — nodemailer needs Node, not Edge.
export const runtime = 'nodejs'

/**
 * Sendet eine Festag-Einladung über IONOS-SMTP.
 * Body: { email, role, invitedName?, accessMode?, projectId?, fromUserId?, fromUserEmail? }
 *
 * Flow:
 *   1. 6-stelligen PIN generieren + in team_invites speichern
 *   2. Mail an Empfänger (PIN + Login-Link), CC an Founder (zur Verifikation)
 */
export async function POST(req: NextRequest) {
  try {
    const { email, role, invitedName, accessMode, projectId, fromUserId, fromUserEmail } = await req.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 })
    }

    const allowedRoles = ['dev', 'client', 'collaborator', 'admin'] as const
    const safeRole: typeof allowedRoles[number] = (allowedRoles as readonly string[]).includes(role) ? role : 'collaborator'
    const safeMode = ['open', 'closed', 'team', 'company'].includes(accessMode) ? accessMode : 'open'

    const pin = String(Math.floor(100000 + Math.random() * 900000))

    // Persist invite (best-effort)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let inviteId: string | null = null
    if (serviceKey) {
      const sb = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data: ins } = await sb.from('team_invites').insert({
        email: email.toLowerCase().trim(),
        role: safeRole,
        invited_by: fromUserId ?? null,
        invited_name: invitedName ?? null,
        access_mode: safeMode,
        project_id: projectId ?? null,
        pin,
        status: 'pending',
      }).select('id').single()
      inviteId = (ins as any)?.id ?? null
    }

    const origin = req.headers.get('origin') ?? new URL(req.url).origin
    const acceptUrl = `${origin}/login?invite=${inviteId ?? ''}&email=${encodeURIComponent(email)}`

    const result = await sendInviteEmail({
      to:          email,
      invitedName: invitedName ?? null,
      role:        safeRole,
      fromName:    fromUserEmail ?? 'Festag',
      pin, acceptUrl,
      ccFounder:   true,
    })

    return NextResponse.json({
      ok:        true,
      inviteId,
      mailSent:  result.ok,
      // Fallback: PIN nur ausliefern, wenn Mail nicht gesendet werden konnte
      pin:       result.ok ? undefined : pin,
      mailError: result.ok ? undefined : ('error' in result ? result.error : undefined),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
