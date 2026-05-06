import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSb } from '@supabase/supabase-js'
import { sendGenericEmail } from '@/lib/email/send'

export const runtime = 'nodejs'

/**
 * Generic transactional Email-Endpoint — nur für authentifizierte User.
 * Body: { to, title, subtitle?, body (html), preheader? }
 *
 * Use-Cases:
 *  - Frontend triggert Mail (z.B. Quote-Versand, Custom-Notify)
 *  - Schutz: nur eingeloggte User können senden
 *  - Founder bekommt automatisch BCC (zur Audit-Sicht)
 */
export async function POST(req: NextRequest) {
  try {
    // Auth-Check
    const auth = req.headers.get('authorization')
    if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const token = auth.replace(/^Bearer\s+/i, '')

    const SUPABASE_URL = 'https://xsdkoepwuvpuroijjain.supabase.co'
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    const sb = createSb(SUPABASE_URL, anon, { auth: { persistSession: false } })
    const { data: { user } } = await sb.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { to, title, subtitle, body, preheader } = await req.json()
    if (!to || !title || !body) {
      return NextResponse.json({ error: 'missing fields (to, title, body)' }, { status: 400 })
    }

    const result = await sendGenericEmail({ to, title, subtitle, body, preheader })
    return NextResponse.json({ ok: result.ok, ...(result.ok ? {} : { error: 'error' in result ? result.error : 'unknown' }) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
