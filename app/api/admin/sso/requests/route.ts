import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { requireFestagAdmin } from '@/lib/sso/admin-auth'
import {
  listSsoSetupRequests,
  updateSsoSetupRequestStatus,
  type SsoSetupRequestStatus,
} from '@/lib/sso/requests'
import { assertSameOriginOrNoOrigin } from '@/lib/auth-request'

export const runtime = 'nodejs'

/** GET /api/admin/sso/requests */
export async function GET(req: NextRequest) {
  const admin = await requireFestagAdmin()
  if (!admin.ok) {
    return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.status })
  }

  const svc = getServiceClient()
  if (!svc) {
    return NextResponse.json({ ok: false, reason: 'service_unavailable' }, { status: 503 })
  }

  const status = (req.nextUrl.searchParams.get('status') || 'open') as SsoSetupRequestStatus | 'all'
  const requests = await listSsoSetupRequests(svc, {
    status: status === 'all' || status === 'open' || status === 'in_progress' || status === 'done' || status === 'declined'
      ? status
      : 'open',
  })

  return NextResponse.json({ ok: true, requests })
}

/** PATCH /api/admin/sso/requests — update status */
export async function PATCH(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const admin = await requireFestagAdmin()
  if (!admin.ok) {
    return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.status })
  }

  const body = await req.json().catch(() => ({}))
  const id = typeof body?.id === 'string' ? body.id : ''
  const status = body?.status as SsoSetupRequestStatus
  if (!id || !['open', 'in_progress', 'done', 'declined'].includes(status)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload' }, { status: 400 })
  }

  const svc = getServiceClient()
  if (!svc) {
    return NextResponse.json({ ok: false, reason: 'service_unavailable' }, { status: 503 })
  }

  const ok = await updateSsoSetupRequestStatus(svc, id, status, admin.userId)
  if (!ok) {
    return NextResponse.json({ ok: false, reason: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
