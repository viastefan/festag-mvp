import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listPendingApprovals } from '@/lib/client/pending-approvals'

export const runtime = 'nodejs'

/** GET /api/client/approvals — pending captures + client decisions */
export async function GET() {
  const supa = createClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const { items, count } = await listPendingApprovals(supa as any, user.id)
    return NextResponse.json({ items, count })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'approvals_failed' }, { status: 500 })
  }
}
