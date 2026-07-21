import type { SupabaseClient } from '@supabase/supabase-js'
import { extractSsoDomain } from '@/lib/auth-sso'

export type SsoLoginOutcome = 'started' | 'success' | 'failed' | 'domain_unknown'

export async function logSsoLoginAttempt(
  sb: SupabaseClient,
  row: {
    domain?: string | null
    emailHint?: string | null
    userId?: string | null
    providerId?: string | null
    outcome: SsoLoginOutcome
    errorMessage?: string | null
    ipAddress?: string | null
    userAgent?: string | null
  },
): Promise<void> {
  const domain = row.domain ? extractSsoDomain(row.domain) : null
  await sb.from('sso_login_attempts').insert({
    domain,
    email_hint: row.emailHint ? String(row.emailHint).slice(0, 120) : null,
    user_id: row.userId ?? null,
    provider_id: row.providerId ?? null,
    outcome: row.outcome,
    error_message: row.errorMessage ? String(row.errorMessage).slice(0, 500) : null,
    ip_address: row.ipAddress ? String(row.ipAddress).slice(0, 64) : null,
    user_agent: row.userAgent ? String(row.userAgent).slice(0, 300) : null,
  })
}
