import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadRiskSettings } from '@/lib/risks/engine'
import { DEFAULT_RISK_SETTINGS } from '@/lib/risks/types'
import { isMissingTableError, safeTableRows } from '@/lib/supabase/safe-table'

export const runtime = 'nodejs'

const BOOLEAN_FIELDS = [
  'detect_risks',
  'detect_scope_changes',
  'detect_blockers',
  'source_tasks',
  'source_developer',
  'source_github',
  'source_client',
  'source_timeline',
  'source_decisions',
] as const

const SENSITIVITIES = new Set(['low', 'medium', 'high'])
const AUTONOMIES = new Set(['observe', 'recommend', 'assist', 'act'])

/**
 * GET  /api/risks/settings?workspace_id=&project_id=
 *   The effective settings — a project row overrides the workspace row,
 *   defaults fill whatever isn't stored yet.
 *
 * PUT  /api/risks/settings
 *   Upsert. Anything not sent stays as it is.
 */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const workspaceId = params.get('workspace_id')
  const projectId = params.get('project_id') ?? ''

  if (!workspaceId) {
    return NextResponse.json({ settings: { ...DEFAULT_RISK_SETTINGS }, stored: false })
  }

  const settings = await loadRiskSettings(supa, workspaceId, projectId)
  const rows = await safeTableRows<any>(
    (supa as any).from('risk_settings').select('id,project_id').eq('workspace_id', workspaceId),
  )

  return NextResponse.json({
    settings,
    stored: rows.some(r => (projectId ? r.project_id === projectId : !r.project_id)),
  })
}

export async function PUT(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const workspaceId = typeof body.workspace_id === 'string' ? body.workspace_id : null
  const projectId = typeof body.project_id === 'string' && body.project_id ? body.project_id : null
  if (!workspaceId) return NextResponse.json({ error: 'workspace_id required' }, { status: 400 })

  const patch: Record<string, unknown> = {
    workspace_id: workspaceId,
    project_id: projectId,
    updated_by: user.id,
  }
  for (const field of BOOLEAN_FIELDS) {
    if (typeof body[field] === 'boolean') patch[field] = body[field]
  }
  if (SENSITIVITIES.has(body.sensitivity)) patch.sensitivity = body.sensitivity
  if (AUTONOMIES.has(body.autonomy)) patch.autonomy = body.autonomy
  if (body.action_permissions && typeof body.action_permissions === 'object') {
    patch.action_permissions = body.action_permissions
  }

  // Kein upsert: die Eindeutigkeit hängt an partiellen Indizes
  // (ein Workspace-Default, ein Override je Projekt), und die taugen nicht als
  // ON-CONFLICT-Ziel. Also erst nachsehen, dann schreiben.
  const existing = await safeTableRows<any>(
    (supa as any).from('risk_settings').select('id,project_id').eq('workspace_id', workspaceId),
  )
  const current = existing.find(r => (projectId ? r.project_id === projectId : !r.project_id))

  const write = current
    ? (supa as any).from('risk_settings').update(patch).eq('id', current.id)
    : (supa as any).from('risk_settings').insert(patch)

  const { data, error } = await write.select('*').maybeSingle()

  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({ error: 'risk_settings missing', hint: 'supabase db push' }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: { ...DEFAULT_RISK_SETTINGS, ...data }, stored: true })
}
