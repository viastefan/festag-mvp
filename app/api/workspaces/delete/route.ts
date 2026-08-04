import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { normalizeWorkspaceName } from '@/lib/pending-workspace'
import { assertSameOriginOrNoOrigin } from '@/lib/auth-request'

export const runtime = 'nodejs'

/**
 * POST /api/workspaces/delete
 * Body: { workspaceId, confirmation } — confirmation must match workspace name.
 * Soft-deletes (deleted_at). Owner only.
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
  const workspaceId = String(body?.workspaceId || '').trim()
  const confirmation = normalizeWorkspaceName(String(body?.confirmation || ''))

  if (!workspaceId || !/^[0-9a-f-]{36}$/i.test(workspaceId)) {
    return NextResponse.json({ ok: false, reason: 'workspace_required' }, { status: 400 })
  }
  if (!confirmation) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'confirmation_required',
        message: 'Tippe den Workspace-Namen zur Bestätigung.',
      },
      { status: 400 },
    )
  }

  const service = getServiceClient() || supabase
  const { data: ws } = await service
    .from('workspaces')
    .select('id, name, primary_owner_id, deleted_at')
    .eq('id', workspaceId)
    .maybeSingle()

  if (!ws?.id || ws.deleted_at) {
    return NextResponse.json({ ok: false, reason: 'workspace_not_found' }, { status: 404 })
  }
  if (ws.primary_owner_id !== user.id) {
    return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 })
  }

  const expected = normalizeWorkspaceName(String(ws.name || ''))
  if (expected.toLowerCase() !== confirmation.toLowerCase()) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'confirmation_mismatch',
        message: 'Der Name stimmt nicht. Tippe den genauen Workspace-Namen.',
      },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()
  const { error } = await service
    .from('workspaces')
    .update({ deleted_at: now })
    .eq('id', workspaceId)
    .eq('primary_owner_id', user.id)
    .is('deleted_at', null)

  if (error) {
    console.error('[workspaces/delete]', error)
    return NextResponse.json({ ok: false, reason: 'delete_failed', message: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    workspace: { id: workspaceId, name: ws.name, deletedAt: now },
  })
}
