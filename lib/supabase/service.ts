import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { getServiceRoleKey, getSupabaseUrl } from '@/lib/supabase/env'

/**
 * Service-role Supabase client.
 *
 * Bypasses RLS. Use it ONLY for trusted server-side fan-out work where we
 * decide what gets written (audit logs, notifications, Tagro mirrors).
 * Never thread untrusted user input through this client without
 * application-level checks.
 *
 * Returns `null` when `SUPABASE_SERVICE_ROLE_KEY` is missing or invalid —
 * callers decide whether to skip silently or fall back to the user-session client.
 *
 * Reuses one client per warm isolate (avoids re-parsing URL/key + TCP churn
 * on every auth hot-path hit).
 */
let cachedService: SupabaseClient | null | undefined

export function getServiceClient(): SupabaseClient | null {
  if (cachedService !== undefined) return cachedService
  const key = getServiceRoleKey()
  if (!key) {
    cachedService = null
    return null
  }
  cachedService = createServiceClient(getSupabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cachedService
}

/**
 * Convenience: returns the service client when available, otherwise the
 * fallback (typically the cookie-bound user client). Useful for code paths
 * where you'd rather degrade than throw.
 */
export function serviceOr<T>(fallback: T): T {
  const s = getServiceClient()
  return (s ?? fallback) as T
}
