import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xsdkoepwuvpuroijjain.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/**
 * POST /api/briefings/subscribe
 *
 * Body: { projectId?: string, cadence: 'daily'|'weekly'|'biweekly'|'off', format: 'email'|'audio'|'both', sendHour?: number, timezone?: string, recipients?: string[] }
 *
 * Upserts a briefing_subscriptions row for the current user + their
 * personal workspace + given project. Computes next_run_at server-side
 * via the SQL helper so the cron worker can pick it up.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      projectId?: string | null
      cadence?: 'daily' | 'weekly' | 'biweekly' | 'off'
      format?: 'email' | 'audio' | 'both'
      sendHour?: number
      timezone?: string
      recipients?: string[]
    }
    if (!body.cadence || !body.format) {
      return NextResponse.json({ ok: false, error: 'cadence and format required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(_cookies: { name: string; value: string; options: CookieOptions }[]) { /* read-only */ },
      },
    })
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'no_session' }, { status: 401 })

    // Find the user's personal workspace
    const { data: ws } = await sb
      .from('workspaces').select('id')
      .eq('primary_owner_id', user.id).eq('is_personal', true).maybeSingle()
    const workspaceId = (ws as any)?.id ?? null

    // Server-computed next_run_at via the SQL helper
    const { data: nextRun } = await sb.rpc('compute_next_briefing_run', {
      p_cadence: body.cadence,
      p_send_hour: body.sendHour ?? 8,
      p_timezone: body.timezone ?? 'Europe/Berlin',
    }) as any

    const row = {
      user_id: user.id,
      workspace_id: workspaceId,
      project_id: body.projectId ?? null,
      recipients: body.recipients ?? [],
      cadence: body.cadence,
      format: body.format,
      send_hour: body.sendHour ?? 8,
      timezone: body.timezone ?? 'Europe/Berlin',
      active: body.cadence !== 'off',
      next_run_at: body.cadence === 'off' ? null : nextRun,
    }

    const { data, error } = await sb
      .from('briefing_subscriptions')
      .upsert(row, { onConflict: 'user_id,workspace_id,project_id' })
      .select('id,cadence,format,send_hour,next_run_at,active')
      .single()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, subscription: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'subscribe_failed' }, { status: 500 })
  }
}
