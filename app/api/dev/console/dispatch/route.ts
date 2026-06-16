import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { dispatchRelayItem, type RelayItem, type RelayPlan } from '@/lib/dev-console'

export const runtime = 'nodejs'

/**
 * POST /api/dev/console/dispatch
 *
 * Sends the selected relay items of a console message to the client. Reads the
 * stored plan from the message's metadata. Default selection = every item that
 * isn't an internal_note. Idempotent (dispatch.ts guards re-sends).
 *
 * Body: { messageItemId, selectedIndexes?: number[] }
 */
export async function POST(req: NextRequest) {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const b = (await req.json().catch(() => ({}))) as { messageItemId?: string; selectedIndexes?: number[] }
  if (!b.messageItemId) return NextResponse.json({ error: 'messageItemId required' }, { status: 400 })

  const sb = (getServiceClient() ?? supa) as any

  const { data: msg } = await sb.from('inbox_items')
    .select('id, project_id, metadata, user_id').eq('id', b.messageItemId).maybeSingle()
  if (!msg) return NextResponse.json({ error: 'message not found' }, { status: 404 })

  const plan = (msg.metadata?.relay_plan as RelayPlan | undefined)
  if (!plan?.items?.length) return NextResponse.json({ error: 'no relay plan on message' }, { status: 400 })

  const selected = Array.isArray(b.selectedIndexes) && b.selectedIndexes.length > 0
    ? b.selectedIndexes
    : plan.items.map((_, i) => i).filter((i) => plan.items[i].relay_kind !== 'internal_note')

  const results = []
  for (const idx of selected) {
    const item = plan.items[idx] as RelayItem | undefined
    if (!item) continue
    results.push(await dispatchRelayItem(sb, {
      messageItemId: b.messageItemId, item, projectId: msg.project_id, developerId: msg.user_id || user.id,
    }))
  }

  return NextResponse.json({ dispatched: results })
}
