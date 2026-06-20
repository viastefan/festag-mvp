import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { publishAssignExistingDev } from '@/lib/projects/delivery-bridge'

export const runtime = 'nodejs'

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

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const result = await publishAssignExistingDev(service as any, {
      projectId,
      actorId: user.id,
      devHandle: body?.devHandle?.toString().trim(),
      devEmail: body?.devEmail?.toString().trim().toLowerCase(),
      budgetNote: body?.budgetNote?.toString().trim() || null,
      appBaseUrl,
    })

    return NextResponse.json(result)
  } catch (e: any) {
    const msg = e?.message || 'assign_existing_failed'
    const status = msg === 'forbidden' ? 403
      : msg === 'project_not_found' || msg === 'dev_not_found' ? 404
      : msg === 'missing_dev_identifier' ? 400
      : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
