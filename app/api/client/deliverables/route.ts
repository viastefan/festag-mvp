import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listClientDeliverables } from '@/lib/client/deliverables'

export const runtime = 'nodejs'

/** GET /api/client/deliverables — client-visible project assets / deliverables */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const items = await listClientDeliverables(supa as any, user.id)
    const pending = items.filter(i => i.approval_status === 'awaiting_review')
    return NextResponse.json({ items, count: items.length, pending_count: pending.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'deliverables_failed' }, { status: 500 })
  }
}
