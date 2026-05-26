import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET  /api/decisions
 *   Lists decisions the current user is involved in:
 *     • requested_for == me  (I decide)
 *     • created_by    == me  (I asked)
 *   Sorted by status priority (open first) then urgency then due_date.
 *
 * POST /api/decisions
 *   Body: { project_id, title, description?, options?[], urgency?,
 *           due_date?, requested_for, source_task_id? }
 *   Creates a decision request. The DB trigger fans out an inbox
 *   notification to requested_for.
 */

const URGENCY = new Set(['low', 'normal', 'high', 'critical'])
const OPEN_STATES = new Set(['open', 'waiting_for_client', 'in_progress'])

export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const onlyOpen = new URL(req.url).searchParams.get('open') === '1'

  // Two reads (the OR across RLS scopes can't be expressed in one .or chain
  // cleanly without polluting policy reasoning — easier to fetch both).
  const [{ data: forMe }, { data: byMe }] = await Promise.all([
    (supa as any).from('decisions').select('*').eq('requested_for', user.id).order('created_at', { ascending: false }).limit(200),
    (supa as any).from('decisions').select('*').eq('created_by', user.id).order('created_at', { ascending: false }).limit(200),
  ])

  // De-dupe (a dev could decide their own request in theory).
  const seen = new Set<string>()
  const merged: any[] = []
  for (const row of [...(forMe ?? []), ...(byMe ?? [])]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    merged.push(row)
  }

  const filtered = onlyOpen ? merged.filter(d => OPEN_STATES.has(d.status)) : merged

  return NextResponse.json({ decisions: filtered, open_count: merged.filter(d => OPEN_STATES.has(d.status) && d.requested_for === user.id).length })
}

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as {
    project_id?: string
    title?: string
    description?: string
    options?: Array<{ id?: string; label?: string; hint?: string }>
    urgency?: string
    due_date?: string | null
    requested_for?: string
    source_task_id?: string
    notification_channels?: string[]
  }

  if (!b.project_id || !b.title?.trim()) {
    return NextResponse.json({ error: 'project_id and title required' }, { status: 400 })
  }

  // Default requested_for: project owner.
  let requestedFor = b.requested_for || null
  if (!requestedFor) {
    const { data: proj } = await (supa as any)
      .from('projects').select('user_id,client_id').eq('id', b.project_id).maybeSingle()
    requestedFor = proj?.client_id || proj?.user_id || null
  }

  const options = Array.isArray(b.options)
    ? b.options.slice(0, 6).map((o, i) => ({
        id: (o.id || `opt-${i + 1}`).slice(0, 32),
        label: String(o.label || `Option ${i + 1}`).slice(0, 200),
        hint: o.hint ? String(o.hint).slice(0, 400) : undefined,
      }))
    : []

  const urgency = URGENCY.has(b.urgency || '') ? b.urgency : 'normal'

  const { data, error } = await (supa as any).from('decisions').insert({
    project_id: b.project_id,
    title: b.title.trim().slice(0, 200),
    description: b.description?.slice(0, 4000) || null,
    options_json: options,
    urgency,
    due_date: b.due_date || null,
    status: 'open',
    visible_to_client: true,
    source: b.source_task_id ? 'task' : 'manual',
    source_task_id: b.source_task_id || null,
    created_by: user.id,
    requested_for: requestedFor,
    notification_channels: Array.isArray(b.notification_channels) && b.notification_channels.length
      ? b.notification_channels.filter(c => ['email','push','whatsapp','sms','phone'].includes(c))
      : ['email'],
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ decision: data })
}
