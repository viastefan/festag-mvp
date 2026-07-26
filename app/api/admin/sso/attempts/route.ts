import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { requireFestagAdmin } from '@/lib/sso/admin-auth'

export const runtime = 'nodejs'

/** GET /api/admin/sso/attempts — recent SSO audit rows */
export async function GET(req: NextRequest) {
  const admin = await requireFestagAdmin()
  if (!admin.ok) {
    return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.status })
  }

  const svc = getServiceClient()
  if (!svc) {
    return NextResponse.json({ ok: false, reason: 'service_unavailable' }, { status: 503 })
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 40), 100)
  const { data } = await svc
    .from('sso_login_attempts')
    .select('id,domain,email_hint,outcome,error_message,created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  return NextResponse.json({ ok: true, attempts: data ?? [] })
}
