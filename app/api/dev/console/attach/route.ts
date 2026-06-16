import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { attachAssetToMessage, createExternalAsset, listMessageAssets } from '@/lib/dev-console'

export const runtime = 'nodejs'

/**
 * POST /api/dev/console/attach
 *
 * Attach an asset to a console message before dispatch. Either an existing
 * project asset (assetId) or a new external link (url) — file uploads land in
 * project_assets first (client-side / /api/assets) and pass assetId here.
 *
 * Body: { messageItemId, projectId, assetId?, url?, title?, sendToClient? }
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as {
    messageItemId?: string; projectId?: string; assetId?: string
    url?: string; title?: string; sendToClient?: boolean
  }
  if (!b.messageItemId || !b.projectId) {
    return NextResponse.json({ error: 'messageItemId and projectId required' }, { status: 400 })
  }

  const sb = (getServiceClient() ?? supa) as any

  let assetId = b.assetId ?? null
  if (!assetId && b.url) {
    const asset = await createExternalAsset(sb, { projectId: b.projectId, developerId: user.id, url: b.url, title: b.title })
    assetId = asset?.id ?? null
  }
  if (!assetId) return NextResponse.json({ error: 'assetId or url required' }, { status: 400 })

  await attachAssetToMessage(sb, { inboxItemId: b.messageItemId, assetId, sendToClient: b.sendToClient ?? true })
  const assets = await listMessageAssets(sb, b.messageItemId)
  return NextResponse.json({ assets })
}
