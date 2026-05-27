import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET    /api/decisions/:id   — full row + linked project
 * PATCH  /api/decisions/:id   — partial update (status, urgency, due_date,
 *                                title, description, options_json,
 *                                requested_for, decision_note)
 * DELETE /api/decisions/:id   — cancel (status='cancelled') unless ?hard=1
 *
 * Answering a decision goes through POST /api/decisions/:id/decide, not
 * PATCH, so the audit + notification fan-out can fire cleanly.
 */

const PATCHABLE = new Set([
  'title', 'description', 'options_json', 'urgency', 'due_date',
  'requested_for', 'status', 'decision_note', 'visible_to_client',
  'notification_channels',
])

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const expand = new URL(req.url).searchParams.get('expand')?.split(',') ?? []
  const wantOptions = expand.includes('options')
  const wantEvents = expand.includes('events')
  const wantLinks = expand.includes('links')

  const { data, error } = await (supa as any)
    .from('decisions').select('*').eq('id', ctx.params.id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })

  let project: any = null
  if (data.project_id) {
    const { data: p } = await (supa as any).from('projects').select('id,title,color,status').eq('id', data.project_id).maybeSingle()
    project = p
  }

  // Optional expansions — pulled in parallel.
  const expansions: Record<string, unknown> = {}
  const tasks: Promise<unknown>[] = []
  if (wantOptions) {
    tasks.push((async () => {
      const { data: opts } = await (supa as any)
        .from('decision_options')
        .select('*')
        .eq('decision_id', ctx.params.id)
        .order('ordinal', { ascending: true })
      expansions.options = opts ?? []
    })())
  }
  if (wantEvents) {
    tasks.push((async () => {
      const { data: evts } = await (supa as any)
        .from('decision_events')
        .select('*')
        .eq('decision_id', ctx.params.id)
        .order('created_at', { ascending: false })
        .limit(50)
      expansions.events = evts ?? []
    })())
  }
  if (wantLinks) {
    tasks.push((async () => {
      const { data: links } = await (supa as any)
        .from('decision_links')
        .select('*')
        .eq('decision_id', ctx.params.id)
      expansions.links = links ?? []
    })())
  }
  if (tasks.length > 0) await Promise.all(tasks)

  return NextResponse.json({ decision: data, project, ...expansions })
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  for (const k of Object.keys(body)) {
    if (PATCHABLE.has(k)) patch[k] = body[k]
  }
  if (typeof patch.title === 'string') patch.title = (patch.title as string).slice(0, 200)
  if (typeof patch.description === 'string') patch.description = (patch.description as string).slice(0, 4000)
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'no patchable fields' }, { status: 400 })

  const { data, error } = await (supa as any)
    .from('decisions').update(patch).eq('id', ctx.params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ decision: data })
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const hard = new URL(req.url).searchParams.get('hard') === '1'
  if (hard) {
    const { error } = await (supa as any).from('decisions').delete().eq('id', ctx.params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, deleted: 'hard' })
  }
  const { error } = await (supa as any).from('decisions').update({ status: 'cancelled' }).eq('id', ctx.params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: 'soft' })
}
