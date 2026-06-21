import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDevUserFromRequest } from '@/lib/dev-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { emitDevActionToClient } from '@/lib/client/connection-bridge'

export const runtime = 'nodejs'

/**
 * POST /api/dev/deliverables/publish
 * Push an analyzed deliverable to the client timeline via Tagro bridge.
 */
export async function POST(req: Request) {
  const supa = createClient()
  const { data: { user: cookieUser } } = await supa.auth.getUser()
  const user = cookieUser ?? getDevUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const assetId = String(body?.assetId || '')
  if (!assetId) return NextResponse.json({ error: 'asset_id_required' }, { status: 400 })

  const { data: asset } = await supa
    .from('project_assets')
    .select('id,title,kind,status,visibility,project_id,analysis_result,storage_path,external_url,mime_type,primary_task_id')
    .eq('id', assetId)
    .maybeSingle()

  if (!asset) return NextResponse.json({ error: 'asset_not_found' }, { status: 404 })

  const a = asset as any
  const analysis = (a.analysis_result || {}) as { summary?: string; requires_client_approval?: boolean }
  const summary = analysis.summary?.trim() || a.title || 'Neue Lieferung'
  const writer = getServiceClient() ?? supa

  await supa.from('project_assets')
    .update({ visibility: 'client_visible', status: a.status === 'approved' ? a.status : 'analyzed' })
    .eq('id', assetId)

  const { clientNotified, signalId } = await emitDevActionToClient(writer as any, {
    projectId: a.project_id,
    type: 'file_uploaded',
    content: [`Deliverable: ${a.title}`, summary].filter(Boolean).join('\n'),
    source: 'dev_deliverable_publish',
    visibility: 'client',
    createdBy: user.id,
    relatedTaskId: a.primary_task_id ?? null,
    clientTranslation: summary,
    inboxTitle: `${a.title} · Lieferung`,
    notifyClient: true,
  })

  return NextResponse.json({ ok: true, signalId, clientNotified })
}
