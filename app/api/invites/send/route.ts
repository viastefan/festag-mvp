import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

/**
 * Sends a Festag invitation email via Resend.
 * Body: { email, role: 'dev'|'client'|'collaborator', invitedName?, accessMode?, projectId? }
 *
 * Flow:
 *   1. Generates a 6-digit PIN + persists to team_invites (status=pending)
 *   2. Sends email to invitee with PIN + login link
 *   3. CCs founder mailbox so we can manually verify
 */
export async function POST(req: NextRequest) {
  try {
    const { email, role, invitedName, accessMode, projectId, fromUserId, fromUserEmail } = await req.json()
    if (!email || !email.includes('@')) return NextResponse.json({ error:'invalid email' }, { status:400 })

    const allowedRoles = ['dev','client','collaborator','admin']
    const safeRole = allowedRoles.includes(role) ? role : 'collaborator'
    const safeMode = ['open','closed','team','company'].includes(accessMode) ? accessMode : 'open'

    const pin = String(Math.floor(100000 + Math.random()*900000))

    // Persist invite (best-effort)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let inviteId: string | null = null
    if (serviceKey) {
      const sb = createClient(SUPABASE_URL, serviceKey, { auth:{ autoRefreshToken:false, persistSession:false } })
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

    // Send via Resend if configured
    const resendKey = process.env.RESEND_API_KEY
    let mailSent = false
    if (resendKey) {
      const html = `<!doctype html><html><body style="font-family:-apple-system,sans-serif;max-width:520px;margin:32px auto;padding:0 24px;color:#0f172a;line-height:1.6;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:28px 28px;border-radius:14px 14px 0 0;">
          <h1 style="margin:0 0 4px;font-size:22px;letter-spacing:-.4px;">Du wurdest zu Festag eingeladen</h1>
          <p style="margin:0;opacity:.9;font-size:14px;">${invitedName ? `Hi ${invitedName}, ` : 'Hi, '} du wurdest als <strong>${safeRole === 'dev' ? 'Developer' : safeRole === 'client' ? 'Kunde' : 'Mitglied'}</strong> eingeladen.</p>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px;padding:28px;">
          <p style="margin:0 0 16px;">${fromUserEmail ?? 'Festag'} hat dich eingeladen, deinem Festag Workspace beizutreten.</p>
          <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:18px 0;text-align:center;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;color:#64748b;">DEIN ZUGANGS-PIN</p>
            <p style="margin:0;font-size:28px;font-weight:800;letter-spacing:.3em;font-family:ui-monospace,monospace;color:#0f172a;">${pin}</p>
          </div>
          <a href="${acceptUrl}" style="display:inline-block;width:100%;padding:14px;background:#0f172a;color:#fff;text-decoration:none;border-radius:10px;text-align:center;font-weight:700;box-sizing:border-box;">
            Festag öffnen →
          </a>
          <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;">Dieser PIN ist 7 Tage gültig. Nach dem Login wirst du gebeten, ihn zu ändern.</p>
        </div>
      </body></html>`

      const r = await fetch('https://api.resend.com/emails', {
        method:'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type':'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? 'Festag <hello@festag.io>',
          to: [email],
          cc: ['stefandirnberger@viawen.com'],  // founder verification CC
          subject: `Du wurdest zu Festag eingeladen ${safeMode === 'closed' ? '(Closed-System)' : ''}`,
          html,
        }),
      })
      mailSent = r.ok
      if (!r.ok) {
        const errBody = await r.text().catch(() => '')
        console.error('resend error:', errBody)
      }
    }

    return NextResponse.json({ ok: true, inviteId, pin: mailSent ? undefined : pin, mailSent })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status:500 })
  }
}
