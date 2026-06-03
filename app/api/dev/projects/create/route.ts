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
const PALETTE = ['#5B647D', '#6F7B96', '#5E8B7E', '#9A7B6B', '#6a738c', '#4F7CA4']

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
  const clientId: string | null = body?.clientId ? String(body.clientId) : null
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

  // Variant (a): a dev may create a project directly FOR a client they are
  // already connected to (shares ≥1 active project). The client owns + sees it
  // instantly — no invite link needed. Verify the connection first.
  let ownerId = user.id
  if (clientId && clientId !== user.id) {
    const { data: myAssigns } = await (service as any)
      .from('project_assignments').select('project_id').eq('user_id', user.id).eq('active', true)
    const myProjectIds = (myAssigns ?? []).map((a: any) => a.project_id).filter(Boolean)
    let connected = false
    if (myProjectIds.length) {
      const { data: shared } = await (service as any)
        .from('projects').select('id').eq('user_id', clientId).in('id', myProjectIds).limit(1)
      connected = Boolean(shared && shared.length)
    }
    if (!connected && role !== 'admin') {
      return NextResponse.json({ error: 'not connected to this client' }, { status: 403 })
    }
    ownerId = clientId
  }

  // Round-robin a color from how many projects this dev already owns.
  const { count } = await (service as any)
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  const color = PALETTE[(count ?? 0) % PALETTE.length]

  const forClient = ownerId !== user.id

  const { data: project, error: pErr } = await (service as any)
    .from('projects')
    .insert({
      user_id: ownerId,
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

  // Membership: the dev leads; when built for a client, the client is a member
  // so the project surfaces in their workspace immediately.
  await (service as any).from('project_members').upsert({
    project_id: project.id,
    user_id: user.id,
    role: 'lead',
  }, { onConflict: 'project_id,user_id', ignoreDuplicates: true })
  if (forClient) {
    await (service as any).from('project_members').upsert({
      project_id: project.id,
      user_id: ownerId,
      role: 'client',
    }, { onConflict: 'project_id,user_id', ignoreDuplicates: true })
    // Tell the client a new project was set up for them.
    await (service as any).from('notifications').insert({
      user_id: ownerId,
      project_id: project.id,
      audience: 'client',
      kind: 'project_created',
      type: 'project_created',
      title: 'Neues Projekt für dich angelegt',
      body: `Dein Entwickler hat „${project.title}" für dich angelegt.`,
      message: `Dein Entwickler hat „${project.title}" für dich angelegt.`,
      read: false,
    })
  }

  await (service as any).from('audit_logs').insert({
    actor_id: user.id,
    action: forClient ? 'project.dev_created_for_client' : 'project.dev_created',
    entity_type: 'project',
    entity_id: project.id,
    metadata: { work_type: workType, for_client: forClient ? ownerId : null },
  })

  return NextResponse.json({ ok: true, project, forClient })
}
