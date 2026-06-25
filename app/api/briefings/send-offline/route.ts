import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendMail } from '@/lib/email/client'
import { tplGeneric } from '@/lib/email/templates'
import { buildBriefingSharePayload } from '@/lib/briefing/delivery-channels'

export const runtime = 'nodejs'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      headline?: string
      summary?: string
    }

    const cookieStore = cookies()
    const sbCookie = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(_cookies: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
      },
    })
    const { data: { user } } = await sbCookie.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ ok: false, error: 'service_key_missing' }, { status: 500 })
    const sb = createServiceClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: profile } = await sb
      .from('profiles')
      .select('full_name,briefing_message_channel,briefing_message_destination,briefing_message_linked_at')
      .eq('id', user.id)
      .maybeSingle()

    if (!(profile as any)?.briefing_message_linked_at) {
      return NextResponse.json({ ok: false, error: 'message_not_linked' }, { status: 400 })
    }

    const channel = (profile as any)?.briefing_message_channel
    const destination = (profile as any)?.briefing_message_destination
    if (channel !== 'email' || !destination) {
      return NextResponse.json({ ok: false, error: 'email_channel_required' }, { status: 400 })
    }

    const headline = (body.headline ?? 'Festag Briefing').trim()
    const summary = (body.summary ?? '').trim()
    const text = buildBriefingSharePayload(headline, summary)
    const ownerName = ((profile as any)?.full_name || '').split(' ')[0] || ''
    const greeting = ownerName ? `Hallo ${ownerName},` : 'Hallo,'
    const ctaUrl = 'https://festag.app/reports'

    const bodyHtml = [
      `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#1c1914;">${greeting}</p>`,
      ...text.split('\n').map(line => `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#1c1914;">${line}</p>`),
      `<p style="margin:16px 0 0;font-size:14px;line-height:1.6;"><a href="${ctaUrl}" style="color:#007AFF;text-decoration:none;">Im Festag öffnen</a></p>`,
    ].join('')

    const tpl = tplGeneric({
      title: headline,
      preheader: headline,
      body: bodyHtml,
    })

    const result = await sendMail({
      to: [destination],
      subject: headline,
      html: tpl.html,
      text: `${greeting}\n\n${text}`,
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error || 'send_failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, sent_to: [destination] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'exception' }, { status: 500 })
  }
}
