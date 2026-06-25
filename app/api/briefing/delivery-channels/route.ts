import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import {
  channelsFromProfile,
  isValidBriefingEmail,
  normalizeBriefingPhone,
  type BriefingMessageChannel,
} from '@/lib/briefing/delivery-channels'

export const runtime = 'nodejs'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const SELECT = [
  'briefing_whatsapp_phone',
  'briefing_whatsapp_linked_at',
  'briefing_message_channel',
  'briefing_message_destination',
  'briefing_message_linked_at',
  'email',
  'phone',
].join(',')

async function sessionUser() {
  const cookieStore = cookies()
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(_cookies: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
    },
  })
  const { data: { user } } = await sb.auth.getUser()
  return { sb, user }
}

function serviceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null
  return createServiceClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function mapDbError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('briefing_whatsapp') || lower.includes('briefing_message') || lower.includes('column')) {
    return 'schema_missing'
  }
  return message
}

export async function GET() {
  const { user } = await sessionUser()
  if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

  const sb = serviceClient() ?? (await sessionUser()).sb
  const { data, error } = await sb
    .from('profiles')
    .select(SELECT)
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    const mapped = mapDbError(error.message)
    return NextResponse.json({ ok: false, error: mapped }, { status: mapped === 'schema_missing' ? 503 : 500 })
  }

  return NextResponse.json({
    ok: true,
    channels: channelsFromProfile(data as any),
    defaults: {
      email: (data as any)?.email ?? user.email ?? null,
      phone: (data as any)?.phone ?? null,
    },
  })
}

type PatchBody = {
  action: 'link' | 'unlink'
  channel: 'whatsapp' | 'message'
  phone?: string
  messageChannel?: BriefingMessageChannel
  destination?: string
}

export async function PATCH(req: NextRequest) {
  const { user } = await sessionUser()
  if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as PatchBody
  const { action, channel } = body
  if (!action || !channel) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const patch: Record<string, string | null> = {}

  if (action === 'unlink') {
    if (channel === 'whatsapp') {
      patch.briefing_whatsapp_phone = null
      patch.briefing_whatsapp_linked_at = null
    } else {
      patch.briefing_message_channel = null
      patch.briefing_message_destination = null
      patch.briefing_message_linked_at = null
    }
  } else if (action === 'link') {
    if (channel === 'whatsapp') {
      const phone = normalizeBriefingPhone(body.phone ?? '')
      if (!phone) return NextResponse.json({ ok: false, error: 'invalid_phone' }, { status: 400 })
      patch.briefing_whatsapp_phone = phone
      patch.briefing_whatsapp_linked_at = now
    } else {
      const messageChannel = body.messageChannel
      const destination = (body.destination ?? '').trim()
      if (messageChannel !== 'email' && messageChannel !== 'sms') {
        return NextResponse.json({ ok: false, error: 'invalid_message_channel' }, { status: 400 })
      }
      if (messageChannel === 'email') {
        if (!isValidBriefingEmail(destination)) {
          return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
        }
        patch.briefing_message_channel = 'email'
        patch.briefing_message_destination = destination.toLowerCase()
      } else {
        const phone = normalizeBriefingPhone(destination)
        if (!phone) return NextResponse.json({ ok: false, error: 'invalid_phone' }, { status: 400 })
        patch.briefing_message_channel = 'sms'
        patch.briefing_message_destination = phone
      }
      patch.briefing_message_linked_at = now
    }
  } else {
    return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 })
  }

  const sb = serviceClient()
  if (!sb) {
    return NextResponse.json({ ok: false, error: 'service_key_missing' }, { status: 500 })
  }

  const { data, error } = await sb
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
    .select(SELECT)
    .maybeSingle()

  if (error) {
    const mapped = mapDbError(error.message)
    return NextResponse.json({ ok: false, error: mapped }, { status: mapped === 'schema_missing' ? 503 : 500 })
  }

  return NextResponse.json({
    ok: true,
    channels: channelsFromProfile(data as any),
  })
}
