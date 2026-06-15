import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { createExternalAsset } from '@/lib/dev-console'

export const runtime = 'nodejs'

/**
 * GET  /api/dev/console/asset?projectId=  — list a project's assets (the picker).
 * POST /api/dev/console/asset             — register an external link asset
 *                                           (Figma/Loom/Drive/PR). File uploads
 *                                           go straight to storage client-side
 *                                           and are staged by id.
 */
export async function GET(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const projectId = new URL(req.url).searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const { data, error } = await (supa as any).from('project_assets')
    .select('id, title, kind, external_url, preview_url, visibility, created_at')
    .eq('project_id', projectId).order('created_at', { ascending: false }).limit(60)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assets: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as { projectId?: string; url?: string; title?: string }
  if (!b.projectId || !b.url?.trim()) return NextResponse.json({ error: 'projectId and url required' }, { status: 400 })

  const sb = (getServiceClient() ?? supa) as any
  const asset = await createExternalAsset(sb, { projectId: b.projectId, developerId: user.id, url: b.url.trim(), title: b.title })
  if (!asset) return NextResponse.json({ error: 'asset_create_failed' }, { status: 500 })

  const { data } = await sb.from('project_assets').select('id, title, kind, external_url').eq('id', asset.id).maybeSingle()
  return NextResponse.json({ asset: data ?? { id: asset.id } })
}
