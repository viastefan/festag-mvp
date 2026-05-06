import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { sendInviteAcceptEmail, sendInviteEmail } from '@/lib/email/send'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

// Force Node.js runtime — nodemailer + crypto need Node, not Edge.
export const runtime = 'nodejs'

/**
 * Sendet eine Festag-Einladung — Email-first Acceptance-Flow.
 *
 * Body: { email, role, invitedName?, accessMode?, projectId?, fromUserId?, fromUserEmail?, teamId? }
 *
 * Flow (neu, Standard):
 *   1. accept_token (32 bytes hex) erzeugen + in team_invites speichern
 *   2. Mail mit Acceptance-Link an Empfänger (KEIN PIN), CC an Founder
 *   3. Empfänger klickt Link → /invite/[token] → POST /api/invites/accept
 *   4. Server generiert PIN + sendet 2. Mail mit PIN
 *
 * Legacy-Fallback (FESTAG_INVITE_DIRECT_PIN=1):
 *   PIN wird sofort generiert und in der ersten Mail mitgeschickt.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, role, invitedName, accessMode, projectId, teamId, fromUserId, fromUserEmail } = await req.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'invalid email' }, { status: 400 })
    }

    const allowedRoles = ['dev', 'client', 'collaborator', 'admin'] as const
    const safeRole: typeof allowedRoles[number] = (allowedRoles as readonly string[]).includes(role) ? role : 'collaborator'
    const safeMode = ['open', 'closed', 'team', 'company'].includes(accessMode) ? accessMode : 'open'

    const acceptToken = randomBytes(32).toString('hex')
    const directPin   = process.env.FESTAG_INVITE_DIRECT_PIN === '1'
    const pin         = directPin ? String(Math.floor(100000 + Math.random() * 900000)) : null

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let inviteId: string | null = null

    if (serviceKey) {
      const sb = createClient(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data: ins, error } = await sb.from('team_invites').insert({
        email:         email.toLowerCase().trim(),
        role:          safeRole,
        invited_by:    fromUserId ?? null,
        invited_name:  invitedName ?? null,
        access_mode:   safeMode,
        project_id:    projectId ?? null,
        team_id:       teamId    ?? null,
        tenant_id:     fromUserId ?? null,
        accept_token:  acceptToken,
        pin:           pin,
        pin_sent_at:   directPin && pin ? new Date().toISOString() : null,
        status:        'pending',
        expires_at:    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      }).select('id').single()

      if (error) console.error('[invites/send] insert error:', error)
      inviteId = (ins as any)?.id ?? null
    }

    const origin    = req.headers.get('origin') ?? new URL(req.url).origin
    const acceptUrl = `${origin}/invite/${acceptToken}`

    let mailResult
    if (directPin && pin) {
      // Legacy fallback path — sofort PIN
      mailResult = await sendInviteEmail({
        to: email,
        invitedName: invitedName ?? null,
        role: safeRole,
        fromName: fromUserEmail ?? 'Festag',
        pin,
        acceptUrl: `${origin}/login?invite=${inviteId ?? ''}&email=${encodeURIComponent(email)}`,
        ccFounder: true,
      })
    } else {
      // Standard — Acceptance-Mail ohne PIN
      mailResult = await sendInviteAcceptEmail({
        to: email,
        invitedName: invitedName ?? null,
        role: safeRole,
        fromName: fromUserEmail ?? 'Festag',
        acceptUrl,
        ccFounder: true,
      })
    }

    return NextResponse.json({
      ok:        true,
      inviteId,
      flow:      directPin ? 'direct-pin' : 'accept-first',
      mailSent:  mailResult.ok,
      pin:       mailResult.ok ? undefined : pin ?? undefined,
      mailError: mailResult.ok ? undefined : ('error' in mailResult ? mailResult.error : undefined),
    })
  } catch (e: any) {
    console.error('[invites/send] error:', e)
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
