import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const maxDuration = 30

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const ALLOWED_REASONS = [
  'no_longer_needed',
  'switching_tool',
  'too_expensive',
  'data_privacy',
  'temporary_break',
  'other',
] as const
type Reason = typeof ALLOWED_REASONS[number]

/**
 * POST /api/account/delete
 *
 * Body: { reason: Reason, reasonDetails?: string }
 *
 * Logs the request (survives the auth delete because the table has no
 * FK to auth.users), then deletes the auth user via the admin API.
 * Cascading FKs clean up the rest (workspaces, projects, profiles
 * because we built them all with ON DELETE CASCADE on auth.users(id)).
 *
 * No undo path — the call is destructive on purpose. The UI gates this
 * with a reason picker + an explicit "Endgültig löschen" confirmation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { reason?: Reason; reasonDetails?: string }
    const reason = body.reason
    if (!reason || !ALLOWED_REASONS.includes(reason)) {
      return NextResponse.json({ ok: false, error: 'invalid_reason' }, { status: 400 })
    }
    const reasonDetails = (body.reasonDetails || '').slice(0, 1000)

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

    const admin = createServiceClient(SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1) Audit row first so we always have a record even if the delete fails.
    const { data: requestRow } = await admin
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        email: user.email ?? null,
        reason,
        reason_details: reasonDetails || null,
        status: 'requested',
      })
      .select('id')
      .single()

    const requestId = (requestRow as any)?.id ?? null

    // 2) Delete the auth user — cascades through workspaces/projects/etc.
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id, false)

    if (delErr) {
      if (requestId) {
        await admin.from('account_deletion_requests').update({
          status: 'failed',
          failure_reason: delErr.message,
        }).eq('id', requestId)
      }
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 })
    }

    if (requestId) {
      await admin.from('account_deletion_requests').update({
        status: 'executed',
        executed_at: new Date().toISOString(),
      }).eq('id', requestId)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'delete_failed' }, { status: 500 })
  }
}
