import type { SupabaseClient } from '@supabase/supabase-js'
import { extractSsoDomain } from '@/lib/auth-sso'

export type SsoProviderStatus = 'pending' | 'active' | 'disabled'

export type SsoProviderRow = {
  id: string
  domain: string
  supabase_provider_id: string | null
  workspace_id: string | null
  display_name: string
  default_member_role: string
  status: SsoProviderStatus
  enforce_sso?: boolean
  notes?: string | null
}

const PROVIDER_SELECT =
  'id,domain,supabase_provider_id,workspace_id,display_name,default_member_role,status,enforce_sso,notes'

export async function findActiveSsoProvider(
  sb: SupabaseClient,
  domainInput: string,
): Promise<SsoProviderRow | null> {
  const domain = extractSsoDomain(domainInput)
  if (!domain) return null

  const { data, error } = await sb
    .from('organization_sso_providers')
    .select(PROVIDER_SELECT)
    .eq('domain_norm', domain)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) return null
  return data as SsoProviderRow
}

export async function listSsoProviders(sb: SupabaseClient): Promise<SsoProviderRow[]> {
  const { data } = await sb
    .from('organization_sso_providers')
    .select(PROVIDER_SELECT)
    .order('domain_norm', { ascending: true })
  return (data ?? []) as SsoProviderRow[]
}

export function emailDomain(email: string | null | undefined): string | null {
  const raw = String(email || '').trim().toLowerCase()
  if (!raw.includes('@')) return null
  return extractSsoDomain(raw)
}

export async function provisionSsoWorkspaceMember(params: {
  sb: SupabaseClient
  userId: string
  provider: SsoProviderRow
}): Promise<{ joined: boolean; workspaceId?: string }> {
  if (!params.provider.workspace_id) return { joined: false }

  const role = params.provider.default_member_role || 'member'
  const { error } = await params.sb.from('workspace_members').upsert(
    {
      workspace_id: params.provider.workspace_id,
      user_id: params.userId,
      role,
      joined_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id,user_id' },
  )

  if (error) return { joined: false }
  return { joined: true, workspaceId: params.provider.workspace_id }
}

export function ssoProfilePatch(user: {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}): Record<string, unknown> {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (typeof meta.custom_claims === 'object' &&
      meta.custom_claims &&
      typeof (meta.custom_claims as Record<string, unknown>).name === 'string' &&
      String((meta.custom_claims as Record<string, unknown>).name).trim()) ||
    null

  return {
    id: user.id,
    email: user.email ?? null,
    provider: 'sso',
    ...(fullName ? { full_name: fullName } : {}),
    updated_at: new Date().toISOString(),
  }
}
