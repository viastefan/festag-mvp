import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { joinCompletionRedirect } from '@/lib/platform/join'

export const runtime = 'nodejs'

/**
 * POST /api/onboarding/join/complete
 *
 * Join Project finish: persist name (+ optional avatar), mark onboarding done,
 * return the invited project (or dashboard).
 *
 * Body: { fullName: string, avatarUrl?: string | null, projectId?: string | null, token?: string | null }
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'not-authenticated' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    fullName?: string
    avatarUrl?: string | null
    projectId?: string | null
    token?: string | null
  }

  const fullName = (body.fullName || '').trim()
  if (!fullName || fullName.length < 2) {
    return NextResponse.json({ error: 'name-required' }, { status: 400 })
  }

  const svc = getServiceClient()
  if (!svc) return NextResponse.json({ error: 'service-key-missing' }, { status: 500 })

  const avatarUrl =
    body.avatarUrl && !String(body.avatarUrl).startsWith('blob:')
      ? String(body.avatarUrl)
      : null

  await svc.from('profiles').upsert(
    {
      id: user.id,
      full_name: fullName.slice(0, 80),
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  await svc.from('onboarding_state').upsert(
    {
      user_id: user.id,
      current_step: 'join_complete',
      workspace_done: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  let projectId = body.projectId || null

  if (!projectId && body.token) {
    const { data: inv } = await svc
      .from('team_invites')
      .select('project_id')
      .eq('token', body.token)
      .maybeSingle()
    projectId = (inv as { project_id?: string } | null)?.project_id ?? null
  }

  if (!projectId) {
    const { data: membership } = await svc
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    projectId = (membership as { project_id?: string } | null)?.project_id ?? null
  }

  return NextResponse.json({
    ok: true,
    redirect: joinCompletionRedirect(projectId),
    projectId,
  })
}
