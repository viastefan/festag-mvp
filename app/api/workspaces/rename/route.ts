import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { normalizeWorkspaceName, slugifyWorkspaceName } from '@/lib/pending-workspace'
import {
  checkWorkspaceNameAvailability,
  invalidateWorkspaceNameCache,
} from '@/lib/workspace-name-availability'
import { assertSameOriginOrNoOrigin } from '@/lib/auth-request'

export const runtime = 'nodejs'

/**
 * POST /api/workspaces/rename
 * Body: { workspaceId?, name }
 *
 * Renames an owned workspace (defaults to personal). Live uniqueness like create.
 */
export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, reason: 'no_session' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = normalizeWorkspaceName(String(body?.name || ''))
  const workspaceIdRaw = String(body?.workspaceId || '').trim()

  if (!name) {
    return NextResponse.json(
      { ok: false, reason: 'name_required', message: 'Bitte einen Workspace-Namen eingeben.' },
      { status: 400 },
    )
  }

  const service = getServiceClient() || supabase

  let workspaceId = workspaceIdRaw
  if (!workspaceId || !/^[0-9a-f-]{36}$/i.test(workspaceId)) {
    const { data: personal } = await service
      .from('workspaces')
      .select('id')
      .eq('primary_owner_id', user.id)
      .eq('is_personal', true)
      .maybeSingle()
    workspaceId = personal?.id || ''
  }

  if (!workspaceId) {
    return NextResponse.json({ ok: false, reason: 'workspace_not_found' }, { status: 404 })
  }

  const { data: ws } = await service
    .from('workspaces')
    .select('id, name, slug, primary_owner_id')
    .eq('id', workspaceId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!ws?.id || ws.primary_owner_id !== user.id) {
    return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 })
  }

  const check = await checkWorkspaceNameAvailability(service as any, name, {
    excludeWorkspaceId: workspaceId,
  })
  if (!check.available) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'taken',
        message: check.reason || 'Dieser Workspace-Name ist bereits vergeben.',
      },
      { status: 409 },
    )
  }

  const slug = slugifyWorkspaceName(name)
  const { data: updated, error } = await service
    .from('workspaces')
    .update({ name, slug })
    .eq('id', workspaceId)
    .select('id, name, slug')
    .single()

  if (error || !updated) {
    console.error('[workspaces/rename]', error)
    return NextResponse.json({ ok: false, reason: 'update_failed' }, { status: 500 })
  }

  invalidateWorkspaceNameCache()

  return NextResponse.json({
    ok: true,
    workspace: { id: updated.id, name: updated.name, slug: updated.slug },
  })
}
