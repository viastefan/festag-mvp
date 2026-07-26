import { NextRequest, NextResponse } from 'next/server'
import { extractSsoDomain } from '@/lib/auth-sso'
import { getServiceClient } from '@/lib/supabase/service'
import { listSsoProviders } from '@/lib/sso/providers'
import { requireFestagAdmin } from '@/lib/sso/admin-auth'
import {
  assertSameOriginOrNoOrigin,
} from '@/lib/auth-request'

export const runtime = 'nodejs'

/** GET /api/admin/sso/providers — list SSO domain registry (admin only) */
export async function GET() {
  const admin = await requireFestagAdmin()
  if (!admin.ok) {
    return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.status })
  }

  const svc = getServiceClient()
  if (!svc) {
    return NextResponse.json({ ok: false, reason: 'service_unavailable' }, { status: 503 })
  }

  const providers = await listSsoProviders(svc)
  return NextResponse.json({ ok: true, providers })
}

/** POST /api/admin/sso/providers — register or update SSO domain (admin only) */
export async function POST(req: NextRequest) {
  const csrf = assertSameOriginOrNoOrigin(req)
  if (csrf) return csrf

  const admin = await requireFestagAdmin()
  if (!admin.ok) {
    return NextResponse.json({ ok: false, reason: admin.reason }, { status: admin.status })
  }

  const body = await req.json().catch(() => ({}))
  const domain = extractSsoDomain(body?.domain || '')
  if (!domain) {
    return NextResponse.json({ ok: false, reason: 'invalid_domain' }, { status: 400 })
  }

  const svc = getServiceClient()
  if (!svc) {
    return NextResponse.json({ ok: false, reason: 'service_unavailable' }, { status: 503 })
  }

  const status = body?.status === 'disabled' || body?.status === 'pending' || body?.status === 'active'
    ? body.status
    : 'pending'

  const row = {
    domain,
    supabase_provider_id: typeof body?.supabaseProviderId === 'string'
      ? body.supabaseProviderId.trim().slice(0, 120) || null
      : null,
    workspace_id: typeof body?.workspaceId === 'string' ? body.workspaceId : null,
    display_name: typeof body?.displayName === 'string'
      ? body.displayName.trim().slice(0, 120)
      : domain,
    default_member_role: typeof body?.defaultMemberRole === 'string'
      ? body.defaultMemberRole
      : 'member',
    status,
    enforce_sso: body?.enforceSso === true,
    notes: typeof body?.notes === 'string' ? body.notes.trim().slice(0, 500) : null,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await svc
    .from('organization_sso_providers')
    .select('id')
    .eq('domain_norm', domain)
    .maybeSingle()

  const selectCols =
    'id,domain,supabase_provider_id,workspace_id,display_name,default_member_role,status,enforce_sso,notes'

  const write = existing?.id
    ? svc
        .from('organization_sso_providers')
        .update(row)
        .eq('id', existing.id)
        .select(selectCols)
        .single()
    : svc
        .from('organization_sso_providers')
        .insert(row)
        .select(selectCols)
        .single()

  const { data, error } = await write

  if (error) {
    return NextResponse.json({ ok: false, reason: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, provider: data })
}
