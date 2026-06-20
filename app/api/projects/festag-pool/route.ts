import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { publishFestagPool } from '@/lib/projects/delivery-bridge'

export const runtime = 'nodejs'

/** @deprecated Prefer POST /api/projects/publish { delivery: 'festag_delivery' } */
export async function POST(req: NextRequest) {
  try {
    const supa = createClient()
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const service = getServiceClient()
    if (!service) return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })

    const body = await req.json().catch(() => ({}))
    const projectId: string | undefined = body?.projectId
    if (!projectId) return NextResponse.json({ error: 'missing_projectId' }, { status: 400 })

    const result = await publishFestagPool(service as any, {
      projectId,
      actorId: user.id,
      budget: body?.budget,
      desiredStartDate: body?.desiredStartDate ?? null,
    })

    return NextResponse.json(result)
  } catch (e: any) {
    const msg = e?.message || 'festag_pool_failed'
    const status = msg === 'forbidden' ? 403
      : msg === 'project_not_found' ? 404
      : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
