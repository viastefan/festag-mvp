import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { provisionDevAccess } from '@/lib/dev-provision'

export const runtime = 'nodejs'

/**
 * POST /api/dev/provision-access
 *
 * One-off bootstrap for PIN dev login. Protected by CRON_SECRET.
 *
 * Body: { username: string; pin?: string; email?: string; fullName?: string; role?: 'dev'|'admin'|'project_owner' }
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!secret || auth !== secret) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
  }

  const service = getServiceClient()
  if (!service) {
    return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const username = String(body?.username || '').trim()
  if (!username) {
    return NextResponse.json({ ok: false, error: 'missing_username' }, { status: 400 })
  }

  try {
    const result = await provisionDevAccess(service, {
      username,
      pin: body?.pin ? String(body.pin).trim() : undefined,
      email: body?.email ? String(body.email).trim() : null,
      fullName: body?.fullName ? String(body.fullName).trim() : null,
      role: body?.role === 'dev' || body?.role === 'project_owner' ? body.role : 'admin',
    })
    return NextResponse.json({ ok: true, ...result, loginUrl: '/dev/login' })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'provision_failed' }, { status: 500 })
  }
}
