import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'

/**
 * POST /api/dev/projects/create  { title, description?, workType? }
 *
 * Lets a developer spin up a project directly from the dev panel — the start
 * of the dev→client loop. The dev owns the project (projects.user_id) so they
 * can manage + invite, and we drop in an active project_assignment so it lands
 * in their "Bei dir aktiv" pool immediately. A client is attached afterwards
 * via a link-first invite (kind='client'), which surfaces the project to the
 * client through the project_members visibility policy.
 */

const WORK_TYPES = ['software', 'design', 'marketing', 'general'] as const
type WorkType = typeof WORK_TYPES[number]

// Calm, distinct accent colors — picked round-robin by created count so a dev's
// projects don't all look identical.
const PALETTE = ['#5B647D', '#6F7B96', '#5E8B7E', '#9A7B6B', '#7E6F96', '#4F7CA4']

export async function POST(req: Request) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const service = getServiceClient()
  if (!service) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const title = String(body?.title || '').trim()
  const description = String(body?.description || '').trim() || null
  const workType: WorkType = WORK_TYPES.includes(body?.workType) ? body.workType : 'software'
  if (!title) return NextResponse.json({ error: 'Titel fehlt.' }, { status: 400 })
  if (title.length > 160) return NextResponse.json({ error: 'Titel ist zu lang.' }, { status: 400 })

  const { data: profile } = await (service as any)
    .from('profiles')
    .select('role,approval_status')
    .eq('id', user.id)
    .maybeSingle()
  const role = profile?.role
  if (role !== 'dev' && role !== 'admin' && role !== 'project_owner') {
    return NextResponse.json({ error: 'not a developer' }, { status: 403 })
  }

  // Round-robin a color from how many projects this dev already owns.
  const { count } = await (service as any)
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  const color = PALETTE[(count ?? 0) % PALETTE.length]

  const { data: project, error: pErr } = await (service as any)
    .from('projects')
    .insert({
      user_id: user.id,
      title,
      description,
      work_type: workType,
      status: 'intake',
      color,
      assigned_dev: user.id,
    })
    .select('id,title,status,color,work_type,created_at')
    .single()
  if (pErr || !project) {
    return NextResponse.json({ error: pErr?.message || 'Projekt konnte nicht erstellt werden.' }, { status: 500 })
  }

  // Active assignment → shows up in the dev's "Bei dir aktiv" pool.
  await (service as any).from('project_assignments').upsert({
    project_id: project.id,
    user_id: user.id,
    role_on_project: 'developer',
    assigned_by: user.id,
    active: true,
  }, { onConflict: 'project_id,user_id' })

  // Lead membership so workspace-style invite checks also pass cleanly.
  await (service as any).from('project_members').upsert({
    project_id: project.id,
    user_id: user.id,
    role: 'lead',
  }, { onConflict: 'project_id,user_id', ignoreDuplicates: true })

  await (service as any).from('audit_logs').insert({
    actor_id: user.id,
    action: 'project.dev_created',
    entity_type: 'project',
    entity_id: project.id,
    metadata: { work_type: workType },
  })

  return NextResponse.json({ ok: true, project })
}
