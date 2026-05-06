import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSb } from '@supabase/supabase-js'
import { sendSupportAckEmail, sendSupportNotifyEmail } from '@/lib/email/send'

export const runtime = 'nodejs'

const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'

/**
 * Support-Schnellnachricht. Speichert in support_messages, schickt
 *  - Bestätigung an User (wenn Email vorhanden)
 *  - Notification an Founder
 */
export async function POST(req: NextRequest) {
  try {
    const { message, page } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    // User aus Auth-Token (optional — auch ohne Login möglich)
    const auth = req.headers.get('authorization')
    let userId: string | null = null
    let userEmail: string | null = null
    if (auth) {
      const token = auth.replace(/^Bearer\s+/i, '')
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
      const sb = createSb(SUPABASE_URL, anon, { auth: { persistSession: false } })
      const { data: { user } } = await sb.auth.getUser(token)
      if (user) {
        userId = user.id
        userEmail = user.email ?? null
      }
    }

    // DB persist
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey) {
      const sb = createSb(SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      await sb.from('support_messages').insert({
        user_id: userId,
        email:   userEmail,
        message: message.trim(),
        page:    page ?? null,
      }).catch(() => {})
    }

    // Mails (parallel, best-effort)
    const [ack, notify] = await Promise.all([
      userEmail
        ? sendSupportAckEmail({ to: userEmail, message: message.trim(), page })
        : Promise.resolve({ ok: false as const, error: 'no-user-email', skipped: true }),
      sendSupportNotifyEmail({ fromEmail: userEmail, message: message.trim(), page, userId }),
    ])

    return NextResponse.json({
      ok:           true,
      ackSent:      ack.ok,
      notifySent:   notify.ok,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
