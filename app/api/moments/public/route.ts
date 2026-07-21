import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { loadClientMomentByToken } from '@/lib/moments/store'

export const runtime = 'nodejs'

/**
 * GET /api/moments/public?token=…
 * Public read of an immutable Client Moment snapshot (service role).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim() || ''
  if (!token) return NextResponse.json({ error: 'token_required' }, { status: 400 })

  const service = getServiceClient()
  if (!service) {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 })
  }

  const moment = await loadClientMomentByToken(service as any, token)
  if (!moment) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({ moment }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
