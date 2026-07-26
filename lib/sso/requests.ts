import type { SupabaseClient } from '@supabase/supabase-js'
import { extractSsoDomain } from '@/lib/auth-sso'

export type SsoSetupRequestStatus = 'open' | 'in_progress' | 'done' | 'declined'

export type SsoSetupRequestRow = {
  id: string
  domain: string
  workspace_id: string | null
  workspace_name: string | null
  requested_by: string | null
  contact_email: string | null
  idp_hint: string | null
  notes: string | null
  status: SsoSetupRequestStatus
  created_at: string
}

export async function createSsoSetupRequest(
  sb: SupabaseClient,
  input: {
    domain: string
    workspaceId?: string | null
    workspaceName?: string | null
    requestedBy?: string | null
    contactEmail?: string | null
    idpHint?: string | null
    notes?: string | null
  },
): Promise<{ ok: true; request: SsoSetupRequestRow } | { ok: false; reason: string }> {
  const domain = extractSsoDomain(input.domain)
  if (!domain) return { ok: false, reason: 'invalid_domain' }

  const { data: existingOpen } = await sb
    .from('sso_setup_requests')
    .select('id,domain,workspace_id,workspace_name,requested_by,contact_email,idp_hint,notes,status,created_at')
    .eq('domain_norm', domain)
    .in('status', ['open', 'in_progress'])
    .maybeSingle()

  if (existingOpen) {
    return { ok: true, request: existingOpen as SsoSetupRequestRow }
  }

  const { data, error } = await sb
    .from('sso_setup_requests')
    .insert({
      domain,
      workspace_id: input.workspaceId ?? null,
      workspace_name: input.workspaceName ? String(input.workspaceName).slice(0, 120) : null,
      requested_by: input.requestedBy ?? null,
      contact_email: input.contactEmail ? String(input.contactEmail).slice(0, 254) : null,
      idp_hint: input.idpHint ? String(input.idpHint).slice(0, 120) : null,
      notes: input.notes ? String(input.notes).slice(0, 800) : null,
      status: 'open',
      updated_at: new Date().toISOString(),
    })
    .select('id,domain,workspace_id,workspace_name,requested_by,contact_email,idp_hint,notes,status,created_at')
    .single()

  if (error || !data) {
    return { ok: false, reason: error?.message || 'insert_failed' }
  }

  return { ok: true, request: data as SsoSetupRequestRow }
}

export async function listSsoSetupRequests(
  sb: SupabaseClient,
  opts?: { status?: SsoSetupRequestStatus | 'all' },
): Promise<SsoSetupRequestRow[]> {
  let q = sb
    .from('sso_setup_requests')
    .select('id,domain,workspace_id,workspace_name,requested_by,contact_email,idp_hint,notes,status,created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (opts?.status && opts.status !== 'all') {
    q = q.eq('status', opts.status)
  }

  const { data } = await q
  return (data ?? []) as SsoSetupRequestRow[]
}

export async function updateSsoSetupRequestStatus(
  sb: SupabaseClient,
  id: string,
  status: SsoSetupRequestStatus,
  resolvedBy?: string | null,
): Promise<boolean> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (status === 'done' || status === 'declined') {
    patch.resolved_at = new Date().toISOString()
    patch.resolved_by = resolvedBy ?? null
  }
  const { error } = await sb.from('sso_setup_requests').update(patch).eq('id', id)
  return !error
}
