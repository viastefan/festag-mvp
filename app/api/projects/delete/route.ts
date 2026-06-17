import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Projekt-Lifecycle-API.
 *
 * GET  /api/projects/delete?id=…           → liefert deletion_state (state/reason/counts)
 * POST /api/projects/delete                → führt soft-delete aus
 *   Body: { id, confirmation? }
 *
 * Lifecycle-Logik in DB-RPCs:
 *   - state 'free'   → confirmation optional
 *   - state 'warn'   → confirmation muss Projektname matchen
 *   - state 'locked' → immer abgelehnt (paid milestone)
 */

export async function GET(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'missing-id' }, { status: 400 })
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not-authenticated' }, { status: 401 })

    const { data, error } = await sb.rpc('project_deletion_state', { p_project_id: id })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, state: data?.[0] ?? null })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, confirmation } = await req.json()
    if (!id) return NextResponse.json({ error: 'missing-id' }, { status: 400 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not-authenticated' }, { status: 401 })

    const { data, error } = await sb.rpc('soft_delete_project', {
      p_project_id:   id,
      p_confirmation: confirmation ?? null,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const row = data?.[0]
    if (!row?.ok) {
      return NextResponse.json({ ok: false, state: row?.state ?? 'error', reason: row?.reason }, { status: 400 })
    }
    return NextResponse.json({ ok: true, state: row.state, reason: row.reason })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
